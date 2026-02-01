#!/bin/bash
# Cleanup superseded backups that are now compressed
# These directories are archived in superseded-backups-2026-01-31.tar.gz

cd /Users/louisherman/ClaudeCodeProjects/_archived

echo "Removing superseded backup directories..."
rm -rf audit_files_2026-01-25
rm -rf orphan_cleanup_2026-01-30
rm -rf pre-migration-backup-2026-01-30
rm -rf pre-optimization-backup-2026-01-31
rm -rf skills_backup_20260130

echo "Cleanup complete. Compressed backups available in superseded-backups-2026-01-31.tar.gz"
