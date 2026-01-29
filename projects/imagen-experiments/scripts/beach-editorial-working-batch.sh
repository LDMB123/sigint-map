#!/bin/bash

# Generate 10 beach editorial photos using nanobanana-apikey.js with simplified prompts
export GEMINI_API_KEY="AIzaSyAfaz9ab1OhqyAxGKrEhFvEqrHtB549as8"
REF_IMAGE="/Users/louisherman/Documents/157302266_2835686659981421_8002359656987373105_n.jpeg"

echo "Generating 10 beach editorial photos..."
echo ""

# Photo 1
echo "[1/10] Beach editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "beach fashion editorial"
sleep 60

# Photo 2
echo "[2/10] Ocean editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "ocean editorial photo"
sleep 60

# Photo 3
echo "[3/10] Sand editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "white sand beach editorial"
sleep 60

# Photo 4
echo "[4/10] Pool editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "luxury pool editorial"
sleep 60

# Photo 5
echo "[5/10] Tropical editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "tropical beach editorial"
sleep 60

# Photo 6
echo "[6/10] Sunset editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "sunset beach editorial"
sleep 60

# Photo 7
echo "[7/10] Water editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "water fashion editorial"
sleep 60

# Photo 8
echo "[8/10] Shoreline editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "shoreline editorial photo"
sleep 60

# Photo 9
echo "[9/10] Golden hour editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "golden hour beach editorial"
sleep 60

# Photo 10
echo "[10/10] Summer editorial..."
node nanobanana-apikey.js edit "$REF_IMAGE" "summer beach editorial"

echo ""
echo "✅ All 10 beach editorial photos complete!"
