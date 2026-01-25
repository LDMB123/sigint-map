import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../gemini-client.js";
import { successResponse, errorResponse } from "./response-helpers.js";

export function registerEmbedTextTool(
  server: McpServer,
  client: GeminiClient
): void {
  server.tool(
    "embed_text",
    "Generate text embeddings using Gemini embedding models. Useful for semantic search, clustering, and similarity comparisons.",
    {
      texts: z
        .union([z.string(), z.array(z.string())])
        .describe("Text or array of texts to embed"),
      model: z
        .string()
        .default("text-embedding-004")
        .describe("The embedding model to use (default: text-embedding-004)"),
    },
    async ({ texts, model }) => {
      try {
        const textArray = Array.isArray(texts) ? texts : [texts];
        const result = await client.embedContent(model, textArray);

        return successResponse({
          embeddings: result.embeddings,
          model,
          inputCount: textArray.length,
          dimensions: result.embeddings[0]?.length ?? 0,
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
