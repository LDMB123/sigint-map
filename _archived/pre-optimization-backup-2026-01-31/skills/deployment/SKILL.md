---
name: deployment
description: >
  CI/CD pipeline generation and API upgrade migration workflows
  supporting GitHub Actions, GitLab CI, and major framework
  version migrations with automated validation.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
---

# Deployment Skill

CI/CD pipeline configuration and API migration workflows for
modern development teams.

## Capabilities

### CI/CD Pipeline Generation
- GitHub Actions, GitLab CI, CircleCI, Jenkins, Azure DevOps
- Lint, test, build, security scan, and deploy stages
- Matrix builds and caching strategies
- Environment configuration (dev, staging, production)
- Approval gates and notifications

### API Upgrade Migration
- Breaking change identification
- Deprecated API mapping
- Module-by-module migration coordination
- Import and syntax transformation
- Automated validation and testing

## When to Use

- Setting up CI/CD for a new project
- Adding security scanning to existing pipelines
- Migrating libraries or frameworks to new versions
- Configuring multi-environment deployment pipelines

## CI Pipeline Procedure

1. Detect project type from manifest files
2. Identify frameworks and existing CI config
3. Generate pipeline configuration with selected stages
4. Add caching strategies for dependencies
5. Configure matrix builds if multiple runtimes
6. Add security scanning jobs
7. Set up deployment jobs with environment gates
8. Validate configuration syntax

## API Upgrade Procedure

1. Identify breaking changes between versions
2. Find deprecated APIs and build migration map
3. Discover all affected files
4. Partition by module for parallel processing
5. Apply migration transforms to each file
6. Update imports and fix breaking changes
7. Validate syntax and types
8. Run affected tests and identify regressions
