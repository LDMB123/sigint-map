---
name: mcp-integration
description: >
  Model Context Protocol (MCP) integration suite providing desktop automation,
  PDF processing, browser control, and Mac-specific automation capabilities.
  Use when tasks require system-level operations, file processing, or browser automation.
disable-model-invocation: false
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# MCP Integration Skill

MCP extension integration for desktop automation, file processing, browser control, and macOS workflows.

## Extensions

1. **Desktop Commander** (`desktop-commander.yaml`) - 24 tools: file ops, process management, search, batch ops
2. **PDF Tools** (`pdf-tools.yaml`) - 12 tools: read, fill, profiles, batch
3. **Playwright Browser** (`playwright-browser.yaml`) - Navigation, screenshots, form filling, console
4. **Mac Automation** (`mac-automation.yaml`) - Keyboard shortcuts, app control, accessibility

## Tool Selection Priority

- **Local files** -> Desktop Commander (NOT browser tools)
- **PDFs** -> PDF Tools
- **Web content** -> Playwright Browser
- **Mac system** -> Mac Automation

## Quick Reference

| Extension | Key Tools |
|-----------|-----------|
| Desktop Commander | `read_file`, `write_file`, `list_directory`, `start_process`, `interact_with_process` |
| PDF Tools | `read_pdf_content`, `read_pdf_fields`, `fill_pdf`, `bulk_fill_from_csv` |
| Playwright | `playwright_navigate`, `playwright_click`, `playwright_fill`, `playwright_screenshot` |
| Mac Automation | `mac_open_app`, `mac_keyboard_shortcut`, `mac_type_text` |

## Common Workflows

1. **Data Analysis**: `list_directory` -> `start_process("python3 -i")` -> pandas analysis -> save results
2. **PDF Automation**: `read_pdf_fields` -> `save_profile` -> `bulk_fill_from_csv`
3. **Web Scraping**: `playwright_navigate` -> extract data -> `write_file` -> process
4. **Mac Control**: `mac_open_app` -> `mac_keyboard_shortcut` -> `mac_type_text`

## Rules

- Always use **absolute paths** (e.g., `/Users/name/file.csv`)
- Use `verbose_timing: true` for process debugging
- Clean up processes with `kill_process`
- Desktop Commander config: `allowedDirectories` set in `~/.claude.json`

## Supporting Files

See YAML files in this directory for detailed tool documentation.
