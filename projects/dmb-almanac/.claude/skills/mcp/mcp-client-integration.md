---
name: mcp-client-integration
description: Consuming MCP servers from client applications with connection management and tool invocation
version: 1.0.0
mcp-version: "1.0"
sdk: typescript, python
partner-ready: true
---

# MCP Client Integration

## Overview

MCP clients discover and interact with MCP servers to access tools, resources, and prompts. This skill covers building robust client integrations.

## Client Architecture

```
┌─────────────────────────────────────┐
│      Your Application               │
│  ┌───────────────────────────────┐  │
│  │      MCP Client               │  │
│  │  ┌────────┬────────┬────────┐ │  │
│  │  │Connect │Discover│ Invoke │ │  │
│  │  └────────┴────────┴────────┘ │  │
│  └───────────────┬───────────────┘  │
└──────────────────┼───────────────────┘
                   │ JSON-RPC
┌──────────────────▼───────────────────┐
│          MCP Server(s)               │
└──────────────────────────────────────┘
```

## TypeScript Client Setup

### Installation

```bash
npm install @modelcontextprotocol/sdk
```

### Basic Client Connection

```typescript
// src/client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ListToolsResultSchema,
  CallToolResultSchema,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;

  constructor() {
    this.client = new Client(
      {
        name: "my-app-client",
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
  }

  async connect(serverCommand: string, serverArgs: string[] = []) {
    this.transport = new StdioClientTransport({
      command: serverCommand,
      args: serverArgs,
    });

    await this.client.connect(this.transport);
    console.log("Connected to MCP server");
  }

  async disconnect() {
    if (this.transport) {
      await this.client.close();
      this.transport = null;
    }
  }

  async listTools() {
    const response = await this.client.request(
      { method: "tools/list" },
      ListToolsResultSchema
    );
    return response.tools;
  }

  async callTool(name: string, args: Record<string, unknown>) {
    const response = await this.client.request(
      {
        method: "tools/call",
        params: { name, arguments: args },
      },
      CallToolResultSchema
    );
    return response;
  }

  async listResources() {
    const response = await this.client.request(
      { method: "resources/list" },
      ListResourcesResultSchema
    );
    return response.resources;
  }

  async readResource(uri: string) {
    const response = await this.client.request(
      {
        method: "resources/read",
        params: { uri },
      },
      ReadResourceResultSchema
    );
    return response.contents;
  }
}
```

### Usage Example

```typescript
// src/app.ts
async function main() {
  const client = new MCPClient();

  try {
    // Connect to server
    await client.connect("node", ["./mcp-server/build/index.js"]);

    // Discover available tools
    const tools = await client.listTools();
    console.log("Available tools:", tools.map((t) => t.name));

    // Call a tool
    const result = await client.callTool("get_weather", {
      location: "San Francisco",
      units: "celsius",
    });

    console.log("Weather result:", result.content[0].text);

    // Read a resource
    const resources = await client.listResources();
    if (resources.length > 0) {
      const content = await client.readResource(resources[0].uri);
      console.log("Resource content:", content);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.disconnect();
  }
}

main();
```

## Python Client Setup

### Installation

```bash
pip install mcp
```

### Basic Python Client

```python
# src/client.py
from typing import Optional, Any
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from contextlib import AsyncExitStack

class MCPClient:
    def __init__(self):
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()

    async def connect(self, server_command: str, server_args: list[str] = None):
        """Connect to an MCP server via stdio"""
        server_params = StdioServerParameters(
            command=server_command,
            args=server_args or [],
        )

        stdio_transport = await self.exit_stack.enter_async_context(
            stdio_client(server_params)
        )

        self.stdio, self.write = stdio_transport
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(self.stdio, self.write)
        )

        await self.session.initialize()
        print("Connected to MCP server")

    async def disconnect(self):
        """Disconnect from the server"""
        await self.exit_stack.aclose()

    async def list_tools(self) -> list[Any]:
        """List available tools"""
        if not self.session:
            raise RuntimeError("Not connected to server")

        response = await self.session.list_tools()
        return response.tools

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Call a tool with arguments"""
        if not self.session:
            raise RuntimeError("Not connected to server")

        response = await self.session.call_tool(name, arguments)
        return response

    async def list_resources(self) -> list[Any]:
        """List available resources"""
        if not self.session:
            raise RuntimeError("Not connected to server")

        response = await self.session.list_resources()
        return response.resources

    async def read_resource(self, uri: str) -> Any:
        """Read a resource by URI"""
        if not self.session:
            raise RuntimeError("Not connected to server")

        response = await self.session.read_resource(uri)
        return response.contents
```

### Python Usage Example

