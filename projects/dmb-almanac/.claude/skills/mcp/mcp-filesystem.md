---
name: mcp-filesystem
description: File system operations via MCP with security, sandboxing, and efficient file operations
version: 1.0.0
mcp-version: "1.0"
sdk: typescript, python
partner-ready: true
---

# MCP Filesystem Integration

## Overview

Filesystem MCP servers provide secure, sandboxed access to file operations. This skill covers implementing file operations with proper security and permission handling.

## Architecture

```
┌─────────────────────────────────────┐
│      MCP Filesystem Server          │
│  ┌───────────────────────────────┐  │
│  │    Security Layer             │  │
│  │  - Path validation            │  │
│  │  - Sandbox enforcement        │  │
│  │  - Permission checks          │  │
│  └──────────┬────────────────────┘  │
│  ┌──────────▼────────────────────┐  │
│  │    File Operations            │  │
│  │  - Read/Write                 │  │
│  │  - Directory ops              │  │
│  │  - Search                     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Basic Filesystem Server

### TypeScript Implementation

```typescript
// src/filesystem-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

// Configuration
const ALLOWED_DIRECTORIES = [
  "/workspace",
  "/home/user/projects",
].map(p => path.resolve(p));

// Security: Validate path is within allowed directories
function validatePath(requestedPath: string): string {
  const resolved = path.resolve(requestedPath);

  const isAllowed = ALLOWED_DIRECTORIES.some(dir =>
    resolved.startsWith(dir + path.sep) || resolved === dir
  );

  if (!isAllowed) {
    throw new Error(
      `Access denied: ${requestedPath} is outside allowed directories`
    );
  }

  return resolved;
}

const server = new Server(
  {
    name: "filesystem-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: "read_file",
    description: "Read contents of a file",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path to read",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path to write",
        },
        content: {
          type: "string",
          description: "Content to write",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List files in a directory",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path",
        },
        recursive: {
          type: "boolean",
          description: "Recursively list subdirectories",
          default: false,
        },
      },
      required: ["path"],
    },
  },
  {
    name: "create_directory",
    description: "Create a new directory",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path to create",
        },
        recursive: {
          type: "boolean",
          description: "Create parent directories if needed",
          default: true,
        },
      },
      required: ["path"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file or directory",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to delete",
        },
        recursive: {
          type: "boolean",
          description: "Recursively delete directories",
          default: false,
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description: "Search for files matching a pattern",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory to search in",
        },
        pattern: {
          type: "string",
          description: "Search pattern (glob or regex)",
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return",
          default: 100,
        },
      },
      required: ["path", "pattern"],
    },
  },
  {
    name: "get_file_info",
    description: "Get file metadata",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path",
        },
      },
      required: ["path"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "read_file": {
        const filePath = validatePath(args.path as string);
        const content = await fs.readFile(filePath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "write_file": {
        const filePath = validatePath(args.path as string);
        await fs.writeFile(filePath, args.content as string, "utf-8");
        return {
          content: [
            { type: "text", text: `Successfully wrote to ${filePath}` },
          ],
        };
      }

      case "list_directory": {
        const dirPath = validatePath(args.path as string);
        const recursive = args.recursive as boolean;

        const files = recursive
          ? await listDirectoryRecursive(dirPath)
          : await fs.readdir(dirPath);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(files, null, 2),
            },
          ],
        };
      }

      case "create_directory": {
        const dirPath = validatePath(args.path as string);
        const recursive = args.recursive !== false;

        await fs.mkdir(dirPath, { recursive });
        return {
          content: [
            { type: "text", text: `Created directory ${dirPath}` },
          ],
        };
      }

      case "delete_file": {
        const targetPath = validatePath(args.path as string);
        const recursive = args.recursive as boolean;

        const stats = await fs.stat(targetPath);
        if (stats.isDirectory()) {
          await fs.rm(targetPath, { recursive, force: true });
        } else {
          await fs.unlink(targetPath);
        }

        return {
          content: [{ type: "text", text: `Deleted ${targetPath}` }],
        };
      }

      case "search_files": {
        const searchPath = validatePath(args.path as string);
        const pattern = args.pattern as string;
        const maxResults = (args.maxResults as number) || 100;

        const results = await searchFiles(searchPath, pattern, maxResults);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_file_info": {
        const filePath = validatePath(args.path as string);
        const stats = await fs.stat(filePath);

        const info = {
          path: filePath,
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          permissions: stats.mode.toString(8),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});

