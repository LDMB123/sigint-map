import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GeminiClient } from "../gemini-client.js";
import { successResponse, errorResponse } from "./response-helpers.js";

export function registerGenerateTextTool(
  server: McpServer,
  client: GeminiClient
): void {
  server.tool(
    "generate_text",
    "Generate text using Google Gemini models. Supports various Gemini models for text generation tasks.",
    {
      prompt: z.string().describe("The text prompt to send to Gemini"),
      model: z
        .string()
        .default("gemini-2.5-flash")
        .describe("The Gemini model to use (default: gemini-2.5-flash)"),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe("Controls randomness (0-2, default: 1.0)"),
      maxOutputTokens: z
        .number()
        .positive()
        .optional()
        .describe("Maximum tokens in the response"),
      systemInstruction: z
        .string()
        .optional()
        .describe("Optional system instruction to guide the model's behavior"),
    },
    async ({ prompt, model, temperature, maxOutputTokens, systemInstruction }) => {
      try {
        const config = {
          ...(temperature !== undefined && { temperature }),
          ...(maxOutputTokens !== undefined && { maxOutputTokens }),
          ...(systemInstruction && { systemInstruction }),
        };

        const result = await client.generateContent(
          model,
          prompt,
          Object.keys(config).length > 0 ? config : undefined
        );

        return successResponse({
          text: result.text,
          model,
          usageMetadata: result.usageMetadata,
        });
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
