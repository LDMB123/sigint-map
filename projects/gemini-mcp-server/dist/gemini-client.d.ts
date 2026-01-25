import { Content, GenerateContentConfig, EmbedContentConfig } from "@google/genai";
export declare class GeminiClient {
    private ai;
    private requestTimestamps;
    private chatSessions;
    private modelsCache;
    private cleanupTimer;
    constructor(apiKey: string);
    /** Clean up resources - call before shutting down */
    destroy(): void;
    private checkRateLimit;
    private cleanupExpiredSessions;
    generateContent(model: string, contents: string | Content[], config?: GenerateContentConfig): Promise<{
        text: string;
        usageMetadata?: unknown;
    }>;
    embedContent(model: string, contents: string | string[], config?: EmbedContentConfig): Promise<{
        embeddings: number[][];
    }>;
    countTokens(model: string, contents: string | Content[]): Promise<{
        totalTokens: number;
    }>;
    listModels(): Promise<Array<{
        name: string;
        displayName?: string;
        description?: string;
    }>>;
    createChatSession(sessionId: string, model: string, systemInstruction?: string): void;
    sendChatMessage(sessionId: string, message: string): Promise<{
        text: string;
        historyLength: number;
    }>;
    getChatHistory(sessionId: string): Content[];
    deleteChatSession(sessionId: string): boolean;
    listChatSessions(): string[];
    private isRateLimitError;
    private parseRetryDelay;
}
