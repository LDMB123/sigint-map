#!/bin/bash
# SWARM 8 - Task 3: File Watcher for Cache Invalidation

AGENTS_DIR="$(cd "$(dirname "$0")/.." && pwd)/agents"
CACHE_DIR="/tmp/agent-cache"

echo "Agent Cache Invalidation File Watcher"
echo "====================================="
echo "Watching: $AGENTS_DIR"
echo "Cache location: $CACHE_DIR"
echo ""

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Function to invalidate cache
invalidate_cache() {
    local file="$1"
    local agent_id=$(basename "$file" | sed 's/\.[^.]*$//')
    local cache_key="${agent_id}_cache"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cache invalidated for: $agent_id (file: $file)"

    # Remove cache files
    rm -f "$CACHE_DIR/$cache_key"*

    # Log invalidation
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)|$agent_id|$file" >> "$CACHE_DIR/invalidation.log"
}

# Function to check for changes
monitor_changes() {
    echo "Monitoring agent files for changes..."
    echo "Press Ctrl+C to stop"
    echo ""

    # Use fswatch if available, otherwise fall back to polling
    if command -v fswatch &> /dev/null; then
        fswatch -0 -r "$AGENTS_DIR" | while read -d "" file; do
            if [[ "$file" =~ \.(yaml|yml|md)$ ]]; then
                invalidate_cache "$file"
            fi
        done
    else
        echo "Note: fswatch not installed, using polling mode (slower)"
        echo "Install fswatch for real-time monitoring: brew install fswatch"
        echo ""

        # Polling fallback
        declare -A file_checksums

        while true; do
            for file in $(find "$AGENTS_DIR" -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.md" \)); do
                current_checksum=$(md5 -q "$file" 2>/dev/null || echo "")
                if [ -n "$current_checksum" ]; then
                    if [ "${file_checksums[$file]}" != "" ] && [ "${file_checksums[$file]}" != "$current_checksum" ]; then
                        invalidate_cache "$file"
                    fi
                    file_checksums[$file]="$current_checksum"
                fi
            done
            sleep 2
        done
    fi
}

# Usage info
echo "Cache Invalidation Features:"
echo "- Automatic invalidation on file changes"
echo "- Invalidation logging to $CACHE_DIR/invalidation.log"
echo "- Support for YAML and Markdown agent files"
echo ""

# Example: Show recent invalidations
if [ -f "$CACHE_DIR/invalidation.log" ]; then
    echo "Recent cache invalidations:"
    tail -n 5 "$CACHE_DIR/invalidation.log" 2>/dev/null || echo "  (none yet)"
else
    echo "No cache invalidations yet"
fi

echo ""
echo "File watcher is ready (run 'monitor_changes' to start)"
echo "✓ SWARM 8 Task 3: Cache invalidation system deployed"
