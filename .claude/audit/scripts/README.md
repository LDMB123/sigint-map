# Audit Scripts

**Purpose**: One-time audit and analysis scripts used during repository optimization phases.

## Contents

This directory contains Python scripts used for:
- Agent validation and analysis
- Coordination map building
- Redundancy detection
- Phase report generation
- Schema validation
- Improvement implementation

## Usage

These scripts were used during specific cleanup phases and are archived here for reference. They are **not part of the active codebase** and should not be run regularly.

If you need to run any of these scripts:
```bash
cd .claude/audit/scripts
python3 <script-name>.py
```

## Scripts Inventory

Total: 17 Python scripts

**Categories**:
- Agent analysis: parse-agents.py, validate-subagents.py, check-agent-reachability.py
- Coordination: build-coordination-map.py, add-collaboration-contracts.py
- Redundancy: redundancy-analysis.py
- Phase reports: generate-phase2-report.py, generate-completion-report.py
- Improvements: implement-improvements.py
- Plus 8 additional utility scripts

## Maintenance

Last organized: 2026-01-25 (Phase 3, Batch 4)

These scripts are kept for:
1. Historical reference
2. Potential future adaptation
3. Documentation of analysis methodology

If similar analysis is needed in the future, these scripts can serve as templates.
