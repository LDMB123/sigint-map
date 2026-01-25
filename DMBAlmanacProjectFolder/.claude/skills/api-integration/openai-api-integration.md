---
description: Integration patterns for OpenAI API including Chat Completions, function calling, embeddings, vision, and streaming
tags: [openai, gpt, chatgpt, embeddings, vision, ai, llm]
globs: ["**/openai/**/*.ts", "**/ai/openai*.ts"]
---

# OpenAI API Integration

## Chat Completions - Basic Usage

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  tools?: Tool[];
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}

interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenAIClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private defaultModel = 'gpt-4o-2024-11-20';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        ...request,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ response: string; usage: any }> {
    const result = await this.createChatCompletion({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });

    return {
      response: result.choices[0]?.message.content || '',
      usage: result.usage,
    };
  }
}

// Basic usage
const client = new OpenAIClient(process.env.OPENAI_API_KEY!);

const response = await client.chat(
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' },
  ],
  {
    model: 'gpt-4o-2024-11-20',
    temperature: 0.7,
  }
);

console.log(response.response);
console.log(`Tokens used: ${response.usage.total_tokens}`);
```

## Function Calling / Tools

```typescript
interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

class OpenAIFunctionClient extends OpenAIClient {
  async executeWithTools(
    messages: ChatMessage[],
    tools: Tool[],
    toolImplementations: Record<string, (args: any) => Promise<any>>,
    options?: {
      maxIterations?: number;
      model?: string;
    }
  ): Promise<{ finalResponse: string; totalTokens: number; iterations: number }> {
    const conversationMessages = [...messages];
    let totalTokens = 0;
    let iterations = 0;
    const maxIterations = options?.maxIterations ?? 10;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.createChatCompletion({
        model: options?.model || this.defaultModel,
        messages: conversationMessages,
        tools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      totalTokens += response.usage.total_tokens;

      // Add assistant message to conversation
      conversationMessages.push(choice.message);

      // Check if we're done
      if (choice.finish_reason === 'stop') {
        return {
          finalResponse: choice.message.content || '',
          totalTokens,
          iterations,
        };
      }

      // Execute tool calls
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          try {
            const implementation = toolImplementations[functionName];
            if (!implementation) {
              throw new Error(`No implementation found for function: ${functionName}`);
            }

            const result = await implementation(functionArgs);

            // Add tool result to conversation
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (error: any) {
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message }),
            });
          }
        }
      }
    }

    throw new Error(`Max iterations (${maxIterations}) reached`);
  }
}

// Example: Weather and database query tools
const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get the current weather in a given location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products in the database',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          category: {
            type: 'string',
            description: 'Product category filter',
          },
          max_price: {
            type: 'number',
            description: 'Maximum price filter',
          },
        },
        required: ['query'],
      },
    },
  },
];

const toolImplementations = {
  get_current_weather: async (args: { location: string; unit?: string }) => {
    // Call weather API
    return {
      location: args.location,
      temperature: 72,
      unit: args.unit || 'fahrenheit',
      condition: 'sunny',
    };
  },
  search_products: async (args: { query: string; category?: string; max_price?: number }) => {
    // Query database
    return {
      products: [
        { id: 1, name: 'Product A', price: 29.99, category: 'Electronics' },
        { id: 2, name: 'Product B', price: 49.99, category: 'Electronics' },
      ],
      total: 2,
    };
  },
};

// Usage
const functionClient = new OpenAIFunctionClient(process.env.OPENAI_API_KEY!);

const result = await functionClient.executeWithTools(
  [
    {
      role: 'user',
      content: "What's the weather in SF and can you find me wireless headphones under $100?",
    },
  ],
  tools,
  toolImplementations
);

console.log(result.finalResponse);
console.log(`Total tokens: ${result.totalTokens}, Iterations: ${result.iterations}`);
```

## Streaming Responses

```typescript
interface StreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
}

class OpenAIStreamingClient extends OpenAIClient {
  async *streamChatCompletion(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        stream: true,
        ...request,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
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
        if (line.includes('[DONE]')) continue;

        const data = line.slice(6);

        try {
          const chunk: StreamChunk = JSON.parse(data);
          yield chunk;
        } catch (e) {
          console.error('Failed to parse SSE chunk:', data);
        }
      }
    }
  }

  async streamChat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      onChunk?: (text: string) => void;
    }
  ): Promise<{ fullResponse: string; usage?: any }> {
    let fullResponse = '';

    for await (const chunk of this.streamChatCompletion({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature,
    })) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        options?.onChunk?.(content);
      }
    }

    return { fullResponse };
  }
}

