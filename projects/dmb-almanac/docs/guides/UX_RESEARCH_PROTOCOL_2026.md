# UX Research Protocol - DMB Almanac 2026

## Research Summary
This study validates whether summary-first layouts and task-first entry points reduce time-to-answer while maintaining trust for both casual fans and power users. It combines moderated usability tests, unmoderated tasks, and a lightweight survey to triangulate behavioral data with perceived confidence.

## Research Objectives
- Primary question: How do users reach a trusted answer fastest?
- Secondary questions:
  - Which fields belong in the summary strip for shows, songs, and venues?
  - Where do users hesitate or get lost in the current IA?
  - Which signals increase trust: provenance, recency, or data density?
  - What offline behaviors are expected and which failures are acceptable?

## Key Hypotheses
1. Summary-first layouts reduce time-to-answer by at least 30 percent.
2. Recency and provenance are the top two trust signals across personas.
3. Task-first IA reduces navigation steps for casual users.
4. Power users still want dense stats, but not on first view.

## Methodology
- Phase 1: Moderated usability sessions (qualitative + behavioral)
- Phase 2: Unmoderated task test (quantitative time-to-answer)
- Phase 3: Post-task survey (confidence + trust ratings)

## Participants
- Total participants: 18
- Power users: 7 (attended 5+ shows, monthly usage)
- Casual fans: 6 (attended 1-4 shows, occasional usage)
- New users: 5 (no prior Almanac usage)

## Recruiting Criteria
- Devices: 60 percent mobile, 40 percent desktop
- Geography: Mix of US and international users
- Accessibility: At least 2 participants using screen readers

## Incentives
- Moderated: $50 gift card per session
- Unmoderated: $20 gift card per session

## Task Script
1. Find the setlist for the most recent show you attended.
2. When was "The Stone" last played?
3. Find all shows at Red Rocks and identify the most played song there.
4. Save a show to My Shows and confirm it is saved.
5. Go offline and locate the last show you saved.

## Success Criteria
- Time to answer: Under 10 seconds for 3 of 5 tasks
- Task completion rate: 90 percent or higher
- Confidence rating: 5/7 or higher
- Trust rating: 5/7 or higher

## Metrics
- Time to first click
- Time to answer
- Click depth
- Error rate
- Confidence rating
- Trust rating
- Path deviation count

## Moderator Guide
- Intro + consent
- Warm-up questions:
  - How often do you look up DMB setlists?
  - What is your favorite source for show history?
- Task execution with think-aloud
- Post-task ratings and reflection
- Wrap-up: trust signals and missing data

## Screener Questions
- How many DMB shows have you attended?
- How often do you use DMB Almanac or similar sites?
- Which device do you use most for concert planning?
- Are you comfortable with long data tables?

## Analysis Plan
- Affinity map by task, persona, and severity
- Behavioral segmentation: time-to-answer outliers vs. fast completions
- Trust signals ranking from qualitative mentions and rating correlation

## Deliverables
- Research summary deck (10-15 slides)
- Atomic insight list (6-10 insights)
- Top 5 design recommendations
- Raw data archive (transcripts, videos, notes)

## Timeline
- Week 1: Recruiting and screener
- Week 2: Moderated sessions
- Week 3: Unmoderated tasks + survey
- Week 4: Synthesis and report

## Instrumentation Plan
- Track `time_to_first_click`, `time_to_answer`, `scroll_depth`, `summary_expand_rate`.
- Log search queries and zero-result rate (anonymized).
- Record offline mode errors and recovery steps.

## Detailed Task Metrics (Per Task)
| Task | Success Definition | Failure Signals |
| --- | --- | --- |
| Find most recent attended show | Correct date + venue within 60s | 2+ dead-ends, wrong venue |
| Last played "The Stone" | Correct date within 45s | Confusion between "last played" vs "last performed" |
| Red Rocks top song | Correct song within 90s | Uses external search, gives up |
| Save a show | Confirmation + visible state | Save action not found |
| Offline lookup | Answers from cached data | "No data" confusion |

## Interview Guide (Core Questions)
1. "What tells you this answer is correct?"
2. "Where did you expect to find this information?"
3. "What would you want to see before sharing this?"
4. "What did you ignore because it felt like noise?"
5. "If this was offline, what would you still need?"

## Screener (Expanded)
- How many DMB shows have you attended? (0, 1–4, 5–10, 11+)
- How often do you look up setlists? (weekly, monthly, few times/year)
- Do you typically use mobile or desktop for music research?
- Do you follow Live Trax releases? (yes/no)
- Do you use accessibility tools? (screen reader, voice, large text)

## Note-Taking Template
- Task:
- Time to first click:
- Time to answer:
- Confidence (1–7):
- Trust signals mentioned:
- Friction points:
- Quotes:

## Synthesis Outputs
- Affinity clusters by persona + task
- 3-5 "never again" problems (critical blockers)
- 5 "quick wins" that improve time-to-answer
