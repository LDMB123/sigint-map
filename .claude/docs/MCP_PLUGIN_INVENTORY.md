# MCP Plugin Inventory & Organization

**Last Updated:** 2026-01-30
**Total Plugins:** 9 (2 manual + 7 marketplace)

---

## Manual MCP Servers

### 1. Playwright (Browser Automation)
**Configuration:**
```json
{
  "command": "/Users/louisherman/node/bin/node",
  "args": ["/Users/louisherman/node/bin/mcp-server-playwright"]
}
```

**Tools Provided:**
- Browser navigation and interaction
- Screenshot capture
- Page content extraction
- Form filling and submission
- JavaScript execution

**Use Cases:**
- Web scraping
- Automated testing
- Browser automation tasks

**Status:** ✅ Active

---

### 2. Stitch (Vertex AI / Google Labs)
**Configuration:**
```json
{
  "command": "/Users/louisherman/node/bin/node",
  "args": ["/Users/louisherman/Documents/stitch-vertex-mcp/index.js"],
  "env": {
    "STITCH_API_KEY": "${STITCH_API_KEY}"
  }
}
```

**Security Status:** ⚠️ API key needs migration to environment variable

**Tools Provided:**
- Google Vertex AI integration
- Custom AI model access

**Use Cases:**
- AI/ML model integration
- Google Cloud AI services

**Status:** ✅ Active (needs security fix)

---

## Marketplace Extensions

### 3. Desktop Commander
**Installation Date:** 2025-11-24
**Version:** 0.2.23
**Author:** wonderwhy-er
**Extension ID:** ant.dir.gh.wonderwhy-er.desktopcommandermcp

**Tools Provided (24 total):**

**File Operations:**
- `read_file` - Read file contents with line offsets
- `write_file` - Write/create files
- `list_directory` - List directory contents with metadata
- `create_directory` - Create directories
- `move_file` - Move/rename files
- `get_file_info` - Get file metadata

**Terminal & Processes:**
- `start_process` - Start terminal processes with intelligent state detection
- `interact_with_process` - Send input to running processes
- `read_process_output` - Get process output
- `list_processes` - List running processes
- `kill_process` - Terminate processes
- `force_terminate` - Force kill processes

**Advanced Features:**
- `start_search` - Start file content searches
- `list_searches` - List active searches
- `get_more_search_results` - Paginate search results
- `stop_search` - Cancel searches
- `read_multiple_files` - Batch file reading

**Configuration & Monitoring:**
- `get_config` - Get server configuration
- `get_prompts` - List available prompts
- `get_recent_tool_calls` - Tool usage history
- `get_usage_stats` - Usage statistics
- `give_feedback_to_desktop_commander` - Submit feedback
- `list_sessions` - Session history
- `write_pdf` - PDF generation

**Configuration:**
```json
{
  "blockedCommands": [],
  "defaultShell": "zsh",
  "allowedDirectories": [
    "/Users/louisherman"
  ],
  "fileReadLineLimit": 1000,
  "fileWriteLineLimit": 50,
  "telemetryEnabled": true
}
```

**Use Cases:**
- File management
- Terminal automation
- Process control
- System monitoring
- Local file analysis (CSV, JSON, logs)

**Recommended For:**
- Data analysis workflows
- File processing automation
- System administration tasks

**Status:** ✅ Active

**Notes:**
- Most comprehensive MCP extension
- Overlaps with Filesystem extension (consider disabling Filesystem)
- Preferred tool for local file analysis (NOT browser analysis tool)

---

### 4. Filesystem
**Installation Date:** 2025-10-15
**Version:** 0.1.6
**Author:** Anthropic (Official)
**Extension ID:** ant.dir.ant.anthropic.filesystem

**Tools Provided (11 total):**
- `read_file`
- `read_multiple_files`
- `write_file`
- `edit_file`
- `create_directory`
- `list_directory`
- `move_file`
- `search_files`
- `get_file_info`
- `list_allowed_directories`
- `directory_tree`

**Configuration:**
```json
{
  "allowed_directories": [
    "/System",
    "/Users/louisherman",
    "/Users/louisherman/Documents"
  ]
}
```

