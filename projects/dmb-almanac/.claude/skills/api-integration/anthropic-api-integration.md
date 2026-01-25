---
description: Integration patterns for Anthropic Claude API including Messages API, tool use, streaming, token management, and cost optimization
tags: [anthropic, claude, ai, llm, streaming, tools, function-calling]
globs: ["**/anthropic/**/*.ts", "**/ai/claude*.ts"]
---

# Anthropic Claude API Integration

## Messages API - Basic Usage

```typescript
interface MessageRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<ContentBlock>;
  }>;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  system?: string;
  stop_sequences?: string[];
  metadata?: {
    user_id?: string;
  };
}

interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
  tool_use_id?: string;
  content?: string | Array<any>;
}

interface MessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

class AnthropicClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private defaultModel = 'claude-opus-4-5-20251101';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createMessage(request: Partial<MessageRequest>): Promise<MessageResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        max_tokens: request.max_tokens || 4096,
        ...request,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      system?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ response: string; usage: { input_tokens: number; output_tokens: number } }> {
    const result = await this.createMessage({
      messages,
      system: options?.system,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    });

    const textContent = result.content.find(block => block.type === 'text');

    return {
      response: textContent?.text || '',
      usage: result.usage,
    };
  }
}

// Basic usage
const client = new AnthropicClient(process.env.ANTHROPIC_API_KEY!);

const response = await client.chat(
  [
    { role: 'user', content: 'What is the capital of France?' },
    { role: 'assistant', content: 'The capital of France is Paris.' },
    { role: 'user', content: 'What is its population?' },
  ],
  {
    system: 'You are a helpful geography assistant. Provide accurate, concise answers.',
    temperature: 0.7,
  }
);

console.log(response.response);
console.log(`Tokens used: ${response.usage.input_tokens + response.usage.output_tokens}`);
```

## Tool Use / Function Calling

```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

class AnthropicToolClient extends AnthropicClient {
  async createMessageWithTools(
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    tools: Tool[],
    options?: {
      system?: string;
      maxTokens?: number;
    }
  ): Promise<MessageResponse> {
    return this.createMessage({
      messages,
      tools,
      system: options?.system,
      max_tokens: options?.maxTokens ?? 4096,
    });
  }

  async executeToolLoop(
    userMessage: string,
    tools: Tool[],
    toolImplementations: Record<string, (input: any) => Promise<any>>,
    options?: {
      system?: string;
      maxIterations?: number;
    }
  ): Promise<{ finalResponse: string; totalTokens: number; iterations: number }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: any }> = [
      { role: 'user', content: userMessage },
    ];

    let totalTokens = 0;
    let iterations = 0;
    const maxIterations = options?.maxIterations ?? 10;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.createMessageWithTools(messages, tools, {
        system: options?.system,
      });

      totalTokens += response.usage.input_tokens + response.usage.output_tokens;

      // Add assistant response to conversation
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        const textContent = response.content.find(block => block.type === 'text');
        return {
          finalResponse: textContent?.text || '',
          totalTokens,
          iterations,
        };
      }

      // Execute tool calls
      if (response.stop_reason === 'tool_use') {
        const toolResults: Array<any> = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const toolName = block.name!;
            const toolInput = block.input;
            const toolUseId = block.id!;

            try {
              const implementation = toolImplementations[toolName];
              if (!implementation) {
                throw new Error(`No implementation found for tool: ${toolName}`);
              }

              const result = await implementation(toolInput);

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUseId,
                content: JSON.stringify(result),
              });
            } catch (error: any) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUseId,
                content: JSON.stringify({ error: error.message }),
                is_error: true,
              });
            }
          }
        }

        // Add tool results to conversation
        messages.push({
          role: 'user',
          content: toolResults,
        });
      }
    }

    throw new Error(`Max iterations (${maxIterations}) reached`);
  }
}

// Example: Weather and calculator tools
const tools: Tool[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name, e.g., "San Francisco, CA"',
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'Temperature unit',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate, e.g., "2 + 2"',
        },
      },
      required: ['expression'],
    },
  },
];

const toolImplementations = {
  get_weather: async (input: { location: string; unit?: string }) => {
    // In real implementation, call weather API
    return {
      location: input.location,
      temperature: 72,
      unit: input.unit || 'fahrenheit',
      condition: 'sunny',
    };
  },
  calculate: async (input: { expression: string }) => {
    // Safe eval using a library or math parser
    const result = eval(input.expression); // In production, use a safe math parser!
    return { result };
  },
};

// Usage
const toolClient = new AnthropicToolClient(process.env.ANTHROPIC_API_KEY!);

const result = await toolClient.executeToolLoop(
  "What's the weather in San Francisco and what is 15 * 24?",
  tools,
  toolImplementations,
  {
    system: 'You are a helpful assistant with access to weather and calculation tools.',
  }
);

console.log(result.finalResponse);
console.log(`Total tokens: ${result.totalTokens}, Iterations: ${result.iterations}`);
```

