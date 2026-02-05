#!/bin/bash

# Generate 9 lace swimsuit editorial photos using edit mode (60 second delays)
export GEMINI_API_KEY="AIzaSyAfaz9ab1OhqyAxGKrEhFvEqrHtB549as8"
REF_IMAGE="/Users/louisherman/Documents/157302266_2835686659981421_8002359656987373105_n.jpeg"

echo "Generating 9 lace swimsuit editorial photos..."
echo ""

# Photo 1 - Red lace bikini
echo "[1/9] Red lace bikini beach..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: intense piercing eyes, red lace bikini, white sand beach, sun-kissed skin, confident sultry gaze, close-up emphasizing eyes, 4K photorealistic"
sleep 60

# Photo 2 - White lace one-piece
echo "[2/9] White lace one-piece water..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: captivating eyes with water droplets, white lace one-piece swimsuit, emerging from ocean, golden hour backlighting, focus on eyes, 4K professional"
sleep 60

# Photo 3 - Leopard lace bikini
echo "[3/9] Animal print lace bikini..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: smoldering eyes, leopard print lace bikini, lying on sand, intimate eye contact, extreme close-up on face, 4K cinematic"
sleep 60

# Photo 4 - Gold lace bikini
echo "[4/9] Metallic gold lace bikini pool..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: alluring eyes, metallic gold lace bikini, infinity pool edge, golden hour tones, sultry gaze, water reflections, 4K photorealistic"
sleep 60

# Photo 5 - Black lace sporty bikini
echo "[5/9] Black lace sporty bikini action..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: playful eyes with smile, black lace sporty bikini, running through ocean waves, joyful expression, bright eyes, action shot, 4K dynamic"
sleep 60

# Photo 6 - Coral lace halter bikini
echo "[6/9] Coral lace bikini waterfall..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: mysterious eyes, coral lace halter bikini, tropical waterfall, intense magnetic stare, lush jungle background, 4K photorealistic"
sleep 60

# Photo 7 - Navy lace bandeau
echo "[7/9] Navy lace bandeau yacht..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: sophisticated eyes, navy blue lace strapless bandeau bikini, yacht deck, confident gaze, ocean horizon, emphasis on facial beauty, 4K editorial"
sleep 60

# Photo 8 - Turquoise lace strappy bikini
echo "[8/9] Turquoise lace bikini beach walk..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: carefree eyes, turquoise lace strappy bikini, walking shoreline, looking over shoulder, gentle smile, engaging eyes, sunset light, 4K"
sleep 60

# Photo 9 - White crochet lace bikini
echo "[9/9] White crochet lace bikini bohemian..."
node nanobanana-direct.js edit "$REF_IMAGE" "Editorial fashion photography: dreamy eyes with romantic gaze, white crochet lace bikini, beach blanket, intimate close-up focusing on eyes and face, bohemian aesthetic, 4K detailed"

echo ""
echo "✅ All 9 lace swimsuit editorial photos complete!"
