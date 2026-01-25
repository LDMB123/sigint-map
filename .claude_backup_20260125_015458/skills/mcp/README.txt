# MCP (Model Context Protocol) Skills

Comprehensive skills for building and integrating with Model Context Protocol servers for partner integrations.

## Overview

The Model Context Protocol (MCP) enables AI assistants to securely interact with external systems through a standardized interface. These skills cover everything from basic server setup to advanced security patterns.

## Skills Index

### 1. [MCP Server Setup](./mcp-server-setup.md)
**Creating MCP servers from scratch**

- MCP server architecture and design patterns
- TypeScript and Python SDK setup
- Tool, resource, and prompt definitions
- Server configuration and transport mechanisms
- stdio vs HTTP/SSE transport
- Error handling and logging
- Production deployment patterns

**Key Topics:** Server initialization, tool definitions, resource providers, transport layers

---

### 2. [MCP Client Integration](./mcp-client-integration.md)
**Consuming MCP servers from client applications**

- Client SDK usage and initialization
- Server discovery and configuration
- Tool invocation patterns
- Resource reading and management
- Connection lifecycle management
- Error handling and retry logic
- Multi-server coordination
- Connection pooling

**Key Topics:** Client setup, tool calling, error handling, connection management

---

### 3. [MCP Filesystem](./mcp-filesystem.md)
**Secure file system operations via MCP**

- Read/write file operations
- Directory traversal and listing
- File search capabilities
- Permission and access control
- Path validation and sandboxing
- File watching and monitoring
- Security best practices

**Key Topics:** File operations, security, sandboxing, path validation

---

### 4. [MCP GitHub Integration](./mcp-github.md)
**GitHub operations through MCP**

- Repository operations (list, create, update)
- Issue management workflows
- Pull request automation
- Code search across repositories
- GitHub Actions integration
- Webhook handling
- GraphQL API usage
- Rate limiting strategies

**Key Topics:** GitHub API, PRs, issues, code search, webhooks

---

### 5. [MCP Database](./mcp-database.md)
**Database access and operations**

- SQL query execution (PostgreSQL, MySQL)
- MongoDB operations
- Schema introspection
- Query validation and safety
- Connection pooling
- Read replicas and failover
- Transaction handling
- Migration support
- Query performance analysis

**Key Topics:** Database queries, connection pooling, schema introspection, migrations

---

### 6. [MCP Browser Automation](./mcp-browser.md)
**Browser control via Puppeteer/Playwright**

- Page navigation and interaction
- Screenshot capture
- DOM interaction and data extraction
- Form filling automation
- Cookie management
- Network interception
- PDF generation
- Testing utilities
- Performance monitoring

**Key Topics:** Browser automation, web scraping, testing, screenshots

---

### 7. [MCP Memory & Knowledge Graph](./mcp-memory.md)
**Persistent knowledge and context management**

- Entity creation and management
- Relationship mapping
- Observation storage
- Context persistence across sessions
- Graph traversal algorithms
- Semantic search with vectors
- Knowledge graph queries
- Context summarization

**Key Topics:** Knowledge graphs, entities, relationships, context persistence

---

### 8. [MCP API Gateway](./mcp-api-gateway.md)
**External API integration patterns**

- REST API wrapping
- GraphQL integration
- Authentication flows (OAuth2, API keys, JWT)
- Rate limiting strategies
- Response caching
- Error transformation
- Retry logic with exponential backoff
- Webhook handling

**Key Topics:** API integration, authentication, rate limiting, caching

---

### 9. [MCP Custom Tools](./mcp-custom-tools.md)
**Building custom MCP tools**

- Tool schema definition with JSON Schema
- Input validation with Zod
- Output formatting patterns
- Error handling strategies
- Tool composition and workflows
- Performance optimization
- Testing custom tools
- Tool documentation generation
- Tool registry patterns

**Key Topics:** Tool development, validation, composition, testing

---

### 10. [MCP Security](./mcp-security.md)
**Security patterns and best practices**

- Authentication (JWT, API keys, OAuth2)
- Authorization (RBAC, ABAC)
- Input sanitization (SQL, XSS, command injection)
- Path traversal prevention
- Secret management and encryption
- Audit logging
- Rate limiting
- Sandboxing strategies
- Security monitoring

**Key Topics:** Authentication, authorization, input validation, audit logging

---

## Quick Start

### 1. Set up an MCP Server

```typescript
// Install dependencies
npm install @modelcontextprotocol/sdk

// Create a basic server
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. Create a Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({
  name: "my-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["./server.js"],
});

await client.connect(transport);
```

### 3. Define a Tool

