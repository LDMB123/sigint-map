# Future Features (Scaffolded, Not Yet Integrated)

## Skill Progression System
**Status**: 40% complete, no UI
**Files**: `rust/skill_progression.rs` (150 lines)
**Purpose**: Track mastery levels per kindness category (bronze/silver/gold badges)
**Why Not Removed**: Thoughtful design for growing 4-year-old, worth completing
**Next Steps**: Integrate with tracker.rs, add badge UI in rewards panel

## Adaptive Quests
**Status**: 30% complete, no UI
**Files**: `rust/adaptive_quests.rs` (80 lines)
**Purpose**: Daily focus quest targets least-practiced skill
**Why Not Removed**: Enhances learning, extends existing quest system
**Next Steps**: Wire into quests.rs, test focus priority algorithm

## Reflection Prompts
**Status**: 20% complete, no UI
**Files**: `rust/reflection.rs` (60 lines)
**Purpose**: "Why was that kind?" prompts after logging acts
**Why Not Removed**: Core pedagogy feature for teaching empathy
**Next Steps**: Implement 3-emoji popover, test 3s delay timing

## Parent Insights Dashboard
**Status**: 10% complete, no UI
**Files**: `rust/parent_insights.rs` (40 lines)
**Purpose**: Weekly summary of child's kindness patterns and growth
**Why Not Removed**: Valuable for parent engagement and understanding progress
**Next Steps**: Complete WeeklyInsight implementation, add visualization panel

## Decision Rationale

These features represent **incomplete implementation**, not dead code:
- All have clear pedagogical value for a 4-year-old learning kindness
- Scaffolding is thoughtfully designed (skill ladders, focus algorithms, reflection timing)
- Total lines: ~330 (0.9% of codebase)
- Compiler warnings are acceptable during development
- Removing would lose valuable planning work

**When to Complete**: After parent testing confirms core features are solid (tracker, quests, stories, rewards, games).

## Build Warnings Explained

The 10 build warnings are expected and intentional:

### Skill Progression (4 warnings)
- `struct SkillLevel` - Complete design, awaiting UI integration
- `render_skill_badges()` - Panel rendering scaffolded
- `get_skill_level()` - Query helper for future badge system
- `render_mastery_indicators()` - Visual feedback system

### Adaptive Quests (1 warning)
- `get_focus_skill_for_quest()` - Priority algorithm for daily focus

### Parent Insights (2 warnings)
- `WeeklyInsight.week_key` - Time series key for weekly summaries
- `WeeklyInsight.top_skill` - Top performing category per week

### Reflection System (3 warnings)
- Event listener infrastructure exists, awaiting popover UI
- Timer logic for 3-second delay implemented
- Emoji selection system pending design finalization

These warnings will resolve automatically when features are integrated with UI and called from main app flow.
