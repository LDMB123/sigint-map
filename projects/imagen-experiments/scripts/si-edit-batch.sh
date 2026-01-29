#!/bin/bash

# Generate 9 SI photos using edit mode with reference image (60 second delays)
export GEMINI_API_KEY="AIzaSyAfaz9ab1OhqyAxGKrEhFvEqrHtB549as8"
REF_IMAGE="/Users/louisherman/Documents/157302266_2835686659981421_8002359656987373105_n.jpeg"

echo "Generating 9 Sports Illustrated editorial photos using reference image..."
echo ""

# Photo 1 - Beach scene
echo "[1/9] Beach editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: intense piercing eyes, beachside photography, golden sand, ocean waves, sun-kissed skin, close-up emphasizing eyes, 4K photorealistic"
sleep 60

# Photo 2 - Water scene
echo "[2/9] Ocean water editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: captivating eyes with water droplets, emerging from turquoise ocean, golden hour backlighting, focus on eyes, 4K professional"
sleep 60

# Photo 3 - Sand close-up
echo "[3/9] Beach sand editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: smoldering eyes, lying on beach sand, intimate eye contact, extreme close-up on face, 4K cinematic"
sleep 60

# Photo 4 - Pool scene
echo "[4/9] Luxury pool editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: alluring eyes, infinity pool setting, golden hour warm tones, sultry gaze, water reflections, 4K photorealistic"
sleep 60

# Photo 5 - Action shot
echo "[5/9] Ocean action editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: playful eyes with genuine smile, running through ocean waves, joyful expression, bright eyes, action photography, 4K dynamic"
sleep 60

# Photo 6 - Tropical waterfall
echo "[6/9] Tropical waterfall editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: mysterious eyes, tropical waterfall setting, water cascading, intense magnetic stare, lush jungle, 4K photorealistic"
sleep 60

# Photo 7 - Yacht luxury
echo "[7/9] Yacht editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: sophisticated eyes, yacht deck setting, ocean horizon, confident gaze, luxury lifestyle, emphasis on facial beauty, 4K editorial"
sleep 60

# Photo 8 - Shoreline walk
echo "[8/9] Beach walk editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: carefree eyes, walking along shoreline, looking over shoulder, gentle smile, engaging eyes, sunset light, 4K authentic"
sleep 60

# Photo 9 - Beach blanket
echo "[9/9] Beach bohemian editorial..."
node nanobanana-direct.js edit "$REF_IMAGE" "Sports Illustrated editorial: dreamy eyes with romantic gaze, beach setting, intimate close-up focusing on eyes and face, bohemian aesthetic, warm afternoon light, 4K detailed"

echo ""
echo "✅ All 9 SI editorial photos complete!"
