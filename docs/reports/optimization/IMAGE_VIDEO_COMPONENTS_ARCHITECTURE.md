# Image & Video Generation Components Architecture

**Date**: 2026-01-30
**Status**: ✅ Properly Organized
**Location**: User-level commands (`~/.claude/commands/`)

---

## Current Architecture

### Component Locations

**Image/Video components are NOT in the project `.claude/` directory** - they are properly located at the **user level** in `~/.claude/commands/`:

```
~/.claude/commands/
├── imagen-generate.md      # Google Imagen 3 image generation
├── veo-generate.md          # Google Veo 2 video generation
└── video-prompt.md          # Video prompt engineering
```

This is the **correct architecture** because:

1. **Cross-Project Utility**: Image/video generation is useful across ALL projects, not just DMB Almanac
2. **User-Level Tools**: These are general-purpose tools you want available everywhere
3. **MCP Integration**: Uses MCP (Model Context Protocol) tools that are user-configured
4. **Command Pattern**: Claude Code commands (vs skills/agents) for one-shot actions

---

## Component Details

### 1. imagen-generate.md
**Purpose**: Google Imagen 3 image generation and editing
**Type**: User-level command
**MCP Tools Used**:
- `mcp__imagen__generate_image`
- `mcp__imagen__edit_image`

**Capabilities**:
- Text-to-image generation
- Image editing and style transfer
- Prompt engineering for visual content
- High-quality AI image creation

### 2. veo-generate.md
**Purpose**: Google Veo 2 AI video generation
**Type**: User-level command
**MCP Tools Used**:
- `mcp__veo__generate_video`

**Capabilities**:
- Text-to-video generation
- Cinematic prompt engineering
- Motion control and video production
- AI-powered video creation workflows

### 3. video-prompt.md
**Purpose**: Video prompt engineering guidance
**Type**: User-level command

**Capabilities**:
- Video prompt best practices
- Motion and camera direction
- Style and mood specification
- Prompt optimization for video generation

---

## Why Not in Project `.claude/`?

### Correct Separation of Concerns

**Project-Level** (`.claude/skills/` and `.claude/agents/`):
- ✅ DMB Almanac-specific functionality
- ✅ Project domain expertise (concerts, setlists, data)
- ✅ SvelteKit/PWA development patterns
- ✅ Project-specific workflows

**User-Level** (`~/.claude/commands/`):
- ✅ Cross-project utilities (image/video generation)
- ✅ General-purpose tools
- ✅ MCP-integrated services
- ✅ Portable across all projects

### Benefits of Current Architecture

1. **Reusability**: Available in ALL your Claude Code projects
2. **Separation**: Keeps project `.claude/` focused on project-specific needs
3. **Maintainability**: Update once, applies everywhere
4. **Portability**: Easy to share/sync across machines
5. **MCP Integration**: User-level MCP server configuration

---

## Integration with Project

Even though image/video commands are at user-level, they are **fully accessible** from the DMB Almanac project:

### Usage Examples

```bash
# Generate images for DMB content
/imagen-generate "Dave Matthews Band concert poster, vintage style"

# Create video content
/veo-generate "DMB concert highlights montage with smooth transitions"

# Get prompt engineering help
/video-prompt
```

### MCP Settings

The commands use MCP tools configured in `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allowedMcpServers": {
      "google-labs": [
        "mcp__imagen__generate_image",
        "mcp__imagen__edit_image",
        "mcp__veo__generate_video"
      ]
    }
  }
}
```

---

## Verification

### User-Level Commands (3)
| Command | Purpose | MCP Tools | Status |
|---------|---------|-----------|--------|
| `imagen-generate.md` | Image generation | Imagen API | ✅ Active |
| `veo-generate.md` | Video generation | Veo API | ✅ Active |
| `video-prompt.md` | Prompt guidance | None | ✅ Active |

### Project-Level Components (9 skills, 14 agents)
**No image/video components** - correctly focused on:
- DMB domain expertise
- Web development (SvelteKit, PWA)
- Code quality and deployment
- Project-specific workflows

---

## Historical Context

### Before Migration (Pre-Jan 30)
- 69 flat skill files included imagen/veo specialists
- Mixed project-specific and general-purpose utilities
- Everything at project level (incorrect)

### During Optimization V1 (Migration)
- Recognized imagen/veo as general-purpose tools
- Did NOT migrate to project `.claude/skills/`
- Correctly kept at user level as commands

### After Optimization V2 (Current)
- ✅ Image/video at user-level (`~/.claude/commands/`)
- ✅ Project skills focused on DMB/development
- ✅ Clear separation of concerns
- ✅ Optimal architecture

---

## Audit Trail References

The following audit files confirm image/video components exist at user-level:

1. **`.claude/audit/coordination-map.json`**
   - Lists `veo-video-generation-specialist` agent
   - Lists `imagen-creative-specialist` agent
   - References user-level command paths

2. **`.claude/audit/orphaned-agents-inventory.json`**
   - Identified imagen/veo as "orphaned" from project perspective
   - Actually means they're correctly at user-level, not project-level

3. **`.claude/audit/skills-audit/skills-index.md`**
   - Documents imagen/veo descriptions
   - Notes they were "Imported from Claude agent"
   - Confirms they're external to project

---

## Architecture Decision

### Decision: Keep Image/Video at User-Level ✅

**Rationale**:
1. **Cross-Project Utility**: Useful in ANY project, not DMB-specific
2. **MCP Integration**: Requires user-level MCP server config
3. **Maintenance**: Update once, applies everywhere
4. **Portability**: Travels with user, not project
5. **Focus**: Project `.claude/` stays focused on project domain

**Trade-offs**:
- ❌ Not in project repo (must configure separately on new machines)
- ✅ Available across all projects
- ✅ Cleaner project structure
- ✅ Better separation of concerns

**Conclusion**: Current architecture is optimal ✅

---

## Usage Recommendations

### For DMB Almanac Project

**When to use user-level image/video commands**:
- Creating DMB concert posters or visual assets
- Generating promotional videos
- Creating social media content
- Designing album artwork or tour graphics

**Access**:
```bash
# All these work from DMB Almanac project:
/imagen-generate "prompt here"
/veo-generate "video prompt here"
/video-prompt
```

### For Other Projects

Same commands work everywhere - that's the benefit of user-level!

---

## Future Considerations

### If Project-Specific Image Needs Emerge

**Scenario**: DMB Almanac needs custom image generation with DMB-specific knowledge

**Solution**: Create project-level skill
```
.claude/skills/dmb-visual-assets/
├── SKILL.md           # DMB-specific visual asset generation
└── brand-reference.md # DMB brand guidelines, colors, styles
```

This skill would:
- Use DMB brand colors/fonts
- Include band photos and logos
- Follow DMB visual identity
- Call user-level `/imagen-generate` with DMB context

**Status**: Not needed yet - current user-level commands sufficient

---

## Summary

**Image/Video components are properly organized:**

✅ **User-level commands** (`~/.claude/commands/`):
- imagen-generate.md
- veo-generate.md
- video-prompt.md

✅ **Project-level** (`.claude/skills/` and `.claude/agents/`):
- DMB domain expertise (dmb-analysis)
- Web development (sveltekit, scraping)
- Code quality (code-quality, deployment)
- Organization and monitoring

✅ **Architecture is optimal** - clear separation, maximum reusability

**Nothing is missing or broken** - everything is exactly where it should be! 🎯

---

*Documentation created: 2026-01-30*
*Architecture: User-level commands (correct)*
*Status: Properly organized, fully functional*
