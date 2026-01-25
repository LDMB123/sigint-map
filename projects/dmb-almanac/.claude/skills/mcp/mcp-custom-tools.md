---
name: mcp-custom-tools
description: Building custom MCP tools with schema definition, validation, composition, and testing
version: 1.0.0
mcp-version: "1.0"
sdk: typescript, python
partner-ready: true
---

# Building Custom MCP Tools

## Overview

Custom MCP tools extend assistant capabilities with domain-specific functionality. This skill covers tool design, implementation, testing, and composition patterns.

## Tool Design Principles

### 1. Single Responsibility
Each tool should do one thing well.

```typescript
// Good: Focused tool
{
  name: "calculate_total",
  description: "Calculate total with tax",
  inputSchema: { /* ... */ }
}

// Bad: Too many responsibilities
{
  name: "process_order",
  description: "Calculate, validate, save, and email order",
  inputSchema: { /* ... */ }
}
```

### 2. Clear Naming
Use descriptive, action-oriented names.

```typescript
// Good
"get_user_profile"
"send_email"
"calculate_distance"

// Bad
"user"
"email"
"calculate"
```

### 3. Detailed Descriptions
Provide clear, complete descriptions.

```typescript
{
  name: "search_products",
  description: "Search products by name, category, or price range. Returns up to 50 results sorted by relevance.",
  inputSchema: { /* ... */ }
}
```

## Tool Schema Definition

### TypeScript Tool Schema

```typescript
// src/schemas/tool-schema.ts
import { z } from "zod";

// Input validation schema
export const CalculateTotalInputSchema = z.object({
  subtotal: z.number().positive(),
  taxRate: z.number().min(0).max(1),
  discountPercent: z.number().min(0).max(100).optional(),
  shippingCost: z.number().min(0).optional(),
});

export type CalculateTotalInput = z.infer<typeof CalculateTotalInputSchema>;

// Tool definition
export const calculateTotalTool = {
  name: "calculate_total",
  description: "Calculate order total including tax, discount, and shipping",
  inputSchema: {
    type: "object" as const,
    properties: {
      subtotal: {
        type: "number",
        description: "Subtotal before tax and discounts",
        minimum: 0,
      },
      taxRate: {
        type: "number",
        description: "Tax rate (0.0 to 1.0)",
        minimum: 0,
        maximum: 1,
      },
      discountPercent: {
        type: "number",
        description: "Discount percentage (0-100)",
        minimum: 0,
        maximum: 100,
      },
      shippingCost: {
        type: "number",
        description: "Shipping cost",
        minimum: 0,
      },
    },
    required: ["subtotal", "taxRate"],
  },
};

// Tool implementation
export async function calculateTotal(
  input: CalculateTotalInput
): Promise<string> {
  // Validate input
  const validated = CalculateTotalInputSchema.parse(input);

  // Calculate
  let total = validated.subtotal;

  // Apply discount
  if (validated.discountPercent) {
    total *= 1 - validated.discountPercent / 100;
  }

  // Add tax
  total *= 1 + validated.taxRate;

  // Add shipping
  if (validated.shippingCost) {
    total += validated.shippingCost;
  }

  return JSON.stringify({
    subtotal: validated.subtotal,
    discount: validated.discountPercent || 0,
    tax: total * validated.taxRate,
    shipping: validated.shippingCost || 0,
    total: Math.round(total * 100) / 100,
  });
}
```

### Complex Input Schemas

```typescript
// Nested objects
export const createUserTool = {
  name: "create_user",
  description: "Create a new user account",
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        format: "email",
        description: "User email address",
      },
      profile: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          age: { type: "number", minimum: 18 },
        },
        required: ["firstName", "lastName"],
      },
      preferences: {
        type: "object",
        properties: {
          notifications: { type: "boolean" },
          theme: { type: "string", enum: ["light", "dark"] },
        },
      },
    },
    required: ["email", "profile"],
  },
};

// Arrays
export const batchProcessTool = {
  name: "batch_process",
  description: "Process multiple items",
  inputSchema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            action: { type: "string", enum: ["create", "update", "delete"] },
            data: { type: "object" },
          },
          required: ["id", "action"],
        },
        minItems: 1,
        maxItems: 100,
      },
    },
    required: ["items"],
  },
};

// Union types with oneOf
export const processPaymentTool = {
  name: "process_payment",
  description: "Process a payment",
  inputSchema: {
    type: "object",
    properties: {
      amount: { type: "number", minimum: 0 },
      method: {
        oneOf: [
          {
            type: "object",
            properties: {
              type: { type: "string", const: "card" },
              cardNumber: { type: "string" },
              expiryDate: { type: "string" },
              cvv: { type: "string" },
            },
            required: ["type", "cardNumber", "expiryDate", "cvv"],
          },
          {
            type: "object",
            properties: {
              type: { type: "string", const: "paypal" },
              email: { type: "string", format: "email" },
            },
            required: ["type", "email"],
          },
        ],
      },
    },
    required: ["amount", "method"],
  },
};
```