// Helper functions
async function listDirectoryRecursive(
  dir: string,
  basePath = ""
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listDirectoryRecursive(
        path.join(dir, entry.name),
        relativePath
      );
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

async function searchFiles(
  dir: string,
  pattern: string,
  maxResults: number
): Promise<string[]> {
  const results: string[] = [];
  const regex = new RegExp(pattern);

  async function search(currentDir: string) {
    if (results.length >= maxResults) return;

    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      const fullPath = path.join(currentDir, entry.name);

      if (regex.test(entry.name)) {
        results.push(fullPath);
      }

      if (entry.isDirectory()) {
        await search(fullPath);
      }
    }
  }

  await search(dir);
  return results;
}

// Resources: Expose directories as resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = ALLOWED_DIRECTORIES.map((dir) => ({
    uri: `file://${dir}`,
    name: path.basename(dir),
    description: `Files in ${dir}`,
    mimeType: "application/x-directory",
  }));

  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (!uri.startsWith("file://")) {
    throw new Error("Invalid resource URI");
  }

  const dirPath = validatePath(uri.slice(7));
  const files = await fs.readdir(dirPath);

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(files, null, 2),
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Filesystem MCP Server running");
}

main();
```

## Python Filesystem Server

```python
# src/filesystem_server.py
import os
import json
import re
from pathlib import Path
from typing import Any, Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Configuration
ALLOWED_DIRECTORIES = [
    Path("/workspace").resolve(),
    Path("/home/user/projects").resolve(),
]

def validate_path(requested_path: str) -> Path:
    """Validate path is within allowed directories"""
    resolved = Path(requested_path).resolve()

    is_allowed = any(
        resolved == allowed or str(resolved).startswith(str(allowed) + os.sep)
        for allowed in ALLOWED_DIRECTORIES
    )

    if not is_allowed:
        raise ValueError(
            f"Access denied: {requested_path} is outside allowed directories"
        )

    return resolved

# Create server
app = Server("filesystem-server")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="read_file",
            description="Read contents of a file",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path to read"}
                },
                "required": ["path"],
            },
        ),
        Tool(
            name="write_file",
            description="Write content to a file",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File path to write"},
                    "content": {"type": "string", "description": "Content to write"},
                },
                "required": ["path", "content"],
            },
        ),
        Tool(
            name="list_directory",
            description="List files in a directory",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory path"},
                    "recursive": {
                        "type": "boolean",
                        "description": "Recursively list subdirectories",
                        "default": False,
                    },
                },
                "required": ["path"],
            },
        ),
        Tool(
            name="search_files",
            description="Search for files matching a pattern",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Directory to search"},
                    "pattern": {"type": "string", "description": "Regex pattern"},
                    "max_results": {
                        "type": "number",
                        "description": "Maximum results",
                        "default": 100,
                    },
                },
                "required": ["path", "pattern"],
            },
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    try:
        if name == "read_file":
            file_path = validate_path(arguments["path"])
            content = file_path.read_text(encoding="utf-8")
            return [TextContent(type="text", text=content)]

        elif name == "write_file":
            file_path = validate_path(arguments["path"])
            file_path.write_text(arguments["content"], encoding="utf-8")
            return [TextContent(type="text", text=f"Wrote to {file_path}")]

        elif name == "list_directory":
            dir_path = validate_path(arguments["path"])
            recursive = arguments.get("recursive", False)

            if recursive:
                files = [
                    str(p.relative_to(dir_path))
                    for p in dir_path.rglob("*")
                    if p.is_file()
                ]
            else:
                files = [p.name for p in dir_path.iterdir()]

            return [TextContent(type="text", text=json.dumps(files, indent=2))]

        elif name == "search_files":
            search_path = validate_path(arguments["path"])
            pattern = re.compile(arguments["pattern"])
            max_results = arguments.get("max_results", 100)

            results = []
            for root, dirs, files in os.walk(search_path):
                for file in files:
                    if len(results) >= max_results:
                        break
                    if pattern.search(file):
                        results.append(os.path.join(root, file))

            return [TextContent(type="text", text=json.dumps(results, indent=2))]

        else:
            raise ValueError(f"Unknown tool: {name}")

    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]