// Usage: Console streaming
const streamClient = new OpenAIStreamingClient(process.env.OPENAI_API_KEY!);

await streamClient.streamChat(
  [
    { role: 'system', content: 'You are a creative writer.' },
    { role: 'user', content: 'Write a haiku about coding.' },
  ],
  {
    temperature: 0.9,
    onChunk: (text) => process.stdout.write(text),
  }
);

// Usage: Express.js SSE endpoint
app.post('/api/chat/stream', async (req, res) => {
  const { messages } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const chunk of streamClient.streamChatCompletion({ messages })) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }

      if (chunk.choices[0]?.finish_reason) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }
    }

    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});
```

## Embeddings

```typescript
interface EmbeddingRequest {
  input: string | string[];
  model: string;
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

interface EmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

class OpenAIEmbeddingsClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private defaultModel = 'text-embedding-3-large';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createEmbedding(input: string | string[], options?: {
    model?: string;
    dimensions?: number;
  }): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        input,
        dimensions: options?.dimensions,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  async embed(text: string, options?: { model?: string; dimensions?: number }): Promise<number[]> {
    const response = await this.createEmbedding(text, options);
    return response.data[0].embedding;
  }

  async batchEmbed(
    texts: string[],
    options?: { model?: string; dimensions?: number; batchSize?: number }
  ): Promise<number[][]> {
    const batchSize = options?.batchSize || 100;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.createEmbedding(batch, options);

      embeddings.push(...response.data.map(item => item.embedding));

      // Small delay to avoid rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async findSimilar(
    query: string,
    documents: Array<{ text: string; embedding?: number[] }>,
    topK: number = 5
  ): Promise<Array<{ text: string; similarity: number; index: number }>> {
    const queryEmbedding = await this.embed(query);

    // Generate embeddings for documents that don't have them
    const documentsWithEmbeddings = await Promise.all(
      documents.map(async (doc, index) => {
        const embedding = doc.embedding || (await this.embed(doc.text));
        return { ...doc, embedding, index };
      })
    );

    // Calculate similarities and sort
    const results = documentsWithEmbeddings
      .map(doc => ({
        text: doc.text,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding!),
        index: doc.index,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }
}

// Usage: Semantic search
const embeddingClient = new OpenAIEmbeddingsClient(process.env.OPENAI_API_KEY!);

const documents = [
  { text: 'Paris is the capital of France.' },
  { text: 'Python is a programming language.' },
  { text: 'The Eiffel Tower is in Paris.' },
  { text: 'JavaScript is used for web development.' },
];

const results = await embeddingClient.findSimilar(
  'Tell me about Paris',
  documents,
  2
);

console.log('Most similar documents:');
results.forEach(result => {
  console.log(`${result.text} (similarity: ${result.similarity.toFixed(3)})`);
});
```

## Vision API

```typescript
interface VisionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

class OpenAIVisionClient extends OpenAIClient {
  async analyzeImage(
    imageUrl: string,
    prompt: string,
    options?: {
      detail?: 'low' | 'high' | 'auto';
      maxTokens?: number;
    }
  ): Promise<string> {
    const response = await this.createChatCompletion({
      model: 'gpt-4o-2024-11-20',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: options?.detail || 'auto',
              },
            },
          ],
        } as any,
      ],
      max_tokens: options?.maxTokens || 1000,
    });

    return response.choices[0]?.message.content || '';
  }

  async analyzeImageFromBase64(
    base64Image: string,
    mimeType: string,
    prompt: string,
    options?: {
      detail?: 'low' | 'high' | 'auto';
      maxTokens?: number;
    }
  ): Promise<string> {
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    return this.analyzeImage(dataUrl, prompt, options);
  }

  async analyzeMultipleImages(
    images: Array<{ url: string; detail?: 'low' | 'high' | 'auto' }>,
    prompt: string,
    options?: {
      maxTokens?: number;
    }
  ): Promise<string> {
    const content: any[] = [
      { type: 'text', text: prompt },
      ...images.map(img => ({
        type: 'image_url',
        image_url: {
          url: img.url,
          detail: img.detail || 'auto',
        },
      })),
    ];

    const response = await this.createChatCompletion({
      model: 'gpt-4o-2024-11-20',
      messages: [{ role: 'user', content }],
      max_tokens: options?.maxTokens || 2000,
    });

    return response.choices[0]?.message.content || '';
  }

  async extractStructuredData<T>(
    imageUrl: string,
    schema: string,
    options?: {
      detail?: 'low' | 'high' | 'auto';
    }
  ): Promise<T> {
    const prompt = `Extract data from this image according to the following schema and return only valid JSON:\n${schema}`;

    const response = await this.analyzeImage(imageUrl, prompt, {
      detail: options?.detail,
      maxTokens: 2000,
    });

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  }
}

