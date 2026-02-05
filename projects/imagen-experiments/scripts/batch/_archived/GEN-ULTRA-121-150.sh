#!/bin/bash
set -e

WRAPPER_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"
CONCEPTS_FILE="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/docs/ULTRA-MICROSTRUCTURE-concepts-121-150.md"
REFERENCE_IMAGE="/Users/louisherman/Documents/467634893_10106888735450892_6933745151644250627_n.jpeg"

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

echo "=== GENERATING CONCEPTS 121-150 ===" | tee ~/gen-ultra-121-150.log
echo "Reference: $REFERENCE_IMAGE" | tee -a ~/gen-ultra-121-150.log
echo "" | tee -a ~/gen-ultra-121-150.log

for concept_num in {121..150}; do
    echo "" | tee -a ~/gen-ultra-121-150.log
    echo "Concept $concept_num..." | tee -a ~/gen-ultra-121-150.log

    PROMPT=$(extract_concept $concept_num)

    if [ -z "$PROMPT" ]; then
        echo "  ✗ FAILED: Concept $concept_num (extraction failed)" | tee -a ~/gen-ultra-121-150.log
        continue
    fi

    node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT" 2>&1 | tee -a ~/gen-ultra-121-150.log

    if [ $? -eq 0 ]; then
        echo "  ✓ SUCCESS: Concept $concept_num" | tee -a ~/gen-ultra-121-150.log
    else
        echo "  ✗ FAILED: Concept $concept_num" | tee -a ~/gen-ultra-121-150.log
    fi

    # 120-second delay between concepts
    sleep 120
done

echo "" | tee -a ~/gen-ultra-121-150.log
echo "Done: Batch 121-150 complete" | tee -a ~/gen-ultra-121-150.log

# Count results
SUCCESS=$(grep "✓ SUCCESS" ~/gen-ultra-121-150.log | wc -l | tr -d ' ')
FAILED=$(grep "✗ FAILED" ~/gen-ultra-121-150.log | wc -l | tr -d ' ')
echo "Results: $SUCCESS success, $FAILED failed" | tee -a ~/gen-ultra-121-150.log
