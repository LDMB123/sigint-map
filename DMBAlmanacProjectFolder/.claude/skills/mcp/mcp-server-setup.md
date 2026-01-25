---
name: mcp-server-setup
description: Creating and configuring Model Context Protocol servers with TypeScript and Python SDKs
version: 1.0.0
mcp-version: "1.0"
sdk: typescript, python
partner-ready: true
---

# MCP Server Setup

## Overview

Model Context Protocol (MCP) servers expose tools, resources, and prompts that AI assistants can discover and use. This skill covers creating production-ready MCP servers.

## MCP Server Architecture

```
┌─────────────────────────────────────┐
│         MCP Client (Claude)         │
└─────────────────┬───────────────────┘
                  │ JSON-RPC
┌─────────────────▼───────────────────┐
│          MCP Server                 │
│  ┌──────────┬──────────┬─────────┐ │
│  │  Tools   │Resources │ Prompts │ │
│  └──────────┴──────────┴─────────┘ │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│    External Systems (APIs, DBs)     │
└─────────────────────────────────────┘
```

## TypeScript Server Setup

### Installation

```bash
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D @types/node typescript tsx
```

### Basic Server Structure

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Create server instance
const server = new Server(
  {
    name: "my-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: "get_weather",
    description: "Get current weather for a location",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or zip code",
        },
        units: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature units",
        },
      },
      required: ["location"],
    },
  },
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_weather") {
    const { location, units = "celsius" } = args as {
      location: string;
      units?: string;
    };

    // Implement weather logic
    const weatherData = await fetchWeather(location, units);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(weatherData, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
```

### Advanced Tool Definition with Validation

```typescript
// src/tools/database-query.ts
import { z } from "zod";

export const DatabaseQueryInputSchema = z.object({
  query: z.string().min(1).max(10000),
  database: z.enum(["users", "products", "analytics"]),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

export type DatabaseQueryInput = z.infer<typeof DatabaseQueryInputSchema>;

export const databaseQueryTool = {
  name: "database_query",
  description: "Execute a read-only database query",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "SQL SELECT query to execute",
        minLength: 1,
        maxLength: 10000,
      },
      database: {
        type: "string",
        enum: ["users", "products", "analytics"],
        description: "Target database",
      },
      limit: {
        type: "number",
        description: "Maximum rows to return",
        minimum: 1,
        maximum: 1000,
      },
      offset: {
        type: "number",
        description: "Number of rows to skip",
        minimum: 0,
      },
    },
    required: ["query", "database"],
  },
};

export async function executeDatabaseQuery(
  input: DatabaseQueryInput
): Promise<string> {
  // Validate input
  const validated = DatabaseQueryInputSchema.parse(input);

  // Ensure read-only
  if (!validated.query.trim().toUpperCase().startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed");
  }

  // Execute query (example)
  const results = await queryDatabase(validated);

  return JSON.stringify(results, null, 2);
}
```

## Python Server Setup

### Installation

```bash
pip install mcp pydantic
```

### Basic Python Server

```python
# src/server.py
from typing import Any, Sequence
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    CallToolResult,
    GetPromptResult,
    PromptMessage,
)
from pydantic import BaseModel, Field

# Define input models
class WeatherInput(BaseModel):
    location: str = Field(description="City name or zip code")
    units: str = Field(
        default="celsius",
        description="Temperature units",
        pattern="^(celsius|fahrenheit)$"
    )

# Create server
app = Server("my-mcp-server")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="get_weather",
            description="Get current weather for a location",
            inputSchema={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or zip code",
                    },
                    "units": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature units",
                    },
                },
                "required": ["location"],
            },
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Any) -> Sequence[TextContent]:
    if name == "get_weather":
        # Validate input
        input_data = WeatherInput(**arguments)

        # Fetch weather
        weather_data = await fetch_weather(
            input_data.location,
            input_data.units
        )

        return [
            TextContent(
                type="text",
                text=json.dumps(weather_data, indent=2)
            )
        ]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as streams:
        await app.run(
            streams[0],
            streams[1],
            app.create_initialization_options()
        )

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

## Resource Providers

Resources expose data that can be read by the client.

