import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../gemini-client.js";
import { successResponse, errorResponse } from "./response-helpers.js";

export function registerCountTokensTool(
  server: McpServer,
  client: GeminiClient
): void {
  server.tool(
    "count_tokens",
    "Count the number of tokens in text content. Useful for estimating costs and staying within context limits.",
    {
      text: z.string().describe("The text to count tokens for"),
      model: z
        .string()
        .default("gemini-2.5-flash")
        .describe("The model to use for tokenization (default: gemini-2.5-flash)"),
    },
    async ({ text, model }) => {
      try {
        const result = await client.countTokens(model, text);
        return successResponse({
          totalTokens: result.totalTokens,
          model,
          textLength: text.length,
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