## Input Validation

```typescript
// src/validation.ts
import { z } from "zod";

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodIssue[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errorMessages = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );

    throw new ValidationError(
      `Validation failed:\n${errorMessages.join("\n")}`,
      result.error.issues
    );
  }

  return result.data;
}

// Custom validators
export const emailSchema = z.string().email();
export const urlSchema = z.string().url();
export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().datetime();

// Custom validation rules
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number");

// Conditional validation
export const orderSchema = z
  .object({
    type: z.enum(["delivery", "pickup"]),
    address: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "delivery") {
        return !!data.address;
      }
      return true;
    },
    {
      message: "Address is required for delivery orders",
      path: ["address"],
    }
  );
```

## Output Formatting

```typescript
// src/formatters.ts
export interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export function formatSuccess(data: any, metadata?: Record<string, any>): string {
  const response: ToolResponse = {
    success: true,
    data,
    metadata,
  };
  return JSON.stringify(response, null, 2);
}

export function formatError(error: Error | string): string {
  const response: ToolResponse = {
    success: false,
    error: error instanceof Error ? error.message : error,
  };
  return JSON.stringify(response, null, 2);
}

// Structured output
export class OutputBuilder {
  private sections: Array<{ title: string; content: string }> = [];

  addSection(title: string, content: string) {
    this.sections.push({ title, content });
    return this;
  }

  addTable(title: string, rows: any[][]) {
    const table = this.formatTable(rows);
    this.sections.push({ title, content: table });
    return this;
  }

  addList(title: string, items: string[]) {
    const list = items.map((item, i) => `${i + 1}. ${item}`).join("\n");
    this.sections.push({ title, content: list });
    return this;
  }

  build(): string {
    return this.sections
      .map((section) => `## ${section.title}\n\n${section.content}`)
      .join("\n\n");
  }

  private formatTable(rows: any[][]): string {
    if (rows.length === 0) return "";

    const widths = rows[0].map((_, i) =>
      Math.max(...rows.map((row) => String(row[i]).length))
    );

    const formatRow = (row: any[]) =>
      row.map((cell, i) => String(cell).padEnd(widths[i])).join(" | ");

    const header = formatRow(rows[0]);
    const separator = widths.map((w) => "-".repeat(w)).join("-+-");
    const body = rows.slice(1).map(formatRow).join("\n");

    return `${header}\n${separator}\n${body}`;
  }
}
```

## Error Handling

```typescript
// src/errors.ts
export enum ToolErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RATE_LIMITED = "RATE_LIMITED",
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class ToolError extends Error {
  constructor(
    public code: ToolErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export function handleToolError(error: unknown): string {
  if (error instanceof ToolError) {
    return formatError({
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ValidationError) {
    return formatError({
      code: ToolErrorCode.VALIDATION_ERROR,
      message: error.message,
      errors: error.errors,
    });
  }

  if (error instanceof Error) {
    return formatError({
      code: ToolErrorCode.INTERNAL_ERROR,
      message: error.message,
    });
  }

  return formatError({
    code: ToolErrorCode.INTERNAL_ERROR,
    message: "An unknown error occurred",
  });
}
```

## Tool Composition

```typescript
// src/composition.ts
export class ToolComposer {
  private tools = new Map<string, Function>();

  register(name: string, fn: Function) {
    this.tools.set(name, fn);
  }

  async execute(name: string, input: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return await tool(input);
  }

  // Compose tools into a workflow
  async executeWorkflow(steps: Array<{ tool: string; input: any }>) {
    const results = [];

    for (const step of steps) {
      const result = await this.execute(step.tool, step.input);
      results.push(result);
    }

    return results;
  }

  // Parallel execution
  async executeParallel(calls: Array<{ tool: string; input: any }>) {
    const promises = calls.map(({ tool, input }) =>
      this.execute(tool, input)
    );
    return await Promise.all(promises);
  }

  // Conditional execution
  async executeConditional(
    condition: () => boolean | Promise<boolean>,
    trueTool: { tool: string; input: any },
    falseTool: { tool: string; input: any }
  ) {
    const shouldExecuteTrue = await condition();

    if (shouldExecuteTrue) {
      return await this.execute(trueTool.tool, trueTool.input);
    } else {
      return await this.execute(falseTool.tool, falseTool.input);
    }
  }
}

// Example workflow
const composer = new ToolComposer();

composer.register("fetch_data", fetchData);
composer.register("transform_data", transformData);
composer.register("save_data", saveData);

// Sequential workflow
const workflow = await composer.executeWorkflow([
  { tool: "fetch_data", input: { source: "api" } },
  { tool: "transform_data", input: { format: "json" } },
  { tool: "save_data", input: { destination: "database" } },
]);
```

## Testing Tools

```typescript
// test/tools.test.ts
import { describe, test, expect } from "vitest";
import { calculateTotal, CalculateTotalInputSchema } from "../src/tools/calculate";

describe("calculate_total tool", () => {
  test("calculates total with tax", () => {
    const input = {
      subtotal: 100,
      taxRate: 0.1,
    };

    const result = JSON.parse(calculateTotal(input));

    expect(result.total).toBe(110);
    expect(result.tax).toBe(10);
  });

  test("applies discount correctly", () => {
    const input = {
      subtotal: 100,
      taxRate: 0.1,
      discountPercent: 10,
    };

    const result = JSON.parse(calculateTotal(input));

    expect(result.total).toBe(99); // (100 - 10%) * 1.1
  });

  test("validates input schema", () => {
    const invalidInput = {
      subtotal: -10, // Negative not allowed
      taxRate: 0.1,
    };

    expect(() => {
      CalculateTotalInputSchema.parse(invalidInput);
    }).toThrow();
  });

  test("handles missing optional parameters", () => {
    const input = {
      subtotal: 100,
      taxRate: 0.1,
      // No discount or shipping
    };

    const result = JSON.parse(calculateTotal(input));

    expect(result.discount).toBe(0);
    expect(result.shipping).toBe(0);
  });
});
```

## Tool Documentation

```typescript
// src/tools/README.md generator
export interface ToolDocumentation {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  examples: Array<{
    input: any;
    output: any;
  }>;
}

export function generateToolDocs(tool: any): string {
  const doc: ToolDocumentation = extractDocumentation(tool);

  return `
# ${doc.name}

${doc.description}

## Parameters

${doc.parameters.map(p => `
- **${p.name}** (${p.type})${p.required ? ' *required*' : ''}: ${p.description}
`).join('')}

## Examples

${doc.examples.map((ex, i) => `
### Example ${i + 1}

Input:
\`\`\`json
${JSON.stringify(ex.input, null, 2)}
\`\`\`

Output:
\`\`\`json
${JSON.stringify(ex.output, null, 2)}
\`\`\`
`).join('\n')}
`;
}
```

## Tool Registry

```typescript
// src/registry.ts
export interface ToolMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
  inputSchema: any;
  handler: (input: any) => Promise<string>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolMetadata>();

  register(metadata: ToolMetadata) {
    if (this.tools.has(metadata.name)) {
      throw new Error(`Tool ${metadata.name} already registered`);
    }

    this.tools.set(metadata.name, metadata);
  }

  get(name: string): ToolMetadata | undefined {
    return this.tools.get(name);
  }

  list(tags?: string[]): ToolMetadata[] {
    let tools = Array.from(this.tools.values());

    if (tags && tags.length > 0) {
      tools = tools.filter((tool) =>
        tags.some((tag) => tool.tags?.includes(tag))
      );
    }

    return tools;
  }

  async execute(name: string, input: any): Promise<string> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new ToolError(
        ToolErrorCode.NOT_FOUND,
        `Tool ${name} not found`
      );
    }

    try {
      return await tool.handler(input);
    } catch (error) {
      return handleToolError(error);
    }
  }
}

// Usage
const registry = new ToolRegistry();

registry.register({
  name: "calculate_total",
  description: "Calculate order total",
  version: "1.0.0",
  tags: ["finance", "calculation"],
  inputSchema: calculateTotalTool.inputSchema,
  handler: calculateTotal,
});
```

## Performance Optimization

```typescript
// src/performance.ts
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Async memoization
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttl: number = 60000
): T {
  const cache = new Map<string, { value: any; expires: number }>();

  return (async (...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expires) {
      return cached.value;
    }

    const result = await fn(...args);

    cache.set(key, {
      value: result,
      expires: Date.now() + ttl,
    });

    return result;
  }) as T;
}

// Debouncing
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;

  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
```

## Best Practices

1. **Schema Design**: Use detailed, precise JSON schemas
2. **Validation**: Always validate inputs before processing
3. **Error Handling**: Return structured, helpful errors
4. **Documentation**: Provide clear descriptions and examples
5. **Testing**: Write comprehensive unit tests
6. **Performance**: Cache expensive operations
7. **Composition**: Design tools to be composable
8. **Versioning**: Version your tools for compatibility
9. **Security**: Validate and sanitize all inputs
10. **Monitoring**: Track tool usage and errors

## Tool Development Checklist

- [ ] Clear, descriptive tool name
- [ ] Comprehensive description
- [ ] Detailed input schema with types
- [ ] Required vs optional parameters defined
- [ ] Input validation implemented
- [ ] Error handling with clear messages
- [ ] Output formatting consistent
- [ ] Unit tests written
- [ ] Integration tests added
- [ ] Documentation generated
- [ ] Examples provided
- [ ] Performance optimized
- [ ] Security reviewed
- [ ] Versioned appropriately
- [ ] Registered in tool registry