async def main():
    async with stdio_server() as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

## File Watching

```typescript
// src/file-watcher.ts
import { watch } from "fs";
import { EventEmitter } from "events";

export class FileWatcher extends EventEmitter {
  private watchers = new Map<string, ReturnType<typeof watch>>();

  watchFile(filePath: string) {
    if (this.watchers.has(filePath)) {
      return; // Already watching
    }

    const watcher = watch(filePath, (eventType, filename) => {
      this.emit("change", {
        path: filePath,
        eventType,
        timestamp: Date.now(),
      });
    });

    this.watchers.set(filePath, watcher);
  }

  unwatchFile(filePath: string) {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
    }
  }

  unwatchAll() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

// Integrate with MCP server
const watcher = new FileWatcher();

watcher.on("change", (event) => {
  console.error(`File changed: ${event.path}`);
  // Could send notification to client if MCP supports it
});

// Add watch_file tool
const watchFileTool = {
  name: "watch_file",
  description: "Watch a file for changes",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      action: { type: "string", enum: ["start", "stop"] },
    },
    required: ["path", "action"],
  },
};
```

## Advanced Search with Filters

```typescript
// src/search.ts
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const SearchOptionsSchema = z.object({
  path: z.string(),
  pattern: z.string(),
  fileType: z.enum(["file", "directory", "all"]).optional(),
  minSize: z.number().optional(),
  maxSize: z.number().optional(),
  modifiedAfter: z.string().datetime().optional(),
  modifiedBefore: z.string().datetime().optional(),
  maxDepth: z.number().int().min(1).optional(),
  maxResults: z.number().int().min(1).max(10000).default(100),
});

type SearchOptions = z.infer<typeof SearchOptionsSchema>;

interface SearchResult {
  path: string;
  type: "file" | "directory";
  size: number;
  modified: Date;
  depth: number;
}

export async function advancedSearch(
  options: SearchOptions
): Promise<SearchResult[]> {
  const opts = SearchOptionsSchema.parse(options);
  const results: SearchResult[] = [];
  const pattern = new RegExp(opts.pattern);

  async function search(
    currentPath: string,
    depth = 0
  ): Promise<void> {
    if (results.length >= opts.maxResults) return;
    if (opts.maxDepth && depth > opts.maxDepth) return;

    const entries = await fs.readdir(currentPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (results.length >= opts.maxResults) break;

      const fullPath = path.join(currentPath, entry.name);

      // Check pattern match
      if (!pattern.test(entry.name)) continue;

      // Get stats
      const stats = await fs.stat(fullPath);

      // Filter by type
      if (opts.fileType === "file" && !stats.isFile()) continue;
      if (opts.fileType === "directory" && !stats.isDirectory()) continue;

      // Filter by size
      if (opts.minSize && stats.size < opts.minSize) continue;
      if (opts.maxSize && stats.size > opts.maxSize) continue;

      // Filter by modification time
      if (opts.modifiedAfter) {
        const after = new Date(opts.modifiedAfter);
        if (stats.mtime < after) continue;
      }
      if (opts.modifiedBefore) {
        const before = new Date(opts.modifiedBefore);
        if (stats.mtime > before) continue;
      }

      // Add to results
      results.push({
        path: fullPath,
        type: stats.isFile() ? "file" : "directory",
        size: stats.size,
        modified: stats.mtime,
        depth,
      });

      // Recurse into directories
      if (entry.isDirectory()) {
        await search(fullPath, depth + 1);
      }
    }
  }

  await search(opts.path);
  return results;
}
```

## Permission Handling

