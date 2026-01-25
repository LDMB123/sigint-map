---
name: mcp-api-gateway
description: External API integration via MCP with authentication, rate limiting, caching, and error transformation
version: 1.0.0
mcp-version: "1.0"
sdk: typescript
partner-ready: true
---

# MCP API Gateway Integration

## Overview

API Gateway MCP servers wrap external REST and GraphQL APIs, providing unified access with authentication, rate limiting, response caching, and error handling.

## Architecture

```
┌─────────────────────────────────────┐
│      API Gateway MCP Server         │
│  ┌───────────────────────────────┐  │
│  │   Request Pipeline            │  │
│  │  - Auth injection             │  │
│  │  - Rate limiting              │  │
│  │  - Caching                    │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │   API Client Manager          │  │
│  │  - HTTP client                │  │
│  │  - GraphQL client             │  │
│  │  - Error handling             │  │
│  └──────────┬────────────────────┘  │
└─────────────┼───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      External APIs                  │
│  - REST   - GraphQL   - WebSocket   │
└─────────────────────────────────────┘
```

## REST API Gateway

```typescript
// src/api-gateway.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { z } from "zod";

interface APIConfig {
  baseURL: string;
  authentication?: {
    type: "bearer" | "apikey" | "basic" | "oauth2";
    credentials: Record<string, string>;
  };
  rateLimit?: {
    requestsPerMinute: number;
  };
  timeout?: number;
  retries?: number;
}

class APIClient {
  private client: AxiosInstance;
  private requestCount = 0;
  private rateLimitWindow = Date.now();

  constructor(private config: APIConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: this.buildAuthHeaders(),
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limited - wait and retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!this.config.authentication) return headers;

    const { type, credentials } = this.config.authentication;

    switch (type) {
      case "bearer":
        headers["Authorization"] = `Bearer ${credentials.token}`;
        break;
      case "apikey":
        headers[credentials.headerName || "X-API-Key"] = credentials.apiKey;
        break;
      case "basic":
        const encoded = Buffer.from(
          `${credentials.username}:${credentials.password}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${encoded}`;
        break;
    }

    return headers;
  }

  private async checkRateLimit() {
    if (!this.config.rateLimit) return;

    const now = Date.now();
    if (now - this.rateLimitWindow > 60000) {
      this.requestCount = 0;
      this.rateLimitWindow = now;
    }

    if (this.requestCount >= this.config.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - (now - this.rateLimitWindow);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.rateLimitWindow = Date.now();
    }

    this.requestCount++;
  }

  async request(config: AxiosRequestConfig) {
    await this.checkRateLimit();
    return await this.client.request(config);
  }

  async get(url: string, config?: AxiosRequestConfig) {
    await this.checkRateLimit();
    return await this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    await this.checkRateLimit();
    return await this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    await this.checkRateLimit();
    return await this.client.put(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    await this.checkRateLimit();
    return await this.client.delete(url, config);
  }
}

// API Registry
class APIRegistry {
  private apis = new Map<string, APIClient>();

  register(name: string, config: APIConfig) {
    this.apis.set(name, new APIClient(config));
  }

  get(name: string): APIClient | undefined {
    return this.apis.get(name);
  }
}

const registry = new APIRegistry();

// Configure APIs
registry.register("jsonplaceholder", {
  baseURL: "https://jsonplaceholder.typicode.com",
});

registry.register("github", {
  baseURL: "https://api.github.com",
  authentication: {
    type: "bearer",
    credentials: {
      token: process.env.GITHUB_TOKEN || "",
    },
  },
  rateLimit: {
    requestsPerMinute: 60,
  },
});

registry.register("stripe", {
  baseURL: "https://api.stripe.com/v1",
  authentication: {
    type: "bearer",
    credentials: {
      token: process.env.STRIPE_SECRET_KEY || "",
    },
  },
});

const server = new Server(
  {
    name: "api-gateway-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  {
    name: "api_request",
    description: "Make a request to an external API",
    inputSchema: {
      type: "object",
      properties: {
        api: {
          type: "string",
          description: "API name (jsonplaceholder, github, stripe)",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          default: "GET",
        },
        endpoint: {
          type: "string",
          description: "API endpoint path",
        },
        params: {
          type: "object",
          description: "Query parameters",
        },
        data: {
          type: "object",
          description: "Request body",
        },
        headers: {
          type: "object",
          description: "Additional headers",
        },
      },
      required: ["api", "endpoint"],
    },
  },
  {
    name: "github_api",
    description: "Make a request to GitHub API",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: { type: "string" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
        data: { type: "object" },
      },
      required: ["endpoint"],
    },
  },
  {
    name: "stripe_api",
    description: "Make a request to Stripe API",
    inputSchema: {
      type: "object",
      properties: {
        endpoint: { type: "string" },
        method: { type: "string", enum: ["GET", "POST", "DELETE"] },
        data: { type: "object" },
      },
      required: ["endpoint"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "api_request": {
        const { api, method = "GET", endpoint, params, data, headers } =
          args as any;

        const client = registry.get(api);
        if (!client) {
          throw new Error(`API ${api} not configured`);
        }

        const response = await client.request({
          method,
          url: endpoint,
          params,
          data,
          headers,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: response.status,
                  data: response.data,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "github_api": {
        const { endpoint, method = "GET", data } = args as any;
        const client = registry.get("github");

        if (!client) {
          throw new Error("GitHub API not configured");
        }

        const response = await client.request({
          method,
          url: endpoint,
          data,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "stripe_api": {
        const { endpoint, method = "GET", data } = args as any;
        const client = registry.get("stripe");

        if (!client) {
          throw new Error("Stripe API not configured");
        }

        const response = await client.request({
          method,
          url: endpoint,
          data,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `API error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("API Gateway MCP Server running");
}

