---
name: mcp-integration
description: >
  Model Context Protocol (MCP) integration suite providing desktop automation,
  PDF processing, browser control, and Mac-specific automation capabilities.
  Use when tasks require system-level operations, file processing, or browser automation.
category: automation
tags: [mcp, desktop, automation, pdf, browser, macos]
requires:
  - Desktop Commander MCP extension
  - PDF Tools MCP extension (optional)
  - Playwright MCP extension (optional)
last_updated: 2026-01-30
---

# MCP Integration Skill

Comprehensive Model Context Protocol (MCP) integration suite for desktop automation, file processing, browser control, and Mac-specific workflows.

## Overview

This skill provides access to 4 MCP extension integrations:
1. **Desktop Commander** - File operations, terminal processes, system monitoring
2. **PDF Tools** - PDF processing, form automation, data extraction
3. **Playwright Browser** - Browser automation and testing
4. **Mac Automation** - macOS-specific system control

## When to Use

Use MCP Integration when you need to:
- **Analyze local files** (CSV, JSON, logs, databases)
- **Execute terminal commands** and manage processes
- **Process PDF files** (forms, data extraction, batch operations)
- **Automate browser interactions** (web scraping, testing)
- **Control macOS systems** (shortcuts, apps, accessibility)

## Quick Start

### File Analysis (Desktop Commander)
```
1. start_process("python3 -i") - Start Python REPL
2. interact_with_process(pid, "import pandas as pd")
3. interact_with_process(pid, "df = pd.read_csv('/path/file.csv')")
4. interact_with_process(pid, "df.describe()")
```

### PDF Processing (PDF Tools)
```
1. read_pdf_fields('template.pdf') - Get form fields
2. fill_pdf('template.pdf', 'output.pdf', field_values)
```

### Browser Automation (Playwright)
```
1. playwright_navigate('https://example.com')
2. playwright_screenshot('screenshot.png')
3. playwright_fill('input[name="search"]', 'query')
```

## Extension Reference

### 1. Desktop Commander
**File:** `desktop-commander.yaml`
**Tools:** 24 tools across 4 categories
- File operations (read, write, list, move, etc.)
- Process management (start, interact, monitor, kill)
- Content search (async search with pagination)
- Advanced (batch operations, stats, PDF generation)

**Critical Rule:** Always use Desktop Commander for local file analysis. Never use browser-based tools for local files.

### 2. PDF Tools
**File:** `pdf-tools.yaml`
**Tools:** 12 tools for PDF processing
- Reading & analysis (content, fields, validation)
- Form filling (one-time, profile-based)
- Profiles (save, load, list)
- Batch operations (CSV import/export)

### 3. Playwright Browser
**File:** `playwright-browser.yaml`
**Tools:** Browser automation and testing
- Navigation and interaction
- Screenshots and PDF generation
- Form filling and clicking
- Console monitoring

### 4. Mac Automation
**File:** `mac-automation.yaml`
**Tools:** macOS-specific automation
- Keyboard shortcuts
- App control
- Accessibility features
- System commands

## Common Workflows

### Workflow 1: Data Analysis Pipeline
```
# Desktop Commander + Python
1. list_directory('/data') - Find data files
2. start_process("python3 -i") - Start Python REPL
3. interact_with_process(pid, "import pandas as pd, matplotlib.pyplot as plt")
4. interact_with_process(pid, "df = pd.read_csv('/data/sales.csv')")
5. interact_with_process(pid, "df.groupby('region').sum().plot(kind='bar')")
6. interact_with_process(pid, "plt.savefig('/output/chart.png')")
```

### Workflow 2: PDF Form Automation
```
# PDF Tools
1. read_pdf_fields('tax-form.pdf') - Discover field names
2. save_profile('tax-2024', field_mapping) - Create reusable profile
3. bulk_fill_from_csv('tax-form.pdf', 'clients.csv', '/output') - Batch process
```

### Workflow 3: Web Scraping + Data Processing
```
# Playwright + Desktop Commander
1. playwright_navigate('https://data-source.com')
2. playwright_wait_for_selector('table.data')
3. playwright_evaluate('...extract table data...') - Get data
4. write_file('/data/scraped.json', data) - Save with Desktop Commander
5. start_process("python3 -i") - Process with pandas
```

### Workflow 4: Mac App Automation
```
# Mac Automation
1. mac_open_app('Safari')
2. mac_keyboard_shortcut('cmd+t') - New tab
3. mac_type_text('https://example.com')
4. mac_press_key('return')
```

## Best Practices

### 1. Tool Selection Priority
- **Local files** → Desktop Commander (NOT browser tools)
- **PDFs** → PDF Tools (specialized)
- **Web content** → Playwright Browser
- **Mac system** → Mac Automation

### 2. Path Handling
- Always use **absolute paths** (e.g., `/Users/name/file.csv`)
- Never use relative paths (unreliable across MCP contexts)

### 3. Process Management
- Start processes with `verbose_timing: true` for debugging
- Monitor process state for REPL detection
- Always clean up processes with `kill_process`

