import { z } from "zod";
import { successResponse, errorResponse } from "./response-helpers.js";
export function registerChatTools(server, client) {
    // Create a new chat session
    server.tool("chat_create", "Create a new multi-turn chat session with Gemini. Returns a session ID for subsequent messages.", {
        sessionId: z
            .string()
            .describe("Unique identifier for this chat session"),
        model: z
            .string()
            .default("gemini-2.5-flash")
            .describe("The Gemini model to use (default: gemini-2.5-flash)"),
        systemInstruction: z
            .string()
            .optional()
            .describe("Optional system instruction for the chat"),
    }, async ({ sessionId, model, systemInstruction }) => {
        try {
            client.createChatSession(sessionId, model, systemInstruction);
            return successResponse({
                success: true,
                sessionId,
                model,
                message: "Chat session created successfully",
            });
        }
        catch (error) {
            return errorResponse(error);
        }
    });
    server.tool("chat_send", "Send a message in an existing chat session and get a response. Maintains conversation history.", {
        sessionId: z.string().describe("The chat session ID"),
        message: z.string().describe("The message to send"),
    }, async ({ sessionId, message }) => {
        try {
            const result = await client.sendChatMessage(sessionId, message);
            return successResponse({
                response: result.text,
                sessionId,
                historyLength: result.historyLength,
            });
        }
        catch (error) {
            return errorResponse(error);
        }
    });
    server.tool("chat_history", "Retrieve the conversation history for a chat session.", {
        sessionId: z.string().describe("The chat session ID"),
    }, async ({ sessionId }) => {
        try {
            const history = client.getChatHistory(sessionId);
            return successResponse({
                sessionId,
                history,
                messageCount: history.length,
            });
        }
        catch (error) {
            return errorResponse(error);
        }
    });
    server.tool("chat_list", "List all active chat sessions.", {}, async () => {
        const sessions = client.listChatSessions();
        return successResponse({ sessions, count: sessions.length });
    });
    server.tool("chat_delete", "Delete a chat session and free its resources.", {
        sessionId: z.string().describe("The chat session ID to delete"),
    }, async ({ sessionId }) => {
        const deleted = client.deleteChatSession(sessionId);
        return successResponse({
            success: deleted,
            sessionId,
            message: deleted ? "Session deleted successfully" : "Session not found",
        });
    });
}
