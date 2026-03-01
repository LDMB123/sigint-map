# Gemini MCP Server

MCP server exposing Google Gemini API as tools.

## Project Scope

**This project is ONLY the Gemini MCP server.** Do not reference, suggest, or pull context from any other workspace project (dmb-almanac, emerson-violin-pwa, blaires-kind-heart, imagen-experiments).

## Quick Start

```bash
npm install
npm run build   # Compile TypeScript
npm run dev     # Watch mode
npm start       # Run server
npm run inspect # MCP inspector
```

## Tools Exposed

- `generate-text` — single-turn text generation
- `chat` — multi-turn conversation with session management
- `embed-text` — generate text embeddings
- `list-models` — list available Gemini models
- `count-tokens` — count tokens for a prompt

## Tech Stack

- TypeScript, Node.js >= 20.0.0
- MCP SDK (`@modelcontextprotocol/sdk@^1.12.0`)
- Google Gemini API (`@google/genai`)
- Zod — request/response schema validation

## Key Details

- Requires `GEMINI_API_KEY` env var
- Rate limiting: 10 requests/minute with automatic backoff
- Chat sessions: max 100 sessions, 1-hour TTL
- Entry point: `src/index.ts`
- Gemini client: `src/gemini-client.ts`
- Tools dir: `src/tools/`
