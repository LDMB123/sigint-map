# Release Management

Manage version releases for the specified project.

## Target: $ARGUMENTS

## Release Process

### 1. Pre-Release Checklist
- [ ] All tests passing
- [ ] No critical bugs open
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Dependencies up to date
- [ ] Performance benchmarks acceptable
- [ ] Security audit passed
- [ ] Feature flags reviewed

### 2. Versioning (Semantic Versioning)

```
MAJOR.MINOR.PATCH
  │     │     └── Bug fixes, no API changes
  │     └──────── New features, backward compatible
  └────────────── Breaking changes
```

**Examples:**
- `1.0.0` → `1.0.1` - Bug fix
- `1.0.0` → `1.1.0` - New feature
- `1.0.0` → `2.0.0` - Breaking change

**Pre-release versions:**
- `1.0.0-alpha.1` - Alpha (unstable, incomplete)
- `1.0.0-beta.1` - Beta (feature complete, testing)
- `1.0.0-rc.1` - Release candidate (final testing)

### 3. CHANGELOG Format (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- New feature X

### Changed
- Updated dependency Y

### Deprecated
- Feature Z (use W instead)

### Removed
- Legacy API endpoint

### Fixed
- Bug in authentication flow

### Security
- Fixed XSS vulnerability in input sanitization

## [1.2.0] - 2024-01-15

### Added
- User profile customization
- Dark mode support

### Fixed
- Memory leak in websocket handler

## [1.1.0] - 2024-01-01

...
```

## Release Commands

### npm/Node.js Projects

```bash
# Check current version
npm version

# Bump version (updates package.json, creates commit & tag)
npm version patch -m "Release v%s"  # 1.0.0 → 1.0.1
npm version minor -m "Release v%s"  # 1.0.0 → 1.1.0
npm version major -m "Release v%s"  # 1.0.0 → 2.0.0
npm version prerelease --preid=beta # 1.0.0 → 1.0.1-beta.0

# Publish to npm
npm publish

# Publish with tag
npm publish --tag beta

# Push tags
git push && git push --tags
```

### Using Changesets (Monorepos)

```bash
# Install
npm install -D @changesets/cli
npx changeset init

# Add changeset for each PR
npx changeset

# Version packages (consumes changesets)
npx changeset version

# Publish packages
npx changeset publish
```

### Python Projects

```bash
# Using bump2version
pip install bump2version

# Bump version
bump2version patch  # 1.0.0 → 1.0.1
bump2version minor  # 1.0.0 → 1.1.0
bump2version major  # 1.0.0 → 2.0.0

# Build and publish
python -m build
twine upload dist/*
```

### Go Projects

```bash
# Tag release
git tag v1.0.0
git push origin v1.0.0

# Module versioning (go.mod)
# v2+ requires /v2 suffix in import path
```

## GitHub Release Workflow

### Creating Release

```bash
# Create annotated tag
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# Create GitHub release using gh CLI
gh release create v1.2.0 \
  --title "v1.2.0" \
  --notes-file CHANGELOG.md \
  --latest

# Create pre-release
gh release create v1.3.0-beta.1 \
  --title "v1.3.0 Beta 1" \
  --prerelease

# Upload release assets
gh release upload v1.2.0 dist/*.tar.gz
```

### Automated Release (GitHub Actions)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Generate release notes
        id: changelog
        run: |
          # Extract changelog for this version
          VERSION=${GITHUB_REF#refs/tags/v}
          sed -n "/## \[$VERSION\]/,/## \[/p" CHANGELOG.md | head -n -1 > release_notes.md

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body_path: release_notes.md
          files: |
            dist/*.tar.gz
            dist/*.zip

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Rollback Procedures

```bash
# Revert to previous version
git revert HEAD
git push

# Or reset to tag
git reset --hard v1.1.0
git push --force-with-lease

# Unpublish npm (within 72 hours)
npm unpublish package-name@1.2.0

# Deprecate instead (recommended)
npm deprecate package-name@1.2.0 "Critical bug, use 1.2.1"
```

## Release Checklist Template

```markdown
## Release Checklist: v1.2.0

### Pre-Release
- [ ] All CI checks passing on main
- [ ] Version bumped in package.json / pyproject.toml
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented
- [ ] Migration guide written (if needed)
- [ ] Documentation updated
- [ ] Performance regression tests passed

### Release
- [ ] Created git tag
- [ ] GitHub release created
- [ ] npm/PyPI package published
- [ ] Docker image pushed
- [ ] CDN assets updated

### Post-Release
- [ ] Announcement posted (Discord/Slack/Twitter)
- [ ] Documentation site deployed
- [ ] Monitoring dashboards checked
- [ ] Smoke tests on production
- [ ] Update dependent projects

### Rollback Plan
If issues discovered:
1. Revert commit: `git revert <commit>`
2. Deprecate package: `npm deprecate`
3. Notify users via status page
```

## Output Format

```markdown
## Release Report: v1.2.0

### Version Change
- Previous: v1.1.0
- New: v1.2.0
- Type: Minor (new features)

### Changes Included
- feat: Add dark mode support
- feat: User profile customization
- fix: Memory leak in websocket handler
- docs: Updated API documentation

### Files Modified
| File | Change |
|------|--------|
| package.json | 1.1.0 → 1.2.0 |
| CHANGELOG.md | Added v1.2.0 section |

### Commands Executed
```bash
npm version minor -m "Release v%s"
git push && git push --tags
gh release create v1.2.0 --notes-file release_notes.md
npm publish
```

### Verification
- [ ] npm package live: https://npmjs.com/package/myapp
- [ ] GitHub release: https://github.com/org/repo/releases/v1.2.0
- [ ] Documentation deployed

### Announcements
- [ ] Tweet release notes
- [ ] Post in Discord #announcements
- [ ] Update blog
```

## Tips

- **Automate**: Use semantic-release or changesets for automation
- **Draft releases**: GitHub draft releases let you prepare notes before tagging
- **Canary releases**: Test with `npm publish --tag canary` before stable
- **Retract, don't delete**: Deprecate packages instead of unpublishing
- **Release notes**: Write for users, not developers - focus on impact
- **Calendar**: Schedule releases (e.g., Tuesdays) for predictability
