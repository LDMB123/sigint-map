#!/bin/bash
# Phase 4 cleanup script - remove archived directories

cd /Users/louisherman/ClaudeCodeProjects/docs/reports

echo "Removing archived directories..."
rm -rf optimization/
rm -rf home-inventory-2026-01-31/
rm -rf 20x-home-2026-01-31/
rm -rf structural-alignment-2026-01-31/
rm -rf skills/
rm -rf 20x-workspace-2026-01-31/
rm -rf audits/
rm -rf archive/

echo "Cleanup complete. Archives available in _archived/"