## Streaming Responses

```typescript
interface StreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'error';
  message?: Partial<MessageResponse>;
  index?: number;
  delta?: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
  usage?: {
    output_tokens: number;
  };
  error?: {
    type: string;
    message: string;
  };
}

class AnthropicStreamingClient extends AnthropicClient {
  async *streamMessage(request: Partial<MessageRequest>): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        max_tokens: request.max_tokens || 4096,
        stream: true,
        ...request,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event: StreamEvent = JSON.parse(data);
          yield event;
        } catch (e) {
          console.error('Failed to parse SSE event:', data);
        }
      }
    }
  }

  async streamChat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      system?: string;
      temperature?: number;
      onChunk?: (text: string) => void;
    }
  ): Promise<{ fullResponse: string; usage: { input_tokens: number; output_tokens: number } }> {
    let fullResponse = '';
    let usage = { input_tokens: 0, output_tokens: 0 };

    for await (const event of this.streamMessage({
      messages,
      system: options?.system,
      temperature: options?.temperature,
    })) {
      if (event.type === 'message_start') {
        usage.input_tokens = event.message?.usage?.input_tokens || 0;
      } else if (event.type === 'content_block_delta') {
        const text = event.delta?.text || '';
        fullResponse += text;
        options?.onChunk?.(text);
      } else if (event.type === 'message_delta') {
        usage.output_tokens = event.usage?.output_tokens || 0;
      } else if (event.type === 'error') {
        throw new Error(`Stream error: ${event.error?.message}`);
      }
    }

    return { fullResponse, usage };
  }
}

// Usage: Streaming to console
const streamClient = new AnthropicStreamingClient(process.env.ANTHROPIC_API_KEY!);

const result = await streamClient.streamChat(
  [{ role: 'user', content: 'Write a short story about a robot learning to paint.' }],
  {
    system: 'You are a creative storyteller.',
    temperature: 0.9,
    onChunk: (text) => process.stdout.write(text),
  }
);

console.log(`\n\nTotal tokens: ${result.usage.input_tokens + result.usage.output_tokens}`);

// Usage: Streaming to web client (Server-Sent Events)
app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const client = new AnthropicStreamingClient(process.env.ANTHROPIC_API_KEY!);

  try {
    for await (const event of client.streamMessage({ messages })) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});
```

## Token Management