```python
# src/app.py
import asyncio
from client import MCPClient

async def main():
    client = MCPClient()

    try:
        # Connect to server
        await client.connect("python", ["server.py"])

        # Discover tools
        tools = await client.list_tools()
        print(f"Available tools: {[t.name for t in tools]}")

        # Call a tool
        result = await client.call_tool(
            "get_weather",
            {"location": "San Francisco", "units": "celsius"}
        )
        print(f"Weather result: {result.content[0].text}")

        # Read resources
        resources = await client.list_resources()
        if resources:
            content = await client.read_resource(resources[0].uri)
            print(f"Resource content: {content}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

## Server Discovery

### Configuration-Based Discovery

```typescript
// config/mcp-servers.json
{
  "servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    },
    "database": {
      "command": "node",
      "args": ["./servers/database/build/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

### Multi-Server Client Manager

```typescript
// src/server-manager.ts
import { MCPClient } from "./client.js";
import fs from "fs/promises";

interface ServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class ServerManager {
  private clients = new Map<string, MCPClient>();
  private config: Record<string, ServerConfig>;

  async loadConfig(configPath: string) {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    this.config = config.servers;
  }

  async connectAll() {
    for (const [name, config] of Object.entries(this.config)) {
      try {
        const client = new MCPClient();

        // Resolve environment variables
        if (config.env) {
          for (const [key, value] of Object.entries(config.env)) {
            const resolved = value.replace(
              /\$\{(\w+)\}/g,
              (_, envVar) => process.env[envVar] || ""
            );
            process.env[key] = resolved;
          }
        }

        await client.connect(config.command, config.args);
        this.clients.set(name, client);
        console.log(`Connected to ${name} server`);
      } catch (error) {
        console.error(`Failed to connect to ${name}:`, error);
      }
    }
  }

  getClient(serverName: string): MCPClient | undefined {
    return this.clients.get(serverName);
  }

  async disconnectAll() {
    for (const [name, client] of this.clients.entries()) {
      try {
        await client.disconnect();
        console.log(`Disconnected from ${name}`);
      } catch (error) {
        console.error(`Error disconnecting from ${name}:`, error);
      }
    }
    this.clients.clear();
  }

  async getAllTools() {
    const allTools = new Map<string, any[]>();

    for (const [name, client] of this.clients.entries()) {
      try {
        const tools = await client.listTools();
        allTools.set(name, tools);
      } catch (error) {
        console.error(`Error listing tools from ${name}:`, error);
      }
    }

    return allTools;
  }
}
```

## Tool Invocation Patterns

### Automatic Retry

```typescript
async function callToolWithRetry(
  client: MCPClient,
  toolName: string,
  args: Record<string, unknown>,
  maxRetries = 3
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await client.callTool(toolName, args);

      if (result.isError) {
        throw new Error(result.content[0].text);
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw new Error(
    `Tool call failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}
```

### Parallel Tool Execution

```typescript
async function callToolsInParallel(
  client: MCPClient,
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>
) {
  const promises = toolCalls.map(({ name, args }) =>
    client.callTool(name, args).catch((error) => ({
      error: error.message,
      toolName: name,
    }))
  );

  const results = await Promise.all(promises);

  return results.map((result, index) => ({
    tool: toolCalls[index].name,
    success: !("error" in result),
    data: result,
  }));
}
```

### Tool Result Caching

```typescript
class CachedMCPClient extends MCPClient {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private ttl = 60000; // 1 minute

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<any> {
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log("Cache hit for", cacheKey);
      return cached.result;
    }

    const result = await super.callTool(name, args);

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

## Error Handling

### Comprehensive Error Handler

```typescript
enum MCPErrorType {
  CONNECTION_FAILED = "CONNECTION_FAILED",
  TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
  INVALID_ARGUMENTS = "INVALID_ARGUMENTS",
  EXECUTION_ERROR = "EXECUTION_ERROR",
  TIMEOUT = "TIMEOUT",
}

class MCPError extends Error {
  constructor(
    public type: MCPErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "MCPError";
  }
}

async function safeToolCall(
  client: MCPClient,
  toolName: string,
  args: Record<string, unknown>
) {
  try {
    const result = await Promise.race([
      client.callTool(toolName, args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 30000)
      ),
    ]);

    return { success: true, data: result };
  } catch (error) {
    const err = error as Error;

    if (err.message.includes("Timeout")) {
      throw new MCPError(
        MCPErrorType.TIMEOUT,
        `Tool ${toolName} timed out after 30s`,
        err
      );
    }

    if (err.message.includes("Unknown tool")) {
      throw new MCPError(
        MCPErrorType.TOOL_NOT_FOUND,
        `Tool ${toolName} not found`,
        err
      );
    }

    if (err.message.includes("Invalid arguments")) {
      throw new MCPError(
        MCPErrorType.INVALID_ARGUMENTS,
        `Invalid arguments for ${toolName}`,
        err
      );
    }

    throw new MCPError(
      MCPErrorType.EXECUTION_ERROR,
      `Error executing ${toolName}: ${err.message}`,
      err
    );
  }
}
```

## Connection Management

### Auto-Reconnect Client

```typescript
class ResilientMCPClient extends MCPClient {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(serverCommand: string, serverArgs: string[] = []) {
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await super.connect(serverCommand, serverArgs);
        this.reconnectAttempts = 0; // Reset on success
        return;
      } catch (error) {
        this.reconnectAttempts++;
        console.error(
          `Connection attempt ${this.reconnectAttempts} failed:`,
          error
        );

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to connect after ${this.maxReconnectAttempts} attempts`
    );
  }
}
```

### Connection Pool

```typescript
class MCPConnectionPool {
  private pool: MCPClient[] = [];
  private available: MCPClient[] = [];
  private size: number;