```typescript
// TypeScript resource example
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "config://app/settings",
        name: "Application Settings",
        description: "Current application configuration",
        mimeType: "application/json",
      },
      {
        uri: "logs://recent",
        name: "Recent Logs",
        description: "Last 100 log entries",
        mimeType: "text/plain",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "config://app/settings") {
    const config = await loadConfig();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }

  if (uri === "logs://recent") {
    const logs = await getRecentLogs(100);
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: logs.join("\n"),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});
```

## Prompt Templates

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "code_review",
        description: "Review code for best practices",
        arguments: [
          {
            name: "language",
            description: "Programming language",
            required: true,
          },
          {
            name: "style_guide",
            description: "Style guide to follow",
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "code_review") {
    const language = args?.language || "javascript";
    const styleGuide = args?.style_guide || "standard";

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Review the following ${language} code for:
- Best practices
- Security issues
- Performance concerns
- ${styleGuide} style guide compliance

Provide specific suggestions for improvement.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});
```

## Server Configuration

### package.json for TypeScript

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-mcp-server": "./build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node build/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Transport Mechanisms

### stdio Transport (Standard)

```typescript
// Best for local/spawned processes
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

### HTTP with SSE Transport

```typescript
// Best for remote/network services
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const app = express();

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  // Handle client messages
});

app.listen(3000);
```

## Error Handling

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    // Validate tool exists
    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    // Execute tool
    const result = await executeTool(name, args);

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    console.error("Tool execution error:", error);

    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});
```

## Testing Your Server

```typescript
// test/server.test.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

describe("MCP Server", () => {
  let client: Client;
  let serverProcess: ChildProcess;

  beforeEach(async () => {
    serverProcess = spawn("node", ["build/index.js"]);
    const transport = new StdioClientTransport({
      command: "node",
      args: ["build/index.js"],
    });

    client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  });

  afterEach(async () => {
    await client.close();
    serverProcess.kill();
  });

  test("lists available tools", async () => {
    const response = await client.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );

    expect(response.tools).toHaveLength(1);
    expect(response.tools[0].name).toBe("get_weather");
  });

  test("executes tool successfully", async () => {
    const response = await client.request({
      method: "tools/call",
      params: {
        name: "get_weather",
        arguments: { location: "London" },
      },
    });

    expect(response.content[0].type).toBe("text");
    expect(response.content[0].text).toContain("temperature");
  });
});
```

## Best Practices

1. **Use Strong Typing**: Leverage TypeScript or Pydantic for type safety
2. **Validate Inputs**: Always validate tool arguments before execution
3. **Handle Errors Gracefully**: Return meaningful error messages
4. **Document Everything**: Provide clear descriptions for tools, resources, and prompts
5. **Version Your Server**: Use semantic versioning for compatibility
6. **Log Appropriately**: Use stderr for logs (stdout is reserved for protocol)
7. **Test Thoroughly**: Write integration tests for all tools
8. **Secure By Default**: Implement authentication and rate limiting
9. **Keep Tools Focused**: One tool should do one thing well
10. **Monitor Performance**: Track tool execution times and failures

## Production Checklist

- [ ] All tools have comprehensive descriptions
- [ ] Input validation for all arguments
- [ ] Error handling for all edge cases
- [ ] Logging configured (to stderr)
- [ ] Tests covering all tools and resources
- [ ] Documentation for integration
- [ ] Version number in server info
- [ ] Rate limiting implemented
- [ ] Authentication configured
- [ ] Monitoring and alerting setup

## Common Patterns

### Pagination

```typescript
const paginationSchema = {
  page: { type: "number", minimum: 1 },
  pageSize: { type: "number", minimum: 1, maximum: 100 },
};
```

### Caching

```typescript
const cache = new Map();

async function cachedTool(args: any) {
  const key = JSON.stringify(args);
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = await expensiveOperation(args);
  cache.set(key, result);
  return result;
}
```

### Rate Limiting

```typescript
import { RateLimiter } from "limiter";

const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: "minute",
});

async function rateLimitedTool(args: any) {
  await limiter.removeTokens(1);
  return await toolImplementation(args);
}
```
