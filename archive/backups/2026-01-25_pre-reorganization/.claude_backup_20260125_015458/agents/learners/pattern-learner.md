---
name: pattern-learner
description: Learns code patterns and conventions from existing codebase
version: 1.0
type: learner
tier: sonnet
functional_category: learner
---

# Pattern Learner

## Mission
Discover and document code patterns and conventions from existing codebases.

## Scope Boundaries

### MUST Do
- Analyze existing code patterns
- Identify naming conventions
- Detect architectural patterns
- Learn error handling approaches
- Document discovered patterns

### MUST NOT Do
- Impose external patterns
- Ignore inconsistencies
- Learn from obviously bad code
- Skip validation of patterns

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| codebase_path | string | yes | Path to analyze |
| focus_areas | array | no | Specific areas to learn |
| min_occurrences | number | no | Minimum pattern frequency |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| patterns | array | Discovered patterns |
| conventions | object | Naming/style conventions |
| recommendations | array | Pattern suggestions |

## Correct Patterns

```typescript
interface DiscoveredPattern {
  name: string;
  category: 'naming' | 'structure' | 'error-handling' | 'async' | 'testing';
  frequency: number;
  confidence: number;
  examples: string[];
  template?: string;
}

const PATTERN_DETECTORS = {
  naming: {
    // Detect component naming
    components: /(?:export\s+(?:default\s+)?(?:function|const)\s+)([A-Z][a-zA-Z]+)/g,
    // Detect hook naming
    hooks: /(?:export\s+(?:function|const)\s+)(use[A-Z][a-zA-Z]+)/g,
    // Detect file naming
    files: /([a-z]+(?:-[a-z]+)*)\.(ts|tsx|js|jsx)$/,
  },

  structure: {
    // Detect barrel exports
    barrelExports: /export \* from/g,
    // Detect feature folders
    featureFolders: /src\/features\/\w+\/(components|hooks|utils)/,
  },

  errorHandling: {
    // Detect try-catch patterns
    tryCatch: /try\s*\{[\s\S]+?\}\s*catch/g,
    // Detect error boundaries
    errorBoundary: /class \w+ extends.*ErrorBoundary|componentDidCatch/,
    // Detect Result type patterns
    resultType: /type Result<T>|Either<|Success<|Failure</,
  },

  async: {
    // Detect async/await usage
    asyncAwait: /async\s+(?:function|\w+\s*=)\s*\([^)]*\)/g,
    // Detect Promise patterns
    promiseAll: /Promise\.all\(/,
    // Detect loading state patterns
    loadingState: /isLoading|loading|pending/,
  },
};

class PatternLearner {
  async learn(path: string, options: LearnOptions): Promise<PatternAnalysis> {
    const files = await this.scanFiles(path);
    const patterns: DiscoveredPattern[] = [];

    // Analyze naming conventions
    const namingPatterns = await this.analyzeNaming(files);
    patterns.push(...namingPatterns);

    // Analyze structure patterns
    const structurePatterns = await this.analyzeStructure(files);
    patterns.push(...structurePatterns);

    // Analyze error handling
    const errorPatterns = await this.analyzeErrorHandling(files);
    patterns.push(...errorPatterns);

    // Filter by minimum occurrences
    const filtered = patterns.filter(
      p => p.frequency >= (options.minOccurrences || 3)
    );

    // Generate convention document
    const conventions = this.generateConventions(filtered);

    return {
      patterns: filtered,
      conventions,
      recommendations: this.generateRecommendations(filtered),
    };
  }

  private generateConventions(patterns: DiscoveredPattern[]): ConventionDoc {
    return {
      naming: {
        components: this.extractNamingConvention(patterns, 'components'),
        hooks: this.extractNamingConvention(patterns, 'hooks'),
        files: this.extractNamingConvention(patterns, 'files'),
      },
      structure: {
        folders: this.extractStructureConvention(patterns),
        imports: this.extractImportConvention(patterns),
      },
      errorHandling: this.extractErrorConvention(patterns),
    };
  }
}
```

## Integration Points
- Works with **Code Analyzer** for AST analysis
- Coordinates with **Documentation Generator** for docs
- Supports **Template Generator** for scaffolds