  constructor(
    private serverCommand: string,
    private serverArgs: string[],
    poolSize = 3
  ) {
    this.size = poolSize;
  }

  async initialize() {
    for (let i = 0; i < this.size; i++) {
      const client = new MCPClient();
      await client.connect(this.serverCommand, this.serverArgs);
      this.pool.push(client);
      this.available.push(client);
    }
  }

  async acquire(): Promise<MCPClient> {
    if (this.available.length === 0) {
      // Wait for a client to become available
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.acquire();
    }

    return this.available.pop()!;
  }

  release(client: MCPClient) {
    this.available.push(client);
  }

  async destroy() {
    for (const client of this.pool) {
      await client.disconnect();
    }
    this.pool = [];
    this.available = [];
  }

  async withClient<T>(
    fn: (client: MCPClient) => Promise<T>
  ): Promise<T> {
    const client = await this.acquire();
    try {
      return await fn(client);
    } finally {
      this.release(client);
    }
  }
}
```

## Resource Reading Patterns

### Resource Subscription

```typescript
class ResourceWatcher {
  private watchers = new Map<string, NodeJS.Timer>();

  watch(
    client: MCPClient,
    uri: string,
    callback: (content: any) => void,
    interval = 5000
  ) {
    if (this.watchers.has(uri)) {
      return; // Already watching
    }

    const timer = setInterval(async () => {
      try {
        const content = await client.readResource(uri);
        callback(content);
      } catch (error) {
        console.error(`Error reading resource ${uri}:`, error);
      }
    }, interval);

    this.watchers.set(uri, timer);
  }

  unwatch(uri: string) {
    const timer = this.watchers.get(uri);
    if (timer) {
      clearInterval(timer);
      this.watchers.delete(uri);
    }
  }

  unwatchAll() {
    for (const timer of this.watchers.values()) {
      clearInterval(timer);
    }
    this.watchers.clear();
  }
}
```

## Testing

```typescript
// test/client.test.ts
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { MCPClient } from "../src/client.js";

describe("MCP Client", () => {
  let client: MCPClient;

  beforeEach(async () => {
    client = new MCPClient();
    await client.connect("node", ["./test-server/build/index.js"]);
  });

  afterEach(async () => {
    await client.disconnect();
  });

  test("lists available tools", async () => {
    const tools = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0]).toHaveProperty("name");
    expect(tools[0]).toHaveProperty("description");
  });

  test("calls tool successfully", async () => {
    const result = await client.callTool("echo", { message: "hello" });
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("hello");
  });

  test("handles tool errors gracefully", async () => {
    const result = await client.callTool("failing_tool", {});
    expect(result.isError).toBe(true);
  });

  test("reads resources", async () => {
    const resources = await client.listResources();
    expect(resources.length).toBeGreaterThan(0);

    const content = await client.readResource(resources[0].uri);
    expect(content).toBeDefined();
  });
});
```

## Best Practices

1. **Connection Lifecycle**: Always disconnect clients when done
2. **Error Handling**: Handle all possible error scenarios
3. **Timeouts**: Implement timeouts for all operations
4. **Retry Logic**: Use exponential backoff for retries
5. **Caching**: Cache tool results when appropriate
6. **Connection Pooling**: Use pools for high-throughput scenarios
7. **Resource Cleanup**: Clean up resources in finally blocks
8. **Type Safety**: Use TypeScript schemas for validation
9. **Logging**: Log all client operations for debugging
10. **Testing**: Test both success and failure scenarios

## Integration Checklist

- [ ] Client connects to server successfully
- [ ] Tools are discovered correctly
- [ ] Tool arguments are validated
- [ ] Results are parsed properly
- [ ] Errors are handled gracefully
- [ ] Connection cleanup on exit
- [ ] Timeout handling implemented
- [ ] Retry logic for failures
- [ ] Resource management correct
- [ ] Tests cover all scenarios