main();
```

## GraphQL API Integration

```typescript
// src/graphql-client.ts
import { GraphQLClient } from "graphql-request";

export class GraphQLAPIClient {
  private client: GraphQLClient;

  constructor(
    endpoint: string,
    headers?: Record<string, string>
  ) {
    this.client = new GraphQLClient(endpoint, {
      headers,
    });
  }

  async query<T = any>(query: string, variables?: any): Promise<T> {
    return await this.client.request<T>(query, variables);
  }

  async mutation<T = any>(mutation: string, variables?: any): Promise<T> {
    return await this.client.request<T>(mutation, variables);
  }

  setHeaders(headers: Record<string, string>) {
    this.client.setHeaders(headers);
  }
}

// Tool for GraphQL
export const graphqlTool = {
  name: "graphql_query",
  description: "Execute a GraphQL query",
  inputSchema: {
    type: "object",
    properties: {
      api: { type: "string", description: "API name" },
      query: { type: "string", description: "GraphQL query or mutation" },
      variables: { type: "object", description: "Query variables" },
    },
    required: ["api", "query"],
  },
};
```

## Response Caching

```typescript
// src/cache.ts
import NodeCache from "node-cache";
import crypto from "crypto";

export class ResponseCache {
  private cache: NodeCache;

  constructor(ttlSeconds = 300) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: 60,
    });
  }

  getCacheKey(config: any): string {
    const key = JSON.stringify({
      url: config.url,
      method: config.method,
      params: config.params,
      data: config.data,
    });
    return crypto.createHash("md5").update(key).digest("hex");
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || 0);
  }

  delete(key: string): number {
    return this.cache.del(key);
  }

  flush(): void {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Cached API Client
export class CachedAPIClient extends APIClient {
  private cache: ResponseCache;

  constructor(config: APIConfig, cacheTTL = 300) {
    super(config);
    this.cache = new ResponseCache(cacheTTL);
  }

  async get(url: string, config?: AxiosRequestConfig) {
    const cacheKey = this.cache.getCacheKey({
      url,
      method: "GET",
      params: config?.params,
    });

    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log("Cache hit:", url);
      return cached;
    }

    const response = await super.get(url, config);
    this.cache.set(cacheKey, response);

    return response;
  }
}
```

## Rate Limiting

```typescript
// src/rate-limiter.ts
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.waitForSlot();
      }
    }

    this.requests.push(now);
  }

  getStats() {
    const now = Date.now();
    const recentRequests = this.requests.filter(
      (time) => now - time < this.windowMs
    );

    return {
      currentRequests: recentRequests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      available: this.maxRequests - recentRequests.length,
    };
  }
}
```

## Error Transformation

```typescript
// src/error-transformer.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public apiName: string,
    public endpoint: string,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function transformAPIError(error: any, apiName: string): APIError {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const endpoint = error.config?.url || "unknown";

    let message = `API request failed with status ${status}`;

    if (status === 400) {
      message = "Bad request: " + (error.response.data?.message || "Invalid input");
    } else if (status === 401) {
      message = "Authentication failed: Invalid credentials";
    } else if (status === 403) {
      message = "Access forbidden: Insufficient permissions";
    } else if (status === 404) {
      message = "Resource not found";
    } else if (status === 429) {
      message = "Rate limit exceeded";
    } else if (status >= 500) {
      message = "Server error: API is experiencing issues";
    }

    return new APIError(status, apiName, endpoint, message, error);
  } else if (error.request) {
    // Request made but no response
    return new APIError(
      0,
      apiName,
      error.config?.url || "unknown",
      "No response from API server",
      error
    );
  } else {
    // Error setting up request
    return new APIError(
      0,
      apiName,
      "unknown",
      `Request setup error: ${error.message}`,
      error
    );
  }
}
```

## Request Retry Logic

```typescript
// src/retry.ts
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (
        error.response &&
        !config.retryableStatuses.includes(error.response.status)
      ) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Usage
const retryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

const response = await withRetry(
  () => client.get("/endpoint"),
  retryConfig
);
```

## Authentication Flows

```typescript
// src/auth.ts
export class OAuth2Client {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private tokenUrl: string
  ) {}

  async getAccessToken(): Promise<string> {
    const response = await axios.post(this.tokenUrl, {
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    return response.data.access_token;
  }

  async refreshToken(refreshToken: string): Promise<string> {
    const response = await axios.post(this.tokenUrl, {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    return response.data.access_token;
  }
}

export class TokenManager {
  private token: string | null = null;
  private expiresAt: number = 0;

  constructor(private oauth: OAuth2Client) {}

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt) {
      return this.token;
    }

    this.token = await this.oauth.getAccessToken();
    this.expiresAt = Date.now() + 3600 * 1000; // 1 hour

    return this.token;
  }
}
```

## Webhook Handling

```typescript
// src/webhooks.ts
import express from "express";
import crypto from "crypto";

export class WebhookHandler {
  private handlers = new Map<string, (payload: any) => Promise<void>>();

  verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(payload).digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }

  register(event: string, handler: (payload: any) => Promise<void>) {
    this.handlers.set(event, handler);
  }

  async handle(event: string, payload: any) {
    const handler = this.handlers.get(event);
    if (handler) {
      await handler(payload);
    }
  }

  setupEndpoint(app: express.Application, path: string, secret: string) {
    app.post(
      path,
      express.json({ verify: this.rawBodySaver }),
      async (req, res) => {
        const signature = req.headers["x-signature"] as string;

        if (!this.verifySignature((req as any).rawBody, signature, secret)) {
          return res.status(401).send("Invalid signature");
        }

        const event = req.headers["x-event-type"] as string;

        try {
          await this.handle(event, req.body);
          res.status(200).send("OK");
        } catch (error) {
          console.error("Webhook error:", error);
          res.status(500).send("Internal error");
        }
      }
    );
  }

  private rawBodySaver(
    req: express.Request,
    res: express.Response,
    buf: Buffer,
    encoding: string
  ) {
    if (buf && buf.length) {
      (req as any).rawBody = buf.toString(encoding || "utf8");
    }
  }
}
```

## Best Practices

1. **Authentication**: Securely store and inject credentials
2. **Rate Limiting**: Respect API rate limits
3. **Caching**: Cache responses when appropriate
4. **Retry Logic**: Implement exponential backoff
5. **Error Handling**: Transform errors into meaningful messages
6. **Timeouts**: Set reasonable request timeouts
7. **Logging**: Log all API interactions
8. **Monitoring**: Track API usage and errors
9. **Documentation**: Document API integration patterns
10. **Testing**: Mock external APIs in tests

## Security Checklist

- [ ] API credentials stored in environment variables
- [ ] HTTPS enforced for all requests
- [ ] Webhook signatures verified
- [ ] Rate limiting implemented
- [ ] Request timeouts configured
- [ ] Error messages don't leak secrets
- [ ] Input validation on all parameters
- [ ] OAuth tokens refreshed automatically
- [ ] Audit logging enabled
- [ ] API key rotation supported