```typescript
// src/permissions.ts
import fs from "fs/promises";

export enum Permission {
  READ = 4,
  WRITE = 2,
  EXECUTE = 1,
}

export async function checkPermission(
  filePath: string,
  permission: Permission
): Promise<boolean> {
  try {
    await fs.access(filePath, permission);
    return true;
  } catch {
    return false;
  }
}

export async function setPermissions(
  filePath: string,
  mode: number
): Promise<void> {
  await fs.chmod(filePath, mode);
}

// Tool integration
const permissionTool = {
  name: "check_permission",
  description: "Check if a file has specific permissions",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      permission: {
        type: "string",
        enum: ["read", "write", "execute"],
      },
    },
    required: ["path", "permission"],
  },
};

async function handlePermissionCheck(args: any) {
  const permMap = {
    read: Permission.READ,
    write: Permission.WRITE,
    execute: Permission.EXECUTE,
  };

  const hasPermission = await checkPermission(
    args.path,
    permMap[args.permission as keyof typeof permMap]
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ hasPermission }),
      },
    ],
  };
}
```

## Sandboxing Strategies

```typescript
// src/sandbox.ts
import path from "path";
import { createHash } from "crypto";

export class FilesystemSandbox {
  private allowedPaths: Set<string>;
  private deniedPatterns: RegExp[];
  private operationLog: Array<{
    operation: string;
    path: string;
    timestamp: Date;
    allowed: boolean;
  }> = [];

  constructor(
    allowedDirectories: string[],
    deniedPatterns: string[] = []
  ) {
    this.allowedPaths = new Set(
      allowedDirectories.map((p) => path.resolve(p))
    );
    this.deniedPatterns = deniedPatterns.map((p) => new RegExp(p));
  }

  validatePath(requestedPath: string): { valid: boolean; reason?: string } {
    const resolved = path.resolve(requestedPath);

    // Check if path is in allowed directories
    const isInAllowed = Array.from(this.allowedPaths).some(
      (allowed) =>
        resolved === allowed ||
        resolved.startsWith(allowed + path.sep)
    );

    if (!isInAllowed) {
      this.logOperation("validate", requestedPath, false);
      return {
        valid: false,
        reason: "Path is outside allowed directories",
      };
    }

    // Check denied patterns
    for (const pattern of this.deniedPatterns) {
      if (pattern.test(resolved)) {
        this.logOperation("validate", requestedPath, false);
        return {
          valid: false,
          reason: `Path matches denied pattern: ${pattern}`,
        };
      }
    }

    this.logOperation("validate", requestedPath, true);
    return { valid: true };
  }

  private logOperation(
    operation: string,
    path: string,
    allowed: boolean
  ) {
    this.operationLog.push({
      operation,
      path,
      timestamp: new Date(),
      allowed,
    });

    // Keep only last 1000 operations
    if (this.operationLog.length > 1000) {
      this.operationLog.shift();
    }
  }

  getAuditLog() {
    return [...this.operationLog];
  }

  addAllowedPath(dirPath: string) {
    this.allowedPaths.add(path.resolve(dirPath));
  }

  removeAllowedPath(dirPath: string) {
    this.allowedPaths.delete(path.resolve(dirPath));
  }
}

// Usage in server
const sandbox = new FilesystemSandbox(
  ["/workspace", "/home/user/projects"],
  [
    "\\.env$",           // Deny .env files
    "\\.git/",           // Deny .git directories
    "node_modules/",     // Deny node_modules
    "\\.ssh/",           // Deny SSH keys
  ]
);

function validatePath(requestedPath: string): string {
  const result = sandbox.validatePath(requestedPath);
  if (!result.valid) {
    throw new Error(result.reason);
  }
  return path.resolve(requestedPath);
}
```

## Best Practices

1. **Security First**: Always validate and sanitize paths
2. **Sandboxing**: Restrict access to allowed directories only
3. **Error Handling**: Provide clear error messages for permission issues
4. **Performance**: Use streaming for large files
5. **Logging**: Audit all file operations
6. **Permissions**: Check and respect file system permissions
7. **Encoding**: Always specify encoding (usually utf-8)
8. **Path Handling**: Use path.resolve() and path.join() correctly
9. **Resource Cleanup**: Close file handles properly
10. **Rate Limiting**: Prevent abuse with rate limits

## Security Checklist

- [ ] Path validation prevents directory traversal
- [ ] Only allowed directories are accessible
- [ ] Sensitive files are explicitly denied
- [ ] File operations are logged for audit
- [ ] Proper error messages (no path disclosure)
- [ ] File size limits enforced
- [ ] Operation rate limiting implemented
- [ ] Permissions checked before operations
- [ ] Symlinks handled securely
- [ ] Binary files handled appropriately
