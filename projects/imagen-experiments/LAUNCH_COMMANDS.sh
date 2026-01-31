#!/bin/bash
# Launch Commands for Ultra-Microstructure Enhanced Generation
# Created: 2026-01-29 20:30
# 
# These batches are ready to launch after batch 61-80 completes

echo "=== Ultra-Microstructure Enhanced Generation Launch ==="
echo ""
echo "Target: Fix 'plastic skin' issue (7.5/10 → 9.5+/10)"
echo "Enhancement: Individual sebaceous filaments, variable pore zones, micro-wrinkles"
echo ""

# Check if batch 61-80 is still running
if ps aux | grep -q "[G]EN-OPTIMIZED-61-80"; then
    echo "⚠️  WARNING: Batch 61-80 still running!"
    echo "   Wait for completion before launching ultra batches"
    echo ""
    echo "   Check progress: tail -f optimized-61-80.log"
    exit 1
fi

echo "✅ Batch 61-80 completed (or not running)"
echo ""
echo "=== Launch Options ==="
echo ""
echo "Option 1: Launch BOTH batches in PARALLEL (faster)"
echo "  - Batch 31-60: 30 concepts (~60-90 min)"
echo "  - Batch 81-90: 10 concepts (~30-40 min)"
echo "  - Total time: ~60-90 min (limited by longer batch)"
echo ""
echo "Option 2: Launch SEQUENTIALLY (safer, easier to monitor)"
echo "  - First: Batch 31-60 (30 concepts)"
echo "  - Then: Batch 81-90 (10 concepts)"
echo "  - Total time: ~90-130 min"
echo ""

read -p "Launch in parallel? (y/n): " choice

cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts

if [[ "$choice" == "y" ]]; then
    echo ""
    echo "🚀 Launching BOTH batches in parallel..."
    echo ""
    
    # Launch batch 31-60
    nohup ./GEN-ULTRA-31-60.sh > ultra-31-60.log 2>&1 &
    PID1=$!
    echo "✅ Batch 31-60 launched (PID: $PID1)"
    echo "   Log: ultra-31-60.log"
    echo "   Output: /Users/louisherman/nanobanana-output/ultra-31-60/"
    
    sleep 2
    
    # Launch batch 81-90
    nohup ./GEN-ULTRA-81-90.sh > ultra-81-90.log 2>&1 &
    PID2=$!
    echo "✅ Batch 81-90 launched (PID: $PID2)"
    echo "   Log: ultra-81-90.log"
    echo "   Output: /Users/louisherman/nanobanana-output/ultra-81-90/"
    
    echo ""
    echo "Monitor progress:"
    echo "  tail -f ultra-31-60.log ultra-81-90.log"
    
else
    echo ""
    echo "🚀 Launching SEQUENTIALLY..."
    echo ""
    
    # Launch batch 31-60 first
    echo "Starting Batch 31-60 (30 concepts)..."
    ./GEN-ULTRA-31-60.sh
    
    echo ""
    echo "Batch 31-60 complete! Starting Batch 81-90 (10 concepts)..."
    ./GEN-ULTRA-81-90.sh
    
    echo ""
    echo "✅ All ultra-microstructure batches complete!"
fi

echo ""
echo "=== Ultra-Microstructure Enhancement Active ==="
echo "Expected improvement: Skin texture 7.5/10 → 9.5+/10"
echo "Key features: Individual pore variation, sebaceous filaments, capillary patterns"