**Security Recommendation:** ⚠️ Restrict to specific project directories

**Suggested Configuration:**
```json
{
  "allowed_directories": [
    "/Users/louisherman/ClaudeCodeProjects",
    "/Users/louisherman/Documents",
    "/Users/louisherman/Downloads"
  ]
}
```

**Use Cases:**
- Basic file operations
- Directory traversal
- File search

**Status:** ✅ Active (consider disabling - redundant with Desktop Commander)

**Redundancy Note:** Desktop Commander provides all filesystem tools plus terminal access

---

### 5. PDF Tools
**Installation Date:** 2025-10-28
**Version:** 0.4.0
**Author:** silverstein
**Extension ID:** ant.dir.gh.silverstein.pdf-filler-simple

**Tools Provided (12 total):**
- `read_pdf_content` - Extract text and metadata
- `read_pdf_fields` - Read form field values
- `fill_pdf` - Fill PDF forms
- `fill_with_profile` - Fill using saved profiles
- `save_profile` - Save field mappings
- `load_profile` - Load saved profiles
- `list_profiles` - List all profiles
- `list_pdfs` - List PDFs in directory
- `extract_to_csv` - Export form data to CSV
- `bulk_fill_from_csv` - Batch fill from CSV
- `validate_pdf` - Validate PDF structure
- `get_pdf_resource_uri` - Get PDF URIs for MCP

**Pre-configured Prompts (10 total):**
1. Extract text from PDF
2. Read form fields
3. Fill PDF form
4. Create reusable profile
5. Use saved profile
6. List available profiles
7. Extract data to CSV
8. Batch fill from CSV
9. Validate PDF structure
10. Compare PDFs

**Use Cases:**
- PDF form filling automation
- Data extraction from PDFs
- Batch PDF processing
- PDF validation

**Status:** ✅ Active

---

### 6. iMessage
**Installation Date:** 2025-10-15
**Version:** 0.1.10
**Author:** Anthropic (Official)
**Extension ID:** ant.dir.ant.anthropic.imessage

**Tools Provided (4 total):**
- `send_imessage` - Send messages
- `search_contacts` - Search contact list
- `read_imessages` - Read message history
- `get_unread_imessages` - Get unread messages

**macOS Permissions Required:**
- Full Disk Access
- Contacts access

**Use Cases:**
- Message automation
- Contact management
- Message retrieval

**Status:** ✅ Active (requires macOS permissions)

---

### 7. Apple Notes
**Installation Date:** 2025-10-15
**Version:** 0.1.7
**Author:** Anthropic (Official)
**Extension ID:** ant.dir.ant.anthropic.notes

**Tools Provided (4 total):**
- `list_notes` - List all notes
- `get_note_content` - Read note content
- `add_note` - Create new notes
- `update_note_content` - Update existing notes

**Use Cases:**
- Note management
- Content extraction
- Knowledge base integration

**Status:** ✅ Active (requires macOS permissions)

---

### 8. Control your Mac (osascript)
**Installation Date:** 2025-10-15
**Version:** 0.0.1
**Author:** Kenneth Lien (k6l3)
**Extension ID:** ant.dir.gh.k6l3.osascript

**Tools Provided (1 total):**
- `osascript` - Execute AppleScript commands

**Security Level:** ⚠️ HIGH RISK - Full system automation access

**Use Cases:**
- Mac automation
- App control
- System configuration

**Status:** ✅ Active (use with caution)

---

### 9. Airbnb Search & Listings
**Installation Date:** 2025-10-15
**Version:** 0.1.2
**Author:** openbnb-org
**Extension ID:** ant.dir.gh.openbnb-org.mcp-server-airbnb

**Tools Provided (2 total):**
- `airbnb_search` - Search vacation rentals
- `airbnb_listing_details` - Get listing details

**Configuration:**
```json
{
  "ignore_robots_txt": true
}
```

**Security Recommendation:** ⚠️ Set `ignore_robots_txt: false` for ToS compliance

**Use Cases:**
- Vacation rental research
- Property comparison
- Travel planning

**Status:** ✅ Active (needs config update)

---

## Plugin Categories

