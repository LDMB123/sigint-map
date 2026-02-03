#!/bin/bash

# Generate 9 lace swimsuit editorial photos using Imagen 3 edit mode
REF_IMAGE="/Users/louisherman/Documents/157302266_2835686659981421_8002359656987373105_n.jpeg"

echo "Generating 9 lace swimsuit editorial photos with Imagen 3..."
echo ""

# Photo 1 - Red lace bikini
echo "[1/9] Red lace bikini beach..."
node imagen-direct.js edit "$REF_IMAGE" "woman in red lace bikini at white sand beach, sun-kissed skin, confident pose, close-up, editorial photography, 4K photorealistic"
sleep 5

# Photo 2 - White lace one-piece
echo "[2/9] White lace one-piece water..."
node imagen-direct.js edit "$REF_IMAGE" "woman in white lace one-piece swimsuit emerging from ocean, water droplets, golden hour backlighting, editorial photography, 4K professional"
sleep 5

# Photo 3 - Leopard lace bikini
echo "[3/9] Animal print lace bikini..."
node imagen-direct.js edit "$REF_IMAGE" "woman in leopard print lace bikini lying on sand, intimate pose, close-up on face, editorial photography, 4K cinematic"
sleep 5

# Photo 4 - Gold lace bikini
echo "[4/9] Metallic gold lace bikini pool..."
node imagen-direct.js edit "$REF_IMAGE" "woman in metallic gold lace bikini at infinity pool edge, golden hour tones, confident pose, water reflections, editorial photography, 4K photorealistic"
sleep 5

# Photo 5 - Black lace sporty bikini
echo "[5/9] Black lace sporty bikini action..."
node imagen-direct.js edit "$REF_IMAGE" "woman in black lace sporty bikini running through ocean waves, joyful expression, action shot, editorial photography, 4K dynamic"
sleep 5

# Photo 6 - Coral lace halter bikini
echo "[6/9] Coral lace bikini waterfall..."
node imagen-direct.js edit "$REF_IMAGE" "woman in coral lace halter bikini at tropical waterfall, lush jungle background, editorial photography, 4K photorealistic"
sleep 5

# Photo 7 - Navy lace bandeau
echo "[7/9] Navy lace bandeau yacht..."
node imagen-direct.js edit "$REF_IMAGE" "woman in navy blue lace strapless bandeau bikini on yacht deck, ocean horizon, confident pose, editorial photography, 4K"
sleep 5

# Photo 8 - Turquoise lace strappy bikini
echo "[8/9] Turquoise lace bikini beach walk..."
node imagen-direct.js edit "$REF_IMAGE" "woman in turquoise lace strappy bikini walking on shoreline, looking over shoulder, sunset light, editorial photography, 4K"
sleep 5

# Photo 9 - White crochet lace bikini
echo "[9/9] White crochet lace bikini bohemian..."
node imagen-direct.js edit "$REF_IMAGE" "woman in white crochet lace bikini on beach blanket, intimate close-up, bohemian aesthetic, editorial photography, 4K detailed"

echo ""
echo "✅ All 9 lace swimsuit editorial photos complete!"
