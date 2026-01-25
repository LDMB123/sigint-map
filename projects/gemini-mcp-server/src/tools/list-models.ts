import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GeminiClient } from "../gemini-client.js";
import { successResponse, errorResponse } from "./response-helpers.js";

export function registerListModelsTool(
  server: McpServer,
  client: GeminiClient
): void {
  server.tool(
    "list_models",
    "List all available Gemini models with their names and descriptions.",
    {},
    async () => {
      try {
        const models = await client.listModels();
        return successResponse({ models, count: models.length });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