### System & File Management (3 plugins)
- Desktop Commander (comprehensive)
- Filesystem (basic - redundant)
- PDF Tools (specialized)

### Communication (1 plugin)
- iMessage

### Knowledge Management (1 plugin)
- Apple Notes

### Automation (3 plugins)
- Playwright (browser)
- osascript (Mac system)
- Stitch (AI/ML)

### Data Services (1 plugin)
- Airbnb Search

---

## Optimization Recommendations

### 1. Reduce Redundancy
**Action:** Disable Filesystem extension
**Reason:** Desktop Commander provides all filesystem tools plus terminal access
**Benefit:** Reduce tool namespace pollution, simpler configuration

### 2. Secure Credentials
**Action:** Move Stitch API key to environment variable
**Status:** ⚠️ CRITICAL - Not yet implemented
**Implementation:**
```bash
# Add to ~/.zshrc
export STITCH_API_KEY="AQ.Ab8RN6I8z3TJfpGTLaKyJW9PKxkypbqElTjXlXtPXY_jl6DXjg"
```

### 3. Restrict Filesystem Access
**Current:** Full `/System` and `/Users/louisherman` access
**Recommended:** Limit to project directories only
**Benefit:** Reduce security surface area

### 4. Fix Airbnb Configuration
**Action:** Set `ignore_robots_txt: false`
**Reason:** ToS compliance
**Impact:** Low (still functional)

### 5. Create Integration Skills
**Missing Skills:**
- desktop-commander-integration
- pdf-processing
- imessage-automation
- apple-notes-integration
- mac-automation (osascript)
- airbnb-research

**Benefit:** Standardized usage patterns, better documentation

---

## Tool Usage Priorities

### For File Operations
**Priority 1:** Desktop Commander (comprehensive)
**Priority 2:** PDF Tools (PDF-specific)
**Avoid:** Filesystem (redundant)

### For Browser Tasks
**Priority 1:** Playwright (manual config)
**Priority 2:** Desktop Commander (process-based alternative)

### For Mac Automation
**Priority 1:** osascript (system-level)
**Priority 2:** Desktop Commander (terminal-based)

### For AI Integration
**Priority 1:** Stitch (custom models)
**Priority 2:** Built-in Claude capabilities

---

## Security Assessment

| Plugin | Risk Level | Mitigation |
|--------|-----------|------------|
| Desktop Commander | High | Restrict allowed directories |
| osascript | Critical | Review all AppleScript before execution |
| Filesystem | Medium | Restrict allowed directories |
| Stitch | High | **Move API key to env var** |
| Playwright | Medium | Sandboxed browser context |
| PDF Tools | Low | File-based operations only |
| iMessage | Medium | Requires macOS permissions |
| Apple Notes | Low | Read/write notes only |
| Airbnb | Low | Public API access |

---

## Integration Status

| Plugin | Skill Created | Documentation | Optimized |
|--------|--------------|---------------|-----------|
| Desktop Commander | ❌ Needed | ❌ Needed | ❌ Pending |
| Filesystem | ❌ N/A (disable) | ✅ Official | ❌ Pending |
| PDF Tools | ❌ Needed | ✅ Built-in prompts | ✅ Done |
| Playwright | ❌ Needed | ✅ Existing | ✅ Done |
| Stitch | ❌ Needed | ❌ Needed | ❌ Critical |
| iMessage | ❌ Needed | ✅ Official | ✅ Done |
| Apple Notes | ❌ Needed | ✅ Official | ✅ Done |
| osascript | ❌ Needed | ❌ Needed | ✅ Done |
| Airbnb | ❌ Needed | ❌ Needed | ❌ Pending |

---

## Next Steps

1. **Immediate (Security):**
   - [ ] Move Stitch API key to environment variable
   - [ ] Restrict Filesystem allowed directories
   - [ ] Set Airbnb `ignore_robots_txt: false`

2. **Short-term (Organization):**
   - [ ] Create MCP integration skills
   - [ ] Disable Filesystem extension
   - [ ] Document Desktop Commander workflows

3. **Long-term (Optimization):**
   - [ ] Create unified MCP integration guide
   - [ ] Establish plugin governance policy
   - [ ] Monitor tool usage metrics

---

**End of Inventory**