### 4. Error Handling
```
try {
  // MCP operation
} catch (error) {
  // Validate environment
  // Check file permissions
  // Verify MCP extension is running
}
```

## Integration Patterns

### Pattern 1: Cross-Extension Pipeline
```
Desktop Commander → PDF Tools → Desktop Commander
1. list_directory() - Find PDFs
2. read_pdf_content() - Extract data
3. write_file() - Save processed results
```

### Pattern 2: REPL + File Operations
```
Desktop Commander (dual use)
1. start_process("python3 -i") - REPL
2. interact_with_process() - Analysis
3. write_file() - Save outputs
```

### Pattern 3: Browser + Desktop Combo
```
Playwright → Desktop Commander
1. playwright_screenshot() - Capture
2. write_file() - Save locally
3. start_process("python3 -i") - Process image
```

## Configuration Notes

### Desktop Commander Config
```json
{
  "allowedDirectories": ["/Users/louisherman"],
  "fileReadLineLimit": 1000,
  "fileWriteLineLimit": 50,
  "defaultShell": "zsh"
}
```

### Security Considerations
- Desktop Commander has full home directory access
- Consider restricting `allowedDirectories` to project folders
- Review all terminal commands before execution
- MCP extensions run with user permissions

## Troubleshooting

### Issue: File Not Found
- **Cause:** Relative path used
- **Fix:** Use absolute path starting with `/`

### Issue: Process Timeout
- **Cause:** REPL prompt not detected
- **Fix:** Use `verbose_timing: true` to debug detection

### Issue: PDF Fill Failed
- **Cause:** Field name mismatch
- **Fix:** Run `read_pdf_fields()` first to verify field names

### Issue: Browser Command Failed
- **Cause:** Playwright extension not running
- **Fix:** Verify MCP server status in Claude Desktop settings

## File Index

All MCP integration files in `.claude/skills/mcp-integration/`:

1. **SKILL.md** - This master index (you are here)
2. **desktop-commander.yaml** - Desktop Commander integration (24 tools)
3. **pdf-tools.yaml** - PDF Tools integration (12 tools)
4. **playwright-browser.yaml** - Playwright browser automation
5. **mac-automation.yaml** - macOS-specific automation

## Quick Reference

**Desktop Commander:**
- File ops: `read_file`, `write_file`, `list_directory`
- Process: `start_process`, `interact_with_process`, `kill_process`
- Search: `start_search`, `get_more_search_results`

**PDF Tools:**
- Read: `read_pdf_content`, `read_pdf_fields`
- Fill: `fill_pdf`, `fill_with_profile`
- Batch: `bulk_fill_from_csv`, `extract_to_csv`

**Playwright:**
- Navigate: `playwright_navigate`, `playwright_click`
- Capture: `playwright_screenshot`, `playwright_pdf`
- Interact: `playwright_fill`, `playwright_evaluate`

**Mac Automation:**
- Apps: `mac_open_app`, `mac_quit_app`
- Input: `mac_keyboard_shortcut`, `mac_type_text`
- System: `mac_run_shortcut`, `mac_accessibility`

## Examples

### Example 1: CSV Analysis with Pandas
```python
# Desktop Commander workflow
1. start_process("python3 -i")
2. interact: "import pandas as pd"
3. interact: "df = pd.read_csv('/Users/name/data.csv')"
4. interact: "print(df.describe())"
5. interact: "df.groupby('category').mean()"
```

### Example 2: Batch PDF Form Filling
```
# PDF Tools workflow
1. read_pdf_fields('form-template.pdf')
2. save_profile('client-intake', {
     'client_name': 'Name',
     'client_email': 'Email'
   })
3. bulk_fill_from_csv(
     'form-template.pdf',
     'clients.csv',
     '/output/forms'
   )
```

### Example 3: Web Scraping + Analysis
```
# Playwright + Desktop Commander
1. playwright_navigate('https://data.example.com')
2. playwright_screenshot('/tmp/page.png')
3. data = playwright_evaluate('document.querySelector("table").innerText')
4. write_file('/data/scraped.txt', data)
5. start_process("python3 -i")
6. interact: "import pandas as pd"
7. interact: "df = pd.read_csv('/data/scraped.txt')"
```

## Related Skills

- **parallel-agent-validator** - Validate MCP configurations
- **cache-warmer** - Pre-load MCP tool metadata
- **token-optimizer** - Optimize MCP tool call patterns

## Performance Tips

1. **Batch operations** - Use `read_multiple_files` instead of loops
2. **Cache metadata** - Read PDF fields once, fill many times
3. **Reuse processes** - Keep REPL alive for multiple operations
4. **Parallel searches** - Start multiple searches concurrently

## Version History

- **2026-01-30** - Initial SKILL.md creation, indexed 4 YAML files
- Consolidated Desktop Commander (24 tools)
- Consolidated PDF Tools (12 tools)
- Added Playwright and Mac Automation references

---

**Skill Maintainer:** Full-Stack Developer
**MCP Protocol Version:** 1.0
**Extensions Required:** Desktop Commander (required), PDF Tools (optional), Playwright (optional)
