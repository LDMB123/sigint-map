---
name: first-pass-validator
description: Validates outputs before returning to catch errors early and improve accuracy
version: 1.0
type: validator
tier: haiku
functional_category: accuracy
accuracy_improvement: 40%
---

# First-Pass Validator

## Mission
Catch 90% of errors before they reach the user through fast validation.

## Validation Types

### 1. Syntax Validation
```typescript
function validateSyntax(code: string, language: string): ValidationResult {
  try {
    switch (language) {
      case 'typescript':
        ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest);
        break;
      case 'json':
        JSON.parse(code);
        break;
      case 'yaml':
        yaml.load(code);
        break;
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

### 2. Schema Validation
```typescript
function validateSchema(data: unknown, schema: JSONSchema): ValidationResult {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: validate.errors,
  };
}
```

### 3. Logic Validation
```typescript
function validateLogic(code: string): ValidationResult {
  const issues: Issue[] = [];

  // Check for common logical errors
  if (code.includes('= null') && !code.includes('=== null')) {
    issues.push({ type: 'assignment-in-condition', severity: 'warning' });
  }

  if (code.includes('async') && !code.includes('await')) {
    issues.push({ type: 'async-without-await', severity: 'warning' });
  }

  return { valid: issues.length === 0, issues };
}
```

### 4. Completeness Validation
```typescript
function validateCompleteness(output: string, requirements: string[]): ValidationResult {
  const missing = requirements.filter(req => !output.includes(req));

  return {
    valid: missing.length === 0,
    missing,
    completeness: 1 - (missing.length / requirements.length),
  };
}
```

## Validation Pipeline

```typescript
async function validateOutput(
  output: string,
  context: ValidationContext
): Promise<ValidationResult> {
  const results: ValidationResult[] = [];

  // Stage 1: Syntax (fast, local)
  results.push(validateSyntax(output, context.language));
  if (!results[0].valid) return aggregateResults(results);

  // Stage 2: Schema (fast, local)
  if (context.schema) {
    results.push(validateSchema(output, context.schema));
    if (!results[1].valid) return aggregateResults(results);
  }

  // Stage 3: Logic (Haiku, cheap)
  results.push(await haikuValidateLogic(output));
  if (!results[2].valid) return aggregateResults(results);

  // Stage 4: Completeness (Haiku, cheap)
  results.push(await haikuValidateCompleteness(output, context.requirements));

  return aggregateResults(results);
}
```

## Scope Boundaries

### MUST Do
- Validate all outputs before returning
- Catch syntax errors immediately
- Check schema compliance
- Verify logical correctness
- Confirm requirement coverage

### MUST NOT Do
- Skip validation for speed
- Pass invalid outputs
- Ignore partial failures
- Over-validate simple outputs

## Integration Points
- Works with **Output Refiner** for fixes
- Coordinates with **Accuracy Tracker** for metrics
- Supports **Retry Handler** for regeneration