```typescript
const tools = [{
  name: "get_weather",
  description: "Get weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: { type: "string" },
    },
    required: ["location"],
  },
}];

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_weather") {
    const weather = await fetchWeather(args.location);
    return {
      content: [{ type: "text", text: JSON.stringify(weather) }],
    };
  }
});
```

## Common Patterns

### Authentication Pattern

```typescript
// Server-side
const token = request.params._meta?.authToken;
const user = tokenAuthenticator.verifyToken(token);

// Client-side
await client.callTool("sensitive_operation", {
  _meta: { authToken: myToken },
  // ... other parameters
});
```

### Error Handling Pattern

```typescript
try {
  const result = await executeTool(name, args);
  return { content: [{ type: "text", text: result }] };
} catch (error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true,
  };
}
```

### Caching Pattern

```typescript
const cacheKey = generateCacheKey(toolName, args);
const cached = cache.get(cacheKey);

if (cached) {
  return cached;
}

const result = await executeTool(toolName, args);
cache.set(cacheKey, result, TTL);
return result;
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         AI Assistant (Claude)           │
└──────────────┬──────────────────────────┘
               │ Uses MCP Client
┌──────────────▼──────────────────────────┐
│         MCP Client Library              │
│  - Connection management                │
│  - Tool discovery                       │
│  - Request/response handling            │
└──────────────┬──────────────────────────┘
               │ JSON-RPC over stdio/HTTP
┌──────────────▼──────────────────────────┐
│         MCP Server                      │
│  ┌────────────────────────────────────┐ │
│  │ Security Layer                     │ │
│  │ - Authentication                   │ │
│  │ - Authorization                    │ │
│  │ - Input validation                 │ │
│  └────────────┬───────────────────────┘ │
│  ┌────────────▼───────────────────────┐ │
│  │ Business Logic                     │ │
│  │ - Tools                            │ │
│  │ - Resources                        │ │
│  │ - Prompts                          │ │
│  └────────────┬───────────────────────┘ │
└───────────────┼─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│     External Systems                    │
│  - Databases                            │
│  - APIs                                 │
│  - File systems                         │
│  - Browsers                             │
└─────────────────────────────────────────┘
```

## Best Practices

### Server Development
1. Use TypeScript for type safety
2. Validate all inputs with schemas
3. Implement proper error handling
4. Log operations to stderr (stdout is for protocol)
5. Use semantic versioning
6. Document all tools thoroughly
7. Implement rate limiting
8. Add authentication for sensitive operations

### Client Development
1. Handle connection lifecycle properly
2. Implement retry logic with exponential backoff
3. Cache responses when appropriate
4. Set reasonable timeouts
5. Clean up resources in finally blocks
6. Test both success and failure paths

### Security
1. Never trust client input
2. Use parameterized queries
3. Implement proper authentication
4. Audit all operations
5. Encrypt sensitive data
6. Use principle of least privilege
7. Keep dependencies updated
8. Regular security reviews

### Performance
1. Use connection pooling
2. Implement caching strategically
3. Batch operations when possible
4. Monitor slow operations
5. Set resource limits
6. Use async/await properly
7. Profile and optimize hot paths

## Testing

```typescript
import { describe, test, expect } from "vitest";

describe("MCP Tool", () => {
  test("executes successfully", async () => {
    const result = await client.callTool("my_tool", {
      param: "value",
    });

    expect(result.content[0].text).toContain("expected");
  });

  test("handles errors gracefully", async () => {
    const result = await client.callTool("my_tool", {
      invalid: "input",
    });

    expect(result.isError).toBe(true);
  });
});
```

## Deployment

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

### Environment Configuration

```env
# Server Configuration
MCP_SERVER_NAME=my-server
MCP_SERVER_VERSION=1.0.0

# Authentication
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# External Services
DATABASE_URL=postgresql://user:pass@localhost:5432/db
GITHUB_TOKEN=your-github-token
OPENAI_API_KEY=your-openai-key

# Security
ALLOWED_ORIGINS=https://example.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Resources

### Official Documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)

### Example Servers
- [@modelcontextprotocol/server-github](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- [@modelcontextprotocol/server-filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [@modelcontextprotocol/server-memory](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)

### Community
- [MCP Discord](https://discord.gg/modelcontextprotocol)
- [GitHub Discussions](https://github.com/modelcontextprotocol/discussions)

## Contributing

These skills are living documents. Contributions and improvements are welcome:

1. Identify gaps or outdated information
2. Add new patterns and examples
3. Share production learnings
4. Document edge cases
5. Improve code examples

## License

These skills are provided as educational resources for building MCP integrations.

---

**Version:** 1.0.0
**Last Updated:** January 2026
**MCP Version:** 1.0
