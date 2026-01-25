---
name: type-transformer
description: Transforms code to add, improve, or migrate TypeScript types
version: 1.0
type: transformer
tier: sonnet
functional_category: transformer
---

# Type Transformer

## Mission
Add, improve, and migrate TypeScript types for better type safety.

## Scope Boundaries

### MUST Do
- Infer types from usage
- Convert JS to TypeScript
- Improve type accuracy
- Generate type definitions
- Migrate between type systems

### MUST NOT Do
- Use `any` without justification
- Break existing type contracts
- Remove useful type information
- Ignore generic constraints

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | yes | Code to transform |
| operation | string | yes | add-types, improve, migrate |
| strict_mode | boolean | no | Enable strict typing |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| typed_code | string | Code with types |
| type_definitions | string | Generated .d.ts |
| any_count | number | Remaining any types |

## Correct Patterns

```typescript
interface TypeTransformResult {
  code: string;
  types: string;
  anyCount: number;
  improvements: TypeImprovement[];
}

// Infer types from runtime values
function inferTypeFromValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const itemTypes = [...new Set(value.map(inferTypeFromValue))];
    return itemTypes.length === 1
      ? `${itemTypes[0]}[]`
      : `(${itemTypes.join(' | ')})[]`;
  }
  if (typeof value === 'object') {
    const props = Object.entries(value)
      .map(([k, v]) => `${k}: ${inferTypeFromValue(v)}`)
      .join('; ');
    return `{ ${props} }`;
  }
  return typeof value;
}

// Convert JavaScript to TypeScript
function addTypesToFunction(fn: FunctionNode): string {
  const params = fn.params.map(param => {
    const inferredType = inferParamType(param, fn.body);
    return `${param.name}: ${inferredType}`;
  });

  const returnType = inferReturnType(fn.body);

  return `function ${fn.name}(${params.join(', ')}): ${returnType} {
${fn.body}
}`;
}

// Improve existing types
const TYPE_IMPROVEMENTS = [
  {
    name: 'narrow-any-from-usage',
    pattern: /: any\b/,
    improve: (code: string, location: Location) => {
      // Analyze how the variable is used
      const usages = findUsages(code, location.identifier);
      const operations = usages.map(u => getOperation(u));

      // Infer type from operations
      if (operations.includes('map')) return 'unknown[]';
      if (operations.includes('toLowerCase')) return 'string';
      if (operations.includes('toFixed')) return 'number';
      return 'unknown';
    },
  },

  {
    name: 'union-to-discriminated',
    pattern: /type \w+ = .+ \| .+/,
    improve: (code: string) => {
      // Convert to discriminated union
      return code.replace(
        /type (\w+) = (\w+) \| (\w+)/g,
        (_, name, a, b) =>
          `type ${name} = \n  | { kind: '${a.toLowerCase()}' } & ${a}\n  | { kind: '${b.toLowerCase()}' } & ${b}`
      );
    },
  },

  {
    name: 'object-to-interface',
    pattern: /type \w+ = \{[^}]+\}/,
    improve: (code: string) => {
      return code.replace(
        /type (\w+) = (\{[^}]+\})/g,
        'interface $1 $2'
      );
    },
  },
];

async function transformTypes(
  code: string,
  operation: string,
  options: TypeOptions
): Promise<TypeTransformResult> {
  let result = code;
  const improvements: TypeImprovement[] = [];

  switch (operation) {
    case 'add-types':
      result = addTypesToAll(code);
      break;
    case 'improve':
      for (const rule of TYPE_IMPROVEMENTS) {
        if (rule.pattern.test(result)) {
          result = rule.improve(result);
          improvements.push({ rule: rule.name });
        }
      }
      break;
    case 'strict':
      result = enforceStrictTypes(code);
      break;
  }

  return {
    code: result,
    types: extractTypeDefinitions(result),
    anyCount: (result.match(/: any\b/g) || []).length,
    improvements,
  };
}
```

## Integration Points
- Works with **Type Validator** for verification
- Coordinates with **Code Analyzer** for inference
- Supports **Type Generator** for .d.ts files