```typescript
interface TokenUsageTracker {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

class TokenManager {
  private usage: TokenUsageTracker = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    requestCount: 0,
  };

  // Pricing per 1M tokens (as of Jan 2025)
  private pricing = {
    'claude-opus-4-5-20251101': {
      input: 15.00,
      output: 75.00,
    },
    'claude-sonnet-4-5-20250929': {
      input: 3.00,
      output: 15.00,
    },
    'claude-3-5-haiku-20241022': {
      input: 0.80,
      output: 4.00,
    },
  };

  trackUsage(model: string, inputTokens: number, outputTokens: number) {
    this.usage.totalInputTokens += inputTokens;
    this.usage.totalOutputTokens += outputTokens;
    this.usage.requestCount++;

    const modelPricing = this.pricing[model as keyof typeof this.pricing];
    if (modelPricing) {
      const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
      const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
      this.usage.totalCost += inputCost + outputCost;
    }
  }

  getUsage(): TokenUsageTracker {
    return { ...this.usage };
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelPricing = this.pricing[model as keyof typeof this.pricing];
    if (!modelPricing) return 0;

    return (
      (inputTokens / 1_000_000) * modelPricing.input +
      (outputTokens / 1_000_000) * modelPricing.output
    );
  }

  reset() {
    this.usage = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      requestCount: 0,
    };
  }
}

class ManagedAnthropicClient extends AnthropicClient {
  private tokenManager = new TokenManager();

  async createMessage(request: Partial<MessageRequest>): Promise<MessageResponse> {
    const response = await super.createMessage(request);

    this.tokenManager.trackUsage(
      request.model || this.defaultModel,
      response.usage.input_tokens,
      response.usage.output_tokens
    );

    return response;
  }

  getTokenUsage(): TokenUsageTracker {
    return this.tokenManager.getUsage();
  }

  estimateRequestCost(request: Partial<MessageRequest>, estimatedOutputTokens: number): number {
    const model = request.model || this.defaultModel;
    const estimatedInputTokens = this.estimateInputTokens(request);

    return this.tokenManager.estimateCost(model, estimatedInputTokens, estimatedOutputTokens);
  }

  private estimateInputTokens(request: Partial<MessageRequest>): number {
    // Rough estimation: ~4 characters per token
    let totalChars = 0;

    if (request.system) {
      totalChars += request.system.length;
    }

    if (request.messages) {
      for (const message of request.messages) {
        if (typeof message.content === 'string') {
          totalChars += message.content.length;
        }
      }
    }

    return Math.ceil(totalChars / 4);
  }
}

// Usage
const managedClient = new ManagedAnthropicClient(process.env.ANTHROPIC_API_KEY!);

// Make several requests
await managedClient.chat([{ role: 'user', content: 'Hello!' }]);
await managedClient.chat([{ role: 'user', content: 'Tell me a joke.' }]);

// Check usage
const usage = managedClient.getTokenUsage();
console.log(`Total requests: ${usage.requestCount}`);
console.log(`Total tokens: ${usage.totalInputTokens + usage.totalOutputTokens}`);
console.log(`Total cost: $${usage.totalCost.toFixed(4)}`);
```

## Context Window Optimization

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  timestamp?: number;
}

class ContextWindowManager {
  private maxContextTokens: number;

  constructor(maxContextTokens: number = 180000) {
    this.maxContextTokens = maxContextTokens;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  optimizeMessages(
    messages: ConversationMessage[],
    systemPrompt?: string
  ): ConversationMessage[] {
    // Add token estimates
    const messagesWithTokens = messages.map(msg => ({
      ...msg,
      tokens: msg.tokens || this.estimateTokens(msg.content),
    }));

    const systemTokens = systemPrompt ? this.estimateTokens(systemPrompt) : 0;
    let totalTokens = systemTokens;

    // Always keep the most recent message
    const optimized: ConversationMessage[] = [];
    const lastMessage = messagesWithTokens[messagesWithTokens.length - 1];
    optimized.push(lastMessage);
    totalTokens += lastMessage.tokens!;

    // Add messages from most recent to oldest until we hit limit
    for (let i = messagesWithTokens.length - 2; i >= 0; i--) {
      const msg = messagesWithTokens[i];
      if (totalTokens + msg.tokens! > this.maxContextTokens) {
        break;
      }
      optimized.unshift(msg);
      totalTokens += msg.tokens!;
    }

    return optimized;
  }

  summarizeOldMessages(
    messages: ConversationMessage[],
    client: AnthropicClient
  ): Promise<string> {
    const oldMessages = messages
      .slice(0, -5) // Keep last 5 messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    return client
      .chat(
        [
          {
            role: 'user',
            content: `Summarize this conversation history concisely:\n\n${oldMessages}`,
          },
        ],
        {
          maxTokens: 1000,
          temperature: 0.3,
        }
      )
      .then(result => result.response);
  }

  async optimizeWithSummary(
    messages: ConversationMessage[],
    client: AnthropicClient,
    systemPrompt?: string
  ): Promise<{ messages: ConversationMessage[]; summary?: string }> {
    const optimized = this.optimizeMessages(messages, systemPrompt);

    // If we had to drop messages, create a summary
    if (optimized.length < messages.length) {
      const droppedMessages = messages.slice(0, messages.length - optimized.length);
      const summary = await this.summarizeOldMessages(droppedMessages, client);

      return {
        messages: optimized,
        summary,
      };
    }

    return { messages: optimized };
  }
}

// Usage
const contextManager = new ContextWindowManager(180000); // Claude Opus 4.5 context
const client = new AnthropicClient(process.env.ANTHROPIC_API_KEY!);

let conversationHistory: ConversationMessage[] = [
  { role: 'user', content: 'Hello!', timestamp: Date.now() - 3600000 },
  { role: 'assistant', content: 'Hi! How can I help?', timestamp: Date.now() - 3500000 },
  // ... many more messages
  { role: 'user', content: 'What did we discuss earlier?', timestamp: Date.now() },
];

const { messages, summary } = await contextManager.optimizeWithSummary(
  conversationHistory,
  client,
  'You are a helpful assistant.'
);

if (summary) {
  console.log('Previous conversation summary:', summary);
}

const response = await client.chat(messages);
```

## Cost Optimization Strategies

```typescript
class CostOptimizedClient extends ManagedAnthropicClient {
  async chatWithCache(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    cacheKey: string,
    options?: {
      system?: string;
      cacheDurationMs?: number;
    }
  ): Promise<{ response: string; usage: any; fromCache: boolean }> {
    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Make API call
    const result = await this.chat(messages, {
      system: options?.system,
    });

    // Store in cache
    await this.setCache(cacheKey, result, options?.cacheDurationMs || 3600000);

    return { ...result, fromCache: false };
  }

