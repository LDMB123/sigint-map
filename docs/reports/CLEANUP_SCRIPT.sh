#!/bin/bash
# Multi-Project Cleanup Script
# Generated: 2026-01-31
# Source: MULTI_PROJECT_ORGANIZATION_AUDIT.md
#
# IMPORTANT: Review each section before executing
# Run sections individually, not all at once

set -e  # Exit on error

WORKSPACE="/Users/louisherman/ClaudeCodeProjects"
cd "$WORKSPACE"

echo "Multi-Project Cleanup Script"
echo "============================"
echo ""
echo "This script performs cleanup across 5 projects."
echo "Review each phase before executing."
echo ""

# =============================================================================
# PHASE 1: CRITICAL FIXES (Safe - file organization)
# =============================================================================

phase1_imagen_experiments() {
    echo "Phase 1: imagen-experiments cleanup"
    echo "-------------------------------------"

    cd "$WORKSPACE/projects/imagen-experiments"

    # Create reports directory
    mkdir -p docs/reports

    # Move scattered reports to proper location
    echo "Moving reports to docs/reports/..."
    mv BATCH_121-150_COMPLETE.md docs/reports/batch-121-150-complete.md
    mv BATCH_151-180_READY.md docs/reports/batch-151-180-ready.md
    mv COMPRESSION_VALIDATION.md docs/reports/compression-validation.md
    mv OPTIMIZATION_INDEX.md docs/reports/optimization-index.md
    mv TOKEN_OPTIMIZATION_REPORT.md docs/reports/token-optimization-report.md
    mv COMPRESSION_EXECUTIVE_SUMMARY.txt docs/reports/compression-executive-summary.txt

    # Move script to scripts directory
    echo "Moving LAUNCH_COMMANDS.sh to scripts/..."
    mv LAUNCH_COMMANDS.sh scripts/launch-commands.sh

    # Remove empty files
    echo "Removing empty files..."
    rm docs/dive-bar-concepts-61-80.md
    rm docs/dive-bar-concepts-81-90.md

    echo "✓ imagen-experiments cleanup complete"
    echo ""
}

phase1_google_image_api_direct() {
    echo "Phase 1: google-image-api-direct cleanup"
    echo "-----------------------------------------"

    cd "$WORKSPACE/projects/google-image-api-direct"

    # Remove duplicate package file
    echo "Removing duplicate package file..."
    rm "package 2.json"

    echo "✓ google-image-api-direct cleanup complete"
    echo ""
}

phase1_gemini_mcp_server() {
    echo "Phase 1: gemini-mcp-server cleanup"
    echo "-----------------------------------"

    cd "$WORKSPACE/projects/gemini-mcp-server"

    # Add dist to gitignore if not already there
    if ! grep -q "^dist/$" .gitignore 2>/dev/null; then
        echo "Adding dist/ to .gitignore..."
        echo "dist/" >> .gitignore
    fi

    # Remove dist from git tracking (keep locally)
    echo "Removing dist/ from git tracking..."
    git rm -r --cached dist/ 2>/dev/null || echo "  (dist/ not tracked or already removed)"

    echo "✓ gemini-mcp-server cleanup complete"
    echo ""
}

# =============================================================================
# PHASE 2: PROJECT TRIAGE (Requires decision)
# =============================================================================

phase2_archive_google_image_api_direct() {
    echo "Phase 2: Archive google-image-api-direct"
    echo "-----------------------------------------"
    echo "WARNING: This will move the entire project to _archived/"
    echo "Project appears abandoned (no source code, only node_modules)"
    echo ""
    read -p "Archive google-image-api-direct? (y/N) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$WORKSPACE"
        mkdir -p _archived

        echo "Archiving project..."
        mv projects/google-image-api-direct _archived/google-image-api-direct-2025-01/

        echo "✓ Archived: _archived/google-image-api-direct-2025-01/"
        echo "  Space recovered: ~17 MB"
    else
        echo "Skipped archival"
    fi
    echo ""
}

phase2_archive_stitch_vertex_mcp() {
    echo "Phase 2: Archive stitch-vertex-mcp"
    echo "-----------------------------------"
    echo "WARNING: This will move the entire project to _archived/"
    echo "Project has minimal source code and no documentation"
    echo ""
    read -p "Archive stitch-vertex-mcp? (y/N) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$WORKSPACE"
        mkdir -p _archived

        echo "Archiving project..."
        mv projects/stitch-vertex-mcp _archived/stitch-vertex-mcp-2025-01/

        echo "✓ Archived: _archived/stitch-vertex-mcp-2025-01/"
        echo "  Space recovered: ~23 MB"
    else
        echo "Skipped archival - consider adding README.md to document project"
    fi
    echo ""
}

# =============================================================================
# PHASE 3: LONG-TERM OPTIMIZATION (Optional)
# =============================================================================

