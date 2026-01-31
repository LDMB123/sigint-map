# Testing Implementation Guide

**Practical implementation examples for agent ecosystem testing**

**Companion to:** AGENT_ECOSYSTEM_TESTING_STRATEGY.md
**Generated:** 2026-01-31

---

## Quick Start

### Setup Testing Infrastructure

```bash
# 1. Create vitest config
cat > .claude/vitest.config.ts << 'VITEST'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/**/*.test.ts', 'lib/**/__tests__/**'],
      lines: 85,
      branches: 80,
      functions: 90
    }
  }
});
VITEST

# 2. Create test directory structure
mkdir -p .claude/lib/agents/__tests__
mkdir -p .claude/tests/{integration,load,coverage,fixtures}

# 3. Install coverage tooling (if not present)
cd .claude && npm install --save-dev c8 @vitest/coverage-c8

# 4. Add test scripts to package.json
npm pkg set scripts.test:agents="vitest lib/agents"
npm pkg set scripts.test:coverage="vitest --coverage"
npm pkg set scripts.test:smoke="vitest --run --reporter=dot"
```

---

## Implementation Examples

### 1. Agent YAML Validation Tests

**File:** `.claude/lib/agents/__tests__/yaml-validation.test.ts`

```typescript
/**
 * Agent YAML Validation Tests
 * Prevents Phase 3 YAML formatting regressions
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'yaml';

const AGENTS_DIR = join(__dirname, '../../agents');

// Helper: Parse agent frontmatter
function parseAgentFrontmatter(filePath: string): {
  frontmatter: any;
  content: string;
} {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  
  if (!match) {
    throw new Error(`No frontmatter found in ${filePath}`);
  }

  const frontmatter = yaml.parse(match[1]);
  return { frontmatter, content: match[2] };
}

// Get all agent files
function getAllAgentFiles(): string[] {
  const files = readdirSync(AGENTS_DIR);
  return files
    .filter(f => f.endsWith('.md'))
    .map(f => join(AGENTS_DIR, f));
}

describe('Agent YAML Validation', () => {
  const agentFiles = getAllAgentFiles();

  it('should find all 14 agent files', () => {
    expect(agentFiles.length).toBe(14);
  });

  describe('Frontmatter Syntax', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should parse YAML in ${fileName}`, () => {
        expect(() => {
          parseAgentFrontmatter(filePath);
        }).not.toThrow();
      });
    });
  });

  describe('Required Fields', () => {
    const requiredFields = ['name', 'description', 'tools', 'model', 'permissionMode'];

    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      requiredFields.forEach(field => {
        it(`should have '${field}' in ${fileName}`, () => {
          const { frontmatter } = parseAgentFrontmatter(filePath);
          expect(frontmatter).toHaveProperty(field);
          expect(frontmatter[field]).toBeDefined();
        });
      });
    });
  });

  describe('Model Tier Validation', () => {
    const validTiers = ['haiku', 'sonnet', 'opus'];

    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should have valid model tier in ${fileName}`, () => {
        const { frontmatter } = parseAgentFrontmatter(filePath);
        expect(validTiers).toContain(frontmatter.model);
      });
    });
  });

  describe('Tools Array Validation', () => {
    const validTools = ['Read', 'Edit', 'Grep', 'Glob', 'Bash'];

    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should have valid tools array in ${fileName}`, () => {
        const { frontmatter } = parseAgentFrontmatter(filePath);
        
        expect(Array.isArray(frontmatter.tools)).toBe(true);
        expect(frontmatter.tools.length).toBeGreaterThan(0);

        frontmatter.tools.forEach((tool: string) => {
          expect(validTools).toContain(tool);
        });
      });
    });
  });

  describe('Permission Mode Validation', () => {
    const validModes = ['default', 'strict', 'permissive'];

    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should have valid permissionMode in ${fileName}`, () => {
        const { frontmatter } = parseAgentFrontmatter(filePath);
        expect(validModes).toContain(frontmatter.permissionMode);
      });
    });
  });

  describe('Description Quality', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should have meaningful description in ${fileName}`, () => {
        const { frontmatter } = parseAgentFrontmatter(filePath);
        
        // Min length check
        expect(frontmatter.description.length).toBeGreaterThan(50);
        
        // Should mention delegation
        expect(frontmatter.description.toLowerCase()).toMatch(/use when|delegate/);
        
        // Should describe capability
        expect(frontmatter.description.toLowerCase()).toMatch(
          /generate|analyze|debug|review|test|implement|migrate/
        );
      });
    });
  });

  describe('Frontmatter Delimiter Validation', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should use triple-dash delimiters in ${fileName}`, () => {
        const content = readFileSync(filePath, 'utf-8');
        
        // Must start with ---
        expect(content.trim()).toMatch(/^---\n/);
        
        // Must have closing ---
        const lines = content.split('\n');
        const closingIndex = lines.findIndex((line, i) => 
          i > 0 && line.trim() === '---'
        );
        expect(closingIndex).toBeGreaterThan(0);
      });
    });
  });

  describe('Name Consistency', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!.replace('.md', '');

      it(`should have filename matching agent name: ${fileName}`, () => {
        const { frontmatter } = parseAgentFrontmatter(filePath);
        expect(frontmatter.name).toBe(fileName);
      });
    });
  });
});
```

---

### 2. Route Table Integrity Tests

**File:** `.claude/lib/routing/__tests__/route-table-integrity.test.ts`

```typescript
/**
 * Route Table Integrity Tests
 * Validates route table references existing agents and maintains consistency
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { RouteTableConfig } from '../route-table';

const ROUTE_TABLE_PATH = join(__dirname, '../../config/route-table.json');
const AGENTS_DIR = join(__dirname, '../../agents');

describe('Route Table Integrity', () => {
  let routeTable: RouteTableConfig;
  let availableAgents: Set<string>;

  beforeAll(() => {
    // Load route table
    const content = readFileSync(ROUTE_TABLE_PATH, 'utf-8');
    routeTable = JSON.parse(content);

    // Load available agents
    const agentFiles = readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
    availableAgents = new Set(agentFiles);
  });

  describe('Structure Validation', () => {
    it('should have valid version', () => {
      expect(routeTable.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have generated_at date', () => {
      expect(routeTable.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should have domains mapping', () => {
      expect(routeTable.domains).toBeDefined();
      expect(Object.keys(routeTable.domains).length).toBeGreaterThan(0);
    });

    it('should have actions mapping', () => {
      expect(routeTable.actions).toBeDefined();
      expect(Object.keys(routeTable.actions).length).toBeGreaterThan(0);
    });

    it('should have routes mapping', () => {
      expect(routeTable.routes).toBeDefined();
    });

    it('should have default_route', () => {
      expect(routeTable.default_route).toBeDefined();
      expect(routeTable.default_route.agent).toBeDefined();
      expect(routeTable.default_route.tier).toMatch(/^(haiku|sonnet|opus)$/);
    });

    it('should have category_routes', () => {
      expect(routeTable.category_routes).toBeDefined();
    });
  });

  describe('Agent Reference Validation', () => {
    it('should only reference existing agents in routes', () => {
      const routes = Object.values(routeTable.routes);
      const invalidRefs: string[] = [];

      routes.forEach((route: any) => {
        if (!availableAgents.has(route.agent)) {
          invalidRefs.push(route.agent);
        }
      });

      expect(invalidRefs).toEqual([]);
    });

    it('should reference existing agent in default_route', () => {
      expect(availableAgents.has(routeTable.default_route.agent)).toBe(true);
    });

    it('should only reference existing agents in category_routes', () => {
      const invalidRefs: string[] = [];

      Object.values(routeTable.category_routes).forEach((category: any) => {
        Object.values(category).forEach((route: any) => {
          if (!availableAgents.has(route.agent)) {
            invalidRefs.push(route.agent);
          }
        });
      });

      expect(invalidRefs).toEqual([]);
    });
  });

  describe('Semantic Hash Uniqueness', () => {
    it('should have unique semantic hashes in routes', () => {
      const hashes = Object.keys(routeTable.routes);
      const uniqueHashes = new Set(hashes);
      
      expect(hashes.length).toBe(uniqueHashes.size);
    });

    it('should use valid hex format for hashes', () => {
      const hashes = Object.keys(routeTable.routes);
      
      hashes.forEach(hash => {
        expect(hash).toMatch(/^0x[0-9a-f]{16}$/);
      });
    });
  });

  describe('Tier Validation', () => {
    it('should use valid tiers in all routes', () => {
      const validTiers = ['haiku', 'sonnet', 'opus'];
      const routes = Object.values(routeTable.routes);

      routes.forEach((route: any) => {
        expect(validTiers).toContain(route.tier);
      });
    });

    it('should use valid tiers in category routes', () => {
      const validTiers = ['haiku', 'sonnet', 'opus'];

      Object.values(routeTable.category_routes).forEach((category: any) => {
        Object.values(category).forEach((route: any) => {
          expect(validTiers).toContain(route.tier);
        });
      });
    });
  });

  describe('Coverage Analysis', () => {
    it('should cover all agents in routing table', () => {
      const routedAgents = new Set<string>();

      // Collect from routes
      Object.values(routeTable.routes).forEach((route: any) => {
        routedAgents.add(route.agent);
      });

      // Collect from category routes
      Object.values(routeTable.category_routes).forEach((category: any) => {
        Object.values(category).forEach((route: any) => {
          routedAgents.add(route.agent);
        });
      });

      // Add default route
      routedAgents.add(routeTable.default_route.agent);

      // Check coverage (allow some specialized agents to be unreferenced)
      const coverage = routedAgents.size / availableAgents.size;
      expect(coverage).toBeGreaterThan(0.7); // At least 70% coverage
    });

    it('should not have orphaned routes', () => {
      const routedAgents = new Set<string>();

      // Collect all routed agents
      Object.values(routeTable.routes).forEach((route: any) => {
        routedAgents.add(route.agent);
      });

      Object.values(routeTable.category_routes).forEach((category: any) => {
        Object.values(category).forEach((route: any) => {
          routedAgents.add(route.agent);
        });
      });

      // All routed agents must exist
      routedAgents.forEach(agent => {
        expect(availableAgents.has(agent)).toBe(true);
      });
    });
  });

  describe('Category Routes Completeness', () => {
    it('should have routes for core categories', () => {
      const coreCategories = [
        'analyzer', 'debugger', 'generator', 'guardian',
        'integrator', 'transformer', 'validator'
      ];

      coreCategories.forEach(category => {
        expect(routeTable.category_routes).toHaveProperty(category);
      });
    });

    it('should have subtypes in each category', () => {
      Object.entries(routeTable.category_routes).forEach(([category, routes]) => {
        expect(Object.keys(routes).length).toBeGreaterThan(0);
      });
    });
  });
});
```

---

### 3. Integration Test Example

**File:** `.claude/tests/integration/agent-skill-integration.test.ts`

```typescript
/**
 * Agent-Skill Integration Tests
 * Validates agents can load and use skills correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'yaml';

const AGENTS_DIR = join(__dirname, '../../.claude/agents');
const SKILLS_DIR = join(__dirname, '../../.claude/skills');

// Helper: Get skill references from agent content
function getSkillReferences(agentPath: string): string[] {
  const content = readFileSync(agentPath, 'utf-8');
  const skillRefs: string[] = [];

  // Look for skill references in markdown links
  const skillLinkRegex = /\[.*?\]\(\.\.\/skills\/([^)]+)\)/g;
  let match;
  while ((match = skillLinkRegex.exec(content)) !== null) {
    skillRefs.push(match[1]);
  }

  // Look for skill references in frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = yaml.parse(frontmatterMatch[1]);
    if (frontmatter.skills && Array.isArray(frontmatter.skills)) {
      skillRefs.push(...frontmatter.skills);
    }
  }

  return [...new Set(skillRefs)]; // Deduplicate
}

// Helper: Validate skill structure
function validateSkillStructure(skillPath: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Must have SKILL.md
  const skillFile = join(skillPath, 'SKILL.md');
  if (!existsSync(skillFile)) {
    errors.push('Missing SKILL.md');
    return { valid: false, errors };
  }

  // Parse SKILL.md frontmatter
  const content = readFileSync(skillFile, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
  
  if (!frontmatterMatch) {
    errors.push('Missing frontmatter in SKILL.md');
    return { valid: false, errors };
  }

  const frontmatter = yaml.parse(frontmatterMatch[1]);

  // Required fields
  if (!frontmatter.name) errors.push('Missing name');
  if (!frontmatter.description) errors.push('Missing description');
  if (!frontmatter.version) errors.push('Missing version');

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('Agent-Skill Integration', () => {
  let agentFiles: string[];
  let skillDirs: string[];

  beforeAll(() => {
    agentFiles = readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => join(AGENTS_DIR, f));

    skillDirs = readdirSync(SKILLS_DIR)
      .filter(f => {
        const path = join(SKILLS_DIR, f);
        return existsSync(path) && existsSync(join(path, 'SKILL.md'));
      })
      .map(f => join(SKILLS_DIR, f));
  });

  describe('Skill Structure Validation', () => {
    skillDirs.forEach(skillPath => {
      const skillName = skillPath.split('/').pop()!;

      it(`should have valid structure: ${skillName}`, () => {
        const result = validateSkillStructure(skillPath);
        
        if (!result.valid) {
          console.error(`Errors in ${skillName}:`, result.errors);
        }

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });
  });

  describe('Skill Reference Validation', () => {
    agentFiles.forEach(agentPath => {
      const agentName = agentPath.split('/').pop()!.replace('.md', '');

      it(`should reference existing skills: ${agentName}`, () => {
        const skillRefs = getSkillReferences(agentPath);
        const availableSkills = skillDirs.map(p => p.split('/').pop()!);

        const missingSkills = skillRefs.filter(ref => {
          // Extract skill name from path
          const skillName = ref.split('/')[0];
          return !availableSkills.includes(skillName);
        });

        if (missingSkills.length > 0) {
          console.warn(`Missing skills in ${agentName}:`, missingSkills);
        }

        expect(missingSkills).toEqual([]);
      });
    });
  });

  describe('Skill Loading Simulation', () => {
    it('should successfully load all skills', () => {
      skillDirs.forEach(skillPath => {
        const skillFile = join(skillPath, 'SKILL.md');
        expect(() => {
          readFileSync(skillFile, 'utf-8');
        }).not.toThrow();
      });
    });

    it('should parse all skill frontmatter', () => {
      skillDirs.forEach(skillPath => {
        const skillFile = join(skillPath, 'SKILL.md');
        const content = readFileSync(skillFile, 'utf-8');
        const match = content.match(/^---\n([\s\S]+?)\n---/);

        expect(match).not.toBeNull();
        expect(() => {
          yaml.parse(match![1]);
        }).not.toThrow();
      });
    });
  });

  describe('Skill Composition', () => {
    it('should have 12 total skills', () => {
      expect(skillDirs.length).toBe(12);
    });

    it('should have unique skill names', () => {
      const skillNames = skillDirs.map(p => p.split('/').pop()!);
      const uniqueNames = new Set(skillNames);
      
      expect(skillNames.length).toBe(uniqueNames.size);
    });
  });
});
```

---

### 4. Phase 3 Regression Tests

**File:** `.claude/lib/agents/__tests__/phase3-regression.test.ts`

```typescript
/**
 * Phase 3 Regression Prevention Tests
 * Prevents known YAML formatting issues from recurring
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'yaml';

const AGENTS_DIR = join(__dirname, '../../agents');

// Known bad patterns from Phase 3
const BAD_PATTERNS = [
  {
    name: 'orchestrator_testing corruption',
    pattern: /orchestrator_testing/i,
    description: 'Should not contain corrupted orchestrator_testing strings'
  },
  {
    name: 'malformed tools array',
    pattern: /tools:\s*-\s*\[/,
    description: 'Tools should be array, not array-in-array'
  },
  {
    name: 'missing frontmatter delimiter',
    pattern: /^[^-]/,
    description: 'File must start with --- delimiter'
  },
  {
    name: 'unquoted description with colons',
    pattern: /description:\s*[^>|"']\s*.*:/,
    description: 'Multi-line descriptions must use > or | indicators'
  }
];

describe('Phase 3 Regression Prevention', () => {
  const agentFiles = readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => join(AGENTS_DIR, f));

  describe('Known Bad Pattern Detection', () => {
    BAD_PATTERNS.forEach(({ name, pattern, description }) => {
      agentFiles.forEach(filePath => {
        const fileName = filePath.split('/').pop()!;

        it(`should not have ${name} in ${fileName}`, () => {
          const content = readFileSync(filePath, 'utf-8');
          const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
          
          if (!frontmatterMatch) {
            throw new Error(`No frontmatter in ${fileName}`);
          }

          const frontmatter = frontmatterMatch[1];
          expect(frontmatter).not.toMatch(pattern);
        });
      });
    });
  });

  describe('YAML Parsing Robustness', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should parse YAML without errors: ${fileName}`, () => {
        const content = readFileSync(filePath, 'utf-8');
        const match = content.match(/^---\n([\s\S]+?)\n---/);

        expect(match).not.toBeNull();
        
        expect(() => {
          const parsed = yaml.parse(match![1]);
          expect(parsed).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Frontmatter Delimiter Integrity', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should have proper delimiters: ${fileName}`, () => {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // First line must be ---
        expect(lines[0].trim()).toBe('---');

        // Find closing ---
        const closingIndex = lines.findIndex((line, i) => 
          i > 0 && line.trim() === '---'
        );

        expect(closingIndex).toBeGreaterThan(0);
        expect(closingIndex).toBeLessThan(lines.length - 1);
      });
    });
  });

  describe('Required Field Presence', () => {
    const requiredFields = ['name', 'description', 'tools', 'model', 'permissionMode'];

    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should have all required fields: ${fileName}`, () => {
        const content = readFileSync(filePath, 'utf-8');
        const match = content.match(/^---\n([\s\S]+?)\n---/);
        const frontmatter = yaml.parse(match![1]);

        requiredFields.forEach(field => {
          expect(frontmatter).toHaveProperty(field);
          expect(frontmatter[field]).toBeDefined();
          expect(frontmatter[field]).not.toBe('');
        });
      });
    });
  });

  describe('Tools Array Format', () => {
    agentFiles.forEach(filePath => {
      const fileName = filePath.split('/').pop()!;

      it(`should have properly formatted tools array: ${fileName}`, () => {
        const content = readFileSync(filePath, 'utf-8');
        const match = content.match(/^---\n([\s\S]+?)\n---/);
        const frontmatter = yaml.parse(match![1]);

        // Must be array
        expect(Array.isArray(frontmatter.tools)).toBe(true);

        // Must not be empty
        expect(frontmatter.tools.length).toBeGreaterThan(0);

        // All elements must be strings
        frontmatter.tools.forEach((tool: any) => {
          expect(typeof tool).toBe('string');
        });
      });
    });
  });
});
```

---

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run specific category
npm run test:agents
npm run test:routing

# Run with coverage
npm run test:coverage

# Watch mode for development
npm test -- --watch

# Run specific file
npm test -- lib/agents/__tests__/yaml-validation.test.ts

# Smoke tests (fast validation)
npm run test:smoke
```

### Debugging Test Failures

```bash
# Verbose output
npm test -- --reporter=verbose

# Run single test
npm test -- -t "should parse YAML"

# UI mode
npm test -- --ui

# Coverage for specific file
npm test -- --coverage lib/agents/parser.ts
```

---

## Next Steps

1. **Create vitest.config.ts** using template above
2. **Implement agent parser** (`lib/agents/parser.ts`)
3. **Add first test suite** (yaml-validation.test.ts)
4. **Run tests and iterate** until passing
5. **Add to pre-commit hook**

---

## Resources

- Main Strategy: `AGENT_ECOSYSTEM_TESTING_STRATEGY.md`
- Existing Tests: `.claude/lib/routing/__tests__/`
- Test Runner: Vitest 4.0.18
- Coverage Tool: c8
