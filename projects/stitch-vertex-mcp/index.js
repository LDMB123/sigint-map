#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration
const API_KEY = process.env.STITCH_API_KEY;
const STITCH_API_BASE = 'https://stitch.googleapis.com/v1';

if (!API_KEY) {
  console.error('Error: STITCH_API_KEY environment variable is required');
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: 'stitch-vertex-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_design',
        description: 'Generate a UI design using Google Stitch. Creates designs based on text prompts.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Text description of the UI/UX design to generate',
            },
            style: {
              type: 'string',
              description: 'Design style (optional): "modern", "minimal", "playful", etc.',
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'generate_design') {
    try {
      const { prompt, style } = args;

      console.error(`Generating design with Stitch...`);
      console.error(`Prompt: ${prompt}`);

      // Make API request to Stitch
      const response = await fetch(`${STITCH_API_BASE}/designs:generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
        },
        body: JSON.stringify({
          prompt: prompt,
          style: style || 'modern',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Stitch API returned ${response.status}: ${response.statusText}`,
                details: errorText,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              prompt: prompt,
              style: style || 'modern',
              design: data,
              message: 'Design generated successfully',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              details: error.stack,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Stitch MCP server running on stdio');
  console.error(`Using API key: ${API_KEY.substring(0, 10)}...`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
