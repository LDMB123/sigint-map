# Gemini MCP Server

Model Context Protocol (MCP) server for Google Gemini API integration.

## Overview

MCP server that provides Claude Code (and other MCP clients) with access to Google's Gemini AI models.

## Features

- **Gemini API Integration**: Direct access to Google Gemini models
- **MCP Protocol**: Standard Model Context Protocol interface
- **TypeScript**: Type-safe implementation
- **Schema Validation**: Zod-based request/response validation

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["/path/to/gemini-mcp-server/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Development

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Start server
npm start

# Inspect with MCP Inspector
npm run inspect
```

## Project Structure

```
gemini-mcp-server/
├── src/              # TypeScript source
│   └── index.ts      # Main server implementation
├── dist/             # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## Requirements

- Node.js >= 20.0.0
- Google Gemini API key
- MCP client (e.g., Claude Code)

## Environment Variables

- `GEMINI_API_KEY` - Your Google Gemini API key (required)

## Dependencies

- `@google/genai` - Google Generative AI SDK
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Schema validation

## Status

Version 1.0.0 - Production ready
