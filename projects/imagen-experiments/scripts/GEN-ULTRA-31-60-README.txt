================================================================================
GEN-ULTRA-31-60.sh - GENERATION SCRIPT DOCUMENTATION
================================================================================

CREATED: 2026-01-29
PURPOSE: Generate 30 ultra-microstructure enhanced image variations using 
         research-backed prompts addressing skin texture detail and realism.

================================================================================
SCRIPT LOCATION
================================================================================
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/GEN-ULTRA-31-60.sh

================================================================================
CONFIGURATION
================================================================================

Reference Image:
  /Users/louisherman/Documents/LWMMoms - 374.jpeg
  (brunette reference for consistent facial features)

Concepts File:
  /Users/louisherman/ClaudeCodeProjects/ULTRA-MICROSTRUCTURE-concepts-31-60.md
  (30 concepts numbered CONCEPT 31-60 with enhanced skin microstructure prompts)

4K Wrapper:
  /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js
  (Forces 4K output, disables prompt rewriting to preserve imperfections)

Output Directory:
  /Users/louisherman/nanobanana-output/ultra-31-60/
  (Ready for images)

Generation Delay:
  120 seconds between concepts (allows API rate limiting)

================================================================================
FEATURES
================================================================================

✓ Extracts all 30 concepts from markdown file dynamically
✓ Validates all prerequisites before starting
✓ Timestamped logging with color-coded output
✓ Error handling - continues on individual concept failure
✓ Delay management - 120-second waits between generations
✓ Success/failure tracking with summary statistics
✓ Proper multi-line prompt handling via temporary files
✓ Output size reporting for each generated image
✓ Graceful cleanup of temporary files

================================================================================
USAGE
================================================================================

The script is ready but NOT YET STARTED (as requested).

To start generation:
  /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/GEN-ULTRA-31-60.sh

The script will:
  1. Display header with configuration
  2. Validate prerequisites (image, concepts file, Node.js, wrapper script)
  3. Create output directory if needed
  4. Process CONCEPT 31-60 sequentially:
     - Extract concept from markdown
     - Generate image via nanobanana-4k-edit.js
     - Wait 120 seconds before next concept (except last)
  5. Display final summary with success/failure counts

Estimated runtime: ~60 minutes (30 concepts × 2min generation + 120s delays)

================================================================================
ERROR HANDLING
================================================================================

The script handles errors gracefully:
  - Missing prerequisites: Stops with clear error message
  - Missing concepts: Logs error, increments failure counter, continues
  - Generation failures: Logs error, continues with next concept
  - Invalid prompt files: Cleaned up automatically
  - Temporary files: Always removed after use

Failure tracking is reported in final summary.

================================================================================
OUTPUT
================================================================================

Images are saved to:
  ~/nanobanana-output/nanobanana_YYYYMMDD_HHMMSS_XXXXX.png

Copy to:
  /Users/louisherman/nanobanana-output/ultra-31-60/

The script reports the output path for each successful generation.

================================================================================
LOGGING
================================================================================

Console output includes:
  [YYYY-MM-DD HH:MM:SS] LEVEL: message
  
Levels:
  INFO:    General information and progress
  SUCCESS: Concept generated successfully
  WARNING: Non-critical issues
  ERROR:   Generation or validation failures

Color coding:
  BLUE:   Info messages
  GREEN:  Success messages
  YELLOW: Warnings
  RED:    Errors

================================================================================
SCRIPT STATISTICS
================================================================================

File size:   7.8 KB
Lines:       ~450
Language:    Bash with POSIX compatibility
Executable:  YES (chmod +x applied)

Dependencies:
  - Bash 4.0+
  - Node.js with nanobanana-direct.js
  - Gemini 3 Pro API access (via nanobanana-4k-edit.js)
  - curl (for API calls)

================================================================================
NEXT STEPS
================================================================================

1. Review this documentation
2. When ready to generate:
   /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/GEN-ULTRA-31-60.sh

3. Monitor progress via console output
4. Check results in ~/nanobanana-output/
5. Copy successful outputs to /Users/louisherman/nanobanana-output/ultra-31-60/

================================================================================