phase3_compress_logs() {
    echo "Phase 3: Compress old logs"
    echo "--------------------------"

    cd "$WORKSPACE/projects/imagen-experiments/_logs"

    echo "Compressing log files..."
    for log in *.log; do
        if [ -f "$log" ]; then
            gzip "$log"
            echo "  ✓ Compressed: $log → $log.gz"
        fi
    done

    echo "✓ Log compression complete"
    echo "  Space saved: ~90 KB"
    echo ""
}

phase3_create_scripts_readme() {
    echo "Phase 3: Create scripts documentation"
    echo "--------------------------------------"

    cd "$WORKSPACE/projects/imagen-experiments/scripts"

    if [ -f README.md ]; then
        echo "README.md already exists, skipping..."
    else
        cat > README.md << 'EOF'
# Scripts Directory

## Overview

This directory contains image generation scripts for the Imagen API experiments.

## Script Naming Conventions

- `GEN-*` - Generation scripts for specific batches
- `GENERATE-*` - Legacy generation scripts
- `ULTRA-*` - Ultra-realism batch scripts
- `PHYSICS-*` - Physics-based rendering scripts
- `OPTIMIZED-*` - Optimized prompt scripts

## Active Scripts

Review scripts to identify which are currently in use vs deprecated.

## Archive Policy

Scripts older than 3 months or marked deprecated should be moved to:
`_archived/scripts-YYYY-MM/`

## Dependencies

Most scripts require:
- Node.js
- Google Cloud credentials
- Imagen API access
EOF
        echo "✓ Created scripts/README.md"
    fi
    echo ""
}

# =============================================================================
# EXECUTION MENU
# =============================================================================

show_menu() {
    echo ""
    echo "Cleanup Phases:"
    echo "==============="
    echo ""
    echo "PHASE 1 - Critical Fixes (Safe)"
    echo "  1. imagen-experiments: Move reports, remove empty files"
    echo "  2. google-image-api-direct: Remove duplicate package.json"
    echo "  3. gemini-mcp-server: Gitignore build artifacts"
    echo "  4. Run all Phase 1 (recommended)"
    echo ""
    echo "PHASE 2 - Project Triage (Requires confirmation)"
    echo "  5. Archive google-image-api-direct (17 MB recovery)"
    echo "  6. Archive stitch-vertex-mcp (23 MB recovery)"
    echo "  7. Run all Phase 2"
    echo ""
    echo "PHASE 3 - Long-term Optimization (Optional)"
    echo "  8. Compress old logs (90 KB recovery)"
    echo "  9. Create scripts README"
    echo "  10. Run all Phase 3"
    echo ""
    echo "OTHER"
    echo "  11. Run ALL phases"
    echo "  12. Show space summary"
    echo "  0. Exit"
    echo ""
}

show_space_summary() {
    echo "Current Space Usage:"
    echo "--------------------"
    cd "$WORKSPACE/projects"
    du -sh imagen-experiments blaire-unicorn gemini-mcp-server google-image-api-direct stitch-vertex-mcp 2>/dev/null || true
    echo ""
    echo "Potential Recovery:"
    echo "  Phase 1: Minimal (file organization only)"
    echo "  Phase 2: Up to 40 MB (if both projects archived)"
    echo "  Phase 3: ~90 KB (log compression)"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    while true; do
        show_menu
        read -p "Select option (0-12): " choice

        case $choice in
            1) phase1_imagen_experiments ;;
            2) phase1_google_image_api_direct ;;
            3) phase1_gemini_mcp_server ;;
            4)
                phase1_imagen_experiments
                phase1_google_image_api_direct
                phase1_gemini_mcp_server
                echo "✓✓✓ All Phase 1 cleanup complete ✓✓✓"
                ;;
            5) phase2_archive_google_image_api_direct ;;
            6) phase2_archive_stitch_vertex_mcp ;;
            7)
                phase2_archive_google_image_api_direct
                phase2_archive_stitch_vertex_mcp
                echo "✓✓✓ All Phase 2 triage complete ✓✓✓"
                ;;
            8) phase3_compress_logs ;;
            9) phase3_create_scripts_readme ;;
            10)
                phase3_compress_logs
                phase3_create_scripts_readme
                echo "✓✓✓ All Phase 3 optimization complete ✓✓✓"
                ;;
            11)
                echo "Running ALL phases..."
                phase1_imagen_experiments
                phase1_google_image_api_direct
                phase1_gemini_mcp_server
                phase2_archive_google_image_api_direct
                phase2_archive_stitch_vertex_mcp
                phase3_compress_logs
                phase3_create_scripts_readme
                echo "✓✓✓ ALL cleanup complete ✓✓✓"
                ;;
            12) show_space_summary ;;
            0)
                echo "Exiting cleanup script"
                exit 0
                ;;
            *)
                echo "Invalid option. Please select 0-12."
                ;;
        esac

        read -p "Press Enter to continue..."
    done
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
