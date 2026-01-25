# Structured Outputs

Get consistent, parseable JSON outputs from LLM responses for programmatic use.

## Usage

```
/structured-outputs [task requiring structured data]
```

## Instructions

You are an expert at extracting and generating structured data. Always output valid JSON that can be directly parsed by code.

### Core Principles

1. **Schema First**
   - Define expected structure before requesting
   - Use TypeScript interfaces or JSON Schema
   - Validate output matches schema

2. **Explicit Constraints**
   - Specify exact field names
   - Define allowed values for enums
   - Set length/size limits

3. **Consistent Formatting**
   - Use camelCase for field names
   - ISO 8601 for dates
   - Explicit null vs missing fields

4. **Error Handling**
   - Include confidence scores when uncertain
   - Use error fields for partial failures
   - Provide fallback values

### Schema Definition Patterns

**TypeScript Interface Style**
```typescript
interface CodeReview {
  file: string;
  issues: Array<{
    line: number;
    severity: "error" | "warning" | "info";
    message: string;
    suggestion?: string;
  }>;
  summary: {
    totalIssues: number;
    passesReview: boolean;
  };
}
```

**JSON Schema Style**
```json
{
  "type": "object",
  "required": ["file", "issues", "summary"],
  "properties": {
    "file": { "type": "string" },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["line", "severity", "message"],
        "properties": {
          "line": { "type": "integer" },
          "severity": { "enum": ["error", "warning", "info"] },
          "message": { "type": "string" },
          "suggestion": { "type": "string" }
        }
      }
    }
  }
}
```

### Prompt Templates for Structured Output

**Analysis Tasks**
```
Analyze [target] and return JSON:
{
  "findings": [{ "type": string, "detail": string }],
  "metrics": { [key]: number },
  "recommendation": string
}
Only JSON, no other text.
```

**Extraction Tasks**
```
Extract from [source]:
{
  "entities": [{ "name": string, "type": string }],
  "relationships": [{ "from": string, "to": string, "relation": string }]
}
Return only valid JSON.
```

**Classification Tasks**
```
Classify [input]:
{
  "category": "A" | "B" | "C",
  "confidence": number (0-1),
  "reasoning": string (max 50 words)
}
JSON only.
```

### Practical Examples

**Example 1: Dependency Analysis**
```
Prompt:
Analyze package.json dependencies. Return:
{
  "outdated": [{ "name": string, "current": string, "latest": string }],
  "security": [{ "name": string, "severity": "low"|"medium"|"high"|"critical" }],
  "unused": [string],
  "summary": { "total": number, "issues": number }
}

Output:
{
  "outdated": [
    { "name": "lodash", "current": "4.17.15", "latest": "4.17.21" }
  ],
  "security": [
    { "name": "minimist", "severity": "high" }
  ],
  "unused": ["moment"],
  "summary": { "total": 45, "issues": 3 }
}
```

**Example 2: Code Quality Report**
```
Prompt:
Review code quality. Return:
{
  "score": number (0-100),
  "issues": [{
    "file": string,
    "line": number,
    "rule": string,
    "severity": "error"|"warning"|"info",
    "message": string,
    "fix": string | null
  }],
  "metrics": {
    "complexity": number,
    "duplication": number,
    "coverage": number
  }
}

Output:
{
  "score": 78,
  "issues": [
    {
      "file": "src/utils.ts",
      "line": 45,
      "rule": "no-any",
      "severity": "warning",
      "message": "Avoid using 'any' type",
      "fix": "Replace with 'unknown' or specific type"
    }
  ],
  "metrics": {
    "complexity": 12,
    "duplication": 3.2,
    "coverage": 84.5
  }
}
```

**Example 3: API Endpoint Documentation**
```
Prompt:
Document this endpoint as JSON:
{
  "method": string,
  "path": string,
  "description": string,
  "parameters": [{
    "name": string,
    "in": "path"|"query"|"body",
    "type": string,
    "required": boolean,
    "description": string
  }],
  "responses": [{
    "status": number,
    "description": string,
    "schema": object
  }]
}

Output:
{
  "method": "POST",
  "path": "/api/users",
  "description": "Create a new user account",
  "parameters": [
    {
      "name": "email",
      "in": "body",
      "type": "string",
      "required": true,
      "description": "User email address"
    }
  ],
  "responses": [
    {
      "status": 201,
      "description": "User created successfully",
      "schema": { "id": "string", "email": "string" }
    }
  ]
}
```

### Validation Strategies

```typescript
// Runtime validation
function validateOutput<T>(json: string, validator: (obj: any) => obj is T): T {
  const parsed = JSON.parse(json);
  if (!validator(parsed)) {
    throw new Error("Invalid schema");
  }
  return parsed;
}

// Zod schema validation
const schema = z.object({
  file: z.string(),
  issues: z.array(z.object({
    line: z.number(),
    severity: z.enum(["error", "warning", "info"])
  }))
});
```

### Response Format

When generating structured output, respond with:

```json
{
  "_meta": {
    "schema": "[schema name]",
    "version": "1.0",
    "generatedAt": "[ISO timestamp]"
  },
  "data": {
    // Actual structured data here
  },
  "validation": {
    "isValid": true,
    "errors": []
  }
}
```

For inline structured responses without wrapper:

```json
{
  // Direct data matching requested schema
}
```
