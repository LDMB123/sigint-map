#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGenerateTextTool } from "./tools/generate-text.js";
import { registerChatTools } from "./tools/chat.js";
import { registerEmbedTextTool } from "./tools/embed-text.js";
import { registerListModelsTool } from "./tools/list-models.js";
import { registerCountTokensTool } from "./tools/count-tokens.js";
import { GeminiClient } from "./gemini-client.js";

async function main() {
  // Initialize Gemini client with API key from environment
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is required");
    process.exit(1);
  }

  const geminiClient = new GeminiClient(apiKey);

  // Graceful shutdown handler
  const shutdown = () => {
    console.error("Shutting down Gemini MCP Server...");
    geminiClient.destroy();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Create MCP server
  const server = new McpServer({
    name: "gemini-mcp-server",
    version: "1.0.0",
  });

  // Register all tools
  registerGenerateTextTool(server, geminiClient);
  registerChatTools(server, geminiClient);
  registerEmbedTextTool(server, geminiClient);
  registerListModelsTool(server, geminiClient);
  registerCountTokensTool(server, geminiClient);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (never stdout for MCP stdio servers)
  console.error("Gemini MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
