import { GoogleGenAI, Content, GenerateContentConfig, EmbedContentConfig, Chat } from "@google/genai";

// Configuration constants
const MAX_REQUESTS_PER_MINUTE = 10;
const MODELS_CACHE_TTL = 300000; // 5 minutes
const SESSION_TTL = 3600000; // 1 hour
const MAX_SESSIONS = 100;
const CLEANUP_INTERVAL = 600000; // 10 minutes
const DEFAULT_RETRY_DELAY = 60000; // 1 minute

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

interface ChatSession {
  chat: Chat;
  model: string;
  createdAt: number;
  lastAccessedAt: number;
}

interface ModelsCache {
  models: Array<{ name: string; displayName?: string; description?: string }>;
  cachedAt: number;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private requestTimestamps: number[] = [];
  private chatSessions = new Map<string, ChatSession>();
  private modelsCache: ModelsCache | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    // Periodic cleanup to prevent memory leaks from abandoned sessions
    this.cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), CLEANUP_INTERVAL);
  }

  /** Clean up resources - call before shutting down */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.chatSessions.clear();
    this.modelsCache = null;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove requests older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    if (this.requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      const waitTime = this.requestTimestamps[0] + 60000 - now;
      if (waitTime > 0) {
        console.error(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await sleep(waitTime);
      }
    }

    this.requestTimestamps.push(now);
  }

  // Clean up expired chat sessions
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.chatSessions) {
      if (now - session.lastAccessedAt > SESSION_TTL) {
        this.chatSessions.delete(id);
        console.error(`Expired chat session '${id}' cleaned up`);
      }
    }
  }

  async generateContent(
    model: string,
    contents: string | Content[],
    config?: GenerateContentConfig
  ): Promise<{ text: string; usageMetadata?: unknown }> {
    await this.checkRateLimit();

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents,
        config,
      });

      return {
        text: response.text ?? "",
        usageMetadata: response.usageMetadata,
      };
    } catch (error) {
      if (this.isRateLimitError(error)) {
        const retryDelay = this.parseRetryDelay(error);
        console.error(`Rate limit error from API, waiting ${retryDelay / 1000}s...`);
        await sleep(retryDelay);
        return this.generateContent(model, contents, config);
      }
      throw error;
    }
  }

  async embedContent(
    model: string,
    contents: string | string[],
    config?: EmbedContentConfig
  ): Promise<{ embeddings: number[][] }> {
    await this.checkRateLimit();

    const textsArray = Array.isArray(contents) ? contents : [contents];
    const response = await this.ai.models.embedContent({
      model,
      contents: textsArray,
      config,
    });

    return {
      embeddings: response.embeddings?.map((e) => e.values ?? []) ?? [],
    };
  }

  async countTokens(
    model: string,
    contents: string | Content[]
  ): Promise<{ totalTokens: number }> {
    await this.checkRateLimit();

    const response = await this.ai.models.countTokens({
      model,
      contents,
    });

    return {
      totalTokens: response.totalTokens ?? 0,
    };
  }

  async listModels(): Promise<Array<{ name: string; displayName?: string; description?: string }>> {
    // Return cached models if still valid
    const now = Date.now();
    if (this.modelsCache && now - this.modelsCache.cachedAt < MODELS_CACHE_TTL) {
      return this.modelsCache.models;
    }

    await this.checkRateLimit();

    const response = await this.ai.models.list();
    const models: Array<{ name: string; displayName?: string; description?: string }> = [];

    // The list method returns an async iterator
    for await (const model of response) {
      models.push({
        name: model.name ?? "",
        displayName: model.displayName,
        description: model.description,
      });
    }

    // Cache the results
    this.modelsCache = { models, cachedAt: now };

    return models;
  }

  createChatSession(
    sessionId: string,
    model: string,
    systemInstruction?: string
  ): void {
    this.cleanupExpiredSessions();

    // Prevent unbounded session growth
    if (this.chatSessions.size >= MAX_SESSIONS) {
      throw new Error(`Maximum sessions (${MAX_SESSIONS}) reached. Delete existing sessions first.`);
    }

    const chat = this.ai.chats.create({
      model,
      ...(systemInstruction && { config: { systemInstruction } }),
    });
    const now = Date.now();
    this.chatSessions.set(sessionId, { chat, model, createdAt: now, lastAccessedAt: now });
  }

  async sendChatMessage(
    sessionId: string,
    message: string
  ): Promise<{ text: string; historyLength: number }> {
    await this.checkRateLimit();

    const session = this.chatSessions.get(sessionId);
    if (!session) {
      throw new Error(`Chat session '${sessionId}' not found`);
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();

    const response = await session.chat.sendMessage({ message });
    const history = session.chat.getHistory();

    return {
      text: response.text ?? "",
      historyLength: history?.length ?? 0,
    };
  }

  getChatHistory(sessionId: string): Content[] {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = Date.now();
    }
    return session?.chat.getHistory() ?? [];
  }

  deleteChatSession(sessionId: string): boolean {
    return this.chatSessions.delete(sessionId);
  }

  listChatSessions(): string[] {
    return Array.from(this.chatSessions.keys());
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED") ||
        error.message.includes("rate limit")
      );
    }
    return false;
  }

  private parseRetryDelay(error: unknown): number {
    const match = String(error).match(/"retryDelay":\s*"(\d+)s"/);
    return match ? parseInt(match[1], 10) * 1000 : DEFAULT_RETRY_DELAY;
  }
}
