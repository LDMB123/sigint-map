#!/bin/bash

# Ultra-Microstructure Batch 91-120 Generation Script
# 30 concepts with thigh-high hosiery focus, rotating references

WRAPPER_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"
CONCEPTS_FILE="/Users/louisherman/ClaudeCodeProjects/ULTRA-MICROSTRUCTURE-concepts-91-120.md"
OUTPUT_DIR="$HOME/nanobanana-output/ultra-91-120"

# Reference images for each range
REF_91_100="/Users/louisherman/Documents/LWMMoms - 374.jpeg"      # Brunette
REF_101_110="/Users/louisherman/Documents/Image 56.jpeg"          # Second reference
REF_111_120="/Users/louisherman/Documents/463976510_8492755290802616_5918817029264776918_n.jpeg"  # Blonde

mkdir -p "$OUTPUT_DIR"

log_info() { echo -e "\033[0;34m[$(date +'%Y-%m-%d %H:%M:%S')]\033[0m INFO: $1"; }
log_success() { echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')]\033[0m SUCCESS: $1"; }
log_error() { echo -e "\033[0;31m[$(date +'%Y-%m-%d %H:%M:%S')]\033[0m ERROR: $1"; }

extract_concept() {
    local concept_num=$1
    awk -v num="$concept_num" '
        /^## CONCEPT / {
            if ($3 == num) { found=1 }
            else if (found) { exit }
        }
        found { print }
    ' "$CONCEPTS_FILE"
}

get_reference_image() {
    local concept_num=$1
    if [ $concept_num -ge 91 ] && [ $concept_num -le 100 ]; then
        echo "$REF_91_100"
    elif [ $concept_num -ge 101 ] && [ $concept_num -le 110 ]; then
        echo "$REF_101_110"
    elif [ $concept_num -ge 111 ] && [ $concept_num -le 120 ]; then
        echo "$REF_111_120"
    fi
}

echo "========================================"
echo "ULTRA-MICROSTRUCTURE BATCH 91-120"
echo "========================================"
echo "Concepts: 30 (thigh-high hosiery focus)"
echo "References: Rotating (91-100, 101-110, 111-120)"
echo "Started: $(date)"
echo ""

SUCCESS=0
FAILED=0

for concept_num in {91..120}; do
    log_info "Processing CONCEPT $concept_num..."

    concept_text=$(extract_concept $concept_num)
    if [ -z "$concept_text" ]; then
        log_error "Could not extract CONCEPT $concept_num"
        ((FAILED++))
        continue
    fi

    reference_image=$(get_reference_image $concept_num)
    log_info "Using reference: $(basename "$reference_image")"

    if PROMPT_TEXT="$concept_text" && node "$WRAPPER_SCRIPT" edit "$reference_image" "$PROMPT_TEXT"; then
        log_success "CONCEPT $concept_num generated successfully"
        ((SUCCESS++))

        latest_image=$(ls -t ~/nanobanana-output/nanobanana_*.png 2>/dev/null | head -1)
        if [ -n "$latest_image" ]; then
            file_size=$(ls -lh "$latest_image" | awk '{print $5}')
            log_info "Output: $latest_image (Size: $file_size)"
        fi
    else
        log_error "Failed to generate CONCEPT $concept_num"
        ((FAILED++))
    fi

    log_info "Waiting 120s before next generation..."
    sleep 120
done

echo ""
echo "========================================"
echo "GENERATION SUMMARY"
echo "========================================"
echo "Completed: $(date)"
echo "Total Concepts:    30"
echo "Successful:        $SUCCESS"
echo "Failed:            $FAILED"
echo ""
echo "Output Directory: $OUTPUT_DIR"
echo "========================================"
