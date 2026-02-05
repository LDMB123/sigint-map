#!/bin/bash

# Wrapper script that ensures reference woman's face is maintained in all 30 concepts
# Reads prompts from markdown files and appends face-lock instruction

IMAGE_PATH="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=75

# Face-lock instruction to append to every prompt
FACE_LOCK=" IMPORTANT: This is an image EDIT operation. Preserve the exact facial features, bone structure, eyes, nose, mouth, chin, and overall face of the woman in the reference image. Only transform: the outfit/dress, the bar setting/background, lighting, and hair styling as described. Her face must remain identical to the reference photo."

echo "Starting generation with face-lock enabled..."
echo "All 30 concepts will maintain the reference woman's facial features"
echo ""

# For now, this is a template showing the approach
# The full version would read all prompts from the markdown files

echo "Script template created"
echo "To complete: Extract all 30 prompts from markdown files and append FACE_LOCK to each"