  async smartModelSelection(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    complexity: 'simple' | 'medium' | 'complex'
  ) {
    const modelMap = {
      simple: 'claude-3-5-haiku-20241022',
      medium: 'claude-sonnet-4-5-20250929',
      complex: 'claude-opus-4-5-20251101',
    };

    return this.createMessage({
      model: modelMap[complexity],
      messages,
      max_tokens: complexity === 'simple' ? 1024 : 4096,
    });
  }

  async batchProcess(
    tasks: Array<{ messages: any[]; options?: any }>,
    options?: {
      concurrency?: number;
      delayMs?: number;
    }
  ): Promise<any[]> {
    const concurrency = options?.concurrency || 3;
    const delayMs = options?.delayMs || 100;
    const results: any[] = [];

    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(task => this.chat(task.messages, task.options))
      );

      results.push(...batchResults);

      // Rate limiting delay
      if (i + concurrency < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  private async getFromCache(key: string): Promise<any | null> {
    // Implement with Redis, in-memory cache, etc.
    return null;
  }

  private async setCache(key: string, value: any, ttlMs: number): Promise<void> {
    // Implement with Redis, in-memory cache, etc.
  }
}
```

## Error Handling

```typescript
class RobustAnthropicClient extends AnthropicClient {
  async createMessageWithRetry(
    request: Partial<MessageRequest>,
    options?: {
      maxRetries?: number;
      retryDelayMs?: number;
    }
  ): Promise<MessageResponse> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelayMs = options?.retryDelayMs ?? 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.createMessage(request);
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;

        // Check if error is retryable
        if (
          error.message?.includes('rate_limit') ||
          error.message?.includes('overloaded') ||
          error.message?.includes('timeout') ||
          error.status >= 500
        ) {
          if (isLastAttempt) throw error;

          const delay = retryDelayMs * Math.pow(2, attempt); // Exponential backoff
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  async safeChat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      system?: string;
      fallbackResponse?: string;
      onError?: (error: Error) => void;
    }
  ): Promise<string> {
    try {
      const result = await this.chat(messages, {
        system: options?.system,
      });
      return result.response;
    } catch (error: any) {
      console.error('Chat error:', error);
      options?.onError?.(error);

      return options?.fallbackResponse || 'I apologize, but I encountered an error. Please try again.';
    }
  }
}
```

## Best Practices

1. **Model Selection**
   - Use Haiku for simple tasks (classification, extraction)
   - Use Sonnet for balanced performance/cost
   - Use Opus for complex reasoning and creative tasks

2. **Token Optimization**
   - Track token usage and costs
   - Implement context window management
   - Use caching for repeated queries
   - Trim old conversation history

3. **Streaming**
   - Use streaming for long responses
   - Provide real-time feedback to users
   - Handle errors in stream gracefully

4. **Tool Use**
   - Validate tool inputs thoroughly
   - Handle tool errors gracefully
   - Limit tool execution iterations
   - Log tool calls for debugging

5. **Error Handling**
   - Retry on rate limits and 5xx errors
   - Use exponential backoff
   - Provide fallback responses
   - Log errors with context

6. **Security**
   - Never log API keys
   - Sanitize user inputs before tool execution
   - Implement rate limiting per user
   - Monitor for abuse patterns
