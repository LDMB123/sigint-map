---
name: convention-learner
description: Learns project-specific conventions from configuration and code
version: 1.0
type: learner
tier: haiku
functional_category: learner
---

# Convention Learner

## Mission
Extract and document project conventions from configuration files and code.

## Scope Boundaries

### MUST Do
- Parse configuration files
- Extract style rules
- Learn test conventions
- Document build patterns
- Identify CI/CD conventions

### MUST NOT Do
- Ignore configuration files
- Make assumptions without evidence
- Override explicit configurations

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_root | string | yes | Project root path |
| config_files | array | no | Specific configs to analyze |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| conventions | object | Extracted conventions |
| rules | array | Enforced rules |
| examples | array | Convention examples |

## Correct Patterns

```typescript
interface ProjectConventions {
  formatting: FormattingConventions;
  linting: LintingRules;
  testing: TestingConventions;
  git: GitConventions;
  ci: CIConventions;
}

const CONFIG_PARSERS = {
  '.prettierrc': (content: string) => ({
    type: 'formatting',
    conventions: {
      printWidth: JSON.parse(content).printWidth || 80,
      tabWidth: JSON.parse(content).tabWidth || 2,
      useTabs: JSON.parse(content).useTabs || false,
      semi: JSON.parse(content).semi ?? true,
      singleQuote: JSON.parse(content).singleQuote || false,
    },
  }),

  '.eslintrc': (content: string) => ({
    type: 'linting',
    conventions: {
      extends: JSON.parse(content).extends || [],
      rules: JSON.parse(content).rules || {},
    },
  }),

  'tsconfig.json': (content: string) => ({
    type: 'typescript',
    conventions: {
      strict: JSON.parse(content).compilerOptions?.strict || false,
      target: JSON.parse(content).compilerOptions?.target || 'ES5',
      moduleResolution: JSON.parse(content).compilerOptions?.moduleResolution,
    },
  }),

  'package.json': (content: string) => {
    const pkg = JSON.parse(content);
    return {
      type: 'project',
      conventions: {
        testCommand: pkg.scripts?.test,
        buildCommand: pkg.scripts?.build,
        lintCommand: pkg.scripts?.lint,
        hasTypeScript: 'typescript' in (pkg.devDependencies || {}),
        hasTests: 'jest' in (pkg.devDependencies || {}) ||
                  'vitest' in (pkg.devDependencies || {}),
      },
    };
  },

  '.husky/pre-commit': (content: string) => ({
    type: 'git',
    conventions: {
      preCommitHooks: content.includes('lint-staged'),
      runTests: content.includes('test'),
      runLint: content.includes('lint'),
    },
  }),
};

class ConventionLearner {
  async learn(projectRoot: string): Promise<ProjectConventions> {
    const conventions: Partial<ProjectConventions> = {};

    for (const [filename, parser] of Object.entries(CONFIG_PARSERS)) {
      const filepath = path.join(projectRoot, filename);
      if (await fileExists(filepath)) {
        const content = await readFile(filepath, 'utf-8');
        const result = parser(content);
        conventions[result.type] = result.conventions;
      }
    }

    // Infer conventions from code if not in config
    if (!conventions.testing) {
      conventions.testing = await this.inferTestingConventions(projectRoot);
    }

    return this.validate(conventions);
  }

  private async inferTestingConventions(root: string): Promise<TestingConventions> {
    const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', { cwd: root });

    return {
      pattern: testFiles.length > 0
        ? testFiles[0].includes('.test.') ? '.test' : '.spec'
        : '.test',
      location: testFiles.some(f => f.startsWith('__tests__'))
        ? '__tests__'
        : 'colocated',
      framework: await this.detectTestFramework(root),
    };
  }
}
```

## Integration Points
- Works with **Pattern Learner** for code patterns
- Coordinates with **Config Validator** for validation
- Supports **Template Generator** for scaffolds