// Usage: Analyze image
const visionClient = new OpenAIVisionClient(process.env.OPENAI_API_KEY!);

const description = await visionClient.analyzeImage(
  'https://example.com/image.jpg',
  'Describe this image in detail.',
  { detail: 'high' }
);

console.log(description);

// Usage: Extract structured data from receipt
interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  items: Array<{ name: string; price: number }>;
}

const receiptSchema = `{
  "merchant": "string",
  "date": "YYYY-MM-DD",
  "total": number,
  "items": [{ "name": "string", "price": number }]
}`;

const receiptData = await visionClient.extractStructuredData<ReceiptData>(
  'https://example.com/receipt.jpg',
  receiptSchema,
  { detail: 'high' }
);

console.log('Receipt data:', receiptData);

// Usage: Compare multiple images
const comparison = await visionClient.analyzeMultipleImages(
  [
    { url: 'https://example.com/before.jpg', detail: 'high' },
    { url: 'https://example.com/after.jpg', detail: 'high' },
  ],
  'Compare these two images and describe the differences.'
);
```

## Rate Limiting and Error Handling

```typescript
class RateLimitedOpenAIClient extends OpenAIClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minRequestInterval = 100; // ms between requests

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return this.queueRequest(() => super.createChatCompletion(request));
  }

  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve =>
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }

    this.processing = false;
  }

  async withRetry<T>(
    fn: () => Promise<T>,
    options?: {
      maxRetries?: number;
      retryDelayMs?: number;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelayMs = options?.retryDelayMs ?? 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const isRetryable =
          error.message?.includes('rate_limit') ||
          error.message?.includes('timeout') ||
          error.status >= 500;

        if (!isRetryable || isLastAttempt) {
          throw error;
        }

        const delay = retryDelayMs * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// Usage
const rateLimitedClient = new RateLimitedOpenAIClient(process.env.OPENAI_API_KEY!);

const results = await Promise.all([
  rateLimitedClient.withRetry(() =>
    rateLimitedClient.chat([{ role: 'user', content: 'Question 1' }])
  ),
  rateLimitedClient.withRetry(() =>
    rateLimitedClient.chat([{ role: 'user', content: 'Question 2' }])
  ),
  rateLimitedClient.withRetry(() =>
    rateLimitedClient.chat([{ role: 'user', content: 'Question 3' }])
  ),
]);
```

## Best Practices

1. **Model Selection**
   - Use GPT-4o for complex reasoning and vision tasks
   - Use GPT-4o-mini for faster, cost-effective responses
   - Use GPT-3.5-turbo for simple tasks at lowest cost

2. **Function Calling**
   - Provide clear, detailed function descriptions
   - Validate function arguments before execution
   - Handle function errors gracefully
   - Limit max iterations to prevent infinite loops

3. **Embeddings**
   - Use text-embedding-3-large for best quality
   - Use text-embedding-3-small for cost optimization
   - Reduce dimensions if memory is a concern
   - Cache embeddings for static content

4. **Vision**
   - Use 'low' detail for simple image analysis
   - Use 'high' detail for OCR and detailed extraction
   - Resize large images to reduce costs
   - Use structured prompts for data extraction

5. **Rate Limiting**
   - Implement request queuing for bulk operations
   - Use exponential backoff for retries
   - Monitor rate limit headers
   - Consider batching when possible

6. **Error Handling**
   - Retry on rate limits and 5xx errors
   - Don't retry on 4xx client errors
   - Log errors with context
   - Provide fallback responses
