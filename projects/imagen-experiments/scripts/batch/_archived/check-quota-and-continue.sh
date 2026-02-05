#!/bin/bash

# Check quota every 4 minutes and auto-continue when it resets

IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
TEST_PROMPT="Woman in burgundy wrap dress at Austin bar. Test quota check. CRITICAL: preserve exact facial features of reference woman."
CHECK_INTERVAL=240  # 4 minutes in seconds

echo "================================================================"
echo "QUOTA MONITOR - Checking every 4 minutes"
echo "================================================================"
echo "Will automatically continue generation when quota resets"
echo "Press Ctrl+C to stop monitoring"
echo "================================================================"
echo ""

attempt=1
while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] Attempt #$attempt - Testing API quota..."

    # Test with a single generation
    if node nanobanana-direct.js edit "$IMAGE" "$TEST_PROMPT" 2>&1 | grep -q "✅ Final image"; then
        echo ""
        echo "================================================================"
        echo "✅ QUOTA RESET DETECTED!"
        echo "================================================================"
        echo "API is working again. Starting retry script..."
        echo ""

        # Start the retry script
        ./RETRY-failed-concepts.sh

        echo ""
        echo "Retry complete. Now starting batch 31-60..."
        ./GENERATE-concepts-31-60.sh

        echo ""
        echo "================================================================"
        echo "ALL GENERATION COMPLETE!"
        echo "================================================================"
        exit 0
    else
        echo "❌ Still rate limited. Waiting 4 minutes before next check..."
        echo ""
        attempt=$((attempt + 1))
        sleep $CHECK_INTERVAL
    fi
done
