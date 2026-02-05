#!/bin/bash

# Generate 9 SI photos using basic generation mode (60 second delays)
export GEMINI_API_KEY="AIzaSyAfaz9ab1OhqyAxGKrEhFvEqrHtB549as8"

echo "Generating 9 Sports Illustrated swimsuit photos..."
echo ""

# Photo 1 - Red bikini
echo "[1/9] Red triangle bikini..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: intense piercing eyes looking directly at camera, woman in classic red triangle string bikini, lying on white sand beach, sun-kissed glowing skin, confident sultry gaze, close-up emphasizing eyes, 4K photorealistic"
sleep 60

# Photo 2 - White one-piece
echo "[2/9] White high-cut one-piece..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: captivating eyes with water droplets, woman in white high-cut one-piece swimsuit, emerging from turquoise ocean, intense eye contact, golden hour backlighting, 4K ultra-realistic"
sleep 60

# Photo 3 - Animal print
echo "[3/9] Leopard print Brazilian bikini..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: smoldering eyes, woman in leopard print Brazilian bikini, lying on sand, direct intimate eye contact, extreme close-up on face and eyes, 4K cinematic"
sleep 60

# Photo 4 - Gold bikini
echo "[4/9] Metallic gold bikini..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: alluring eyes, woman in metallic gold bikini at infinity pool, sultry confident gaze, golden hour tones, 4K photorealistic"
sleep 60

# Photo 5 - Black sporty
echo "[5/9] Black sporty bikini..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: playful eyes with smile, woman in black sporty bikini running through ocean waves, joyful expression focusing on bright eyes, 4K dynamic photography"
sleep 60

# Photo 6 - Coral halter
echo "[6/9] Coral halter bikini..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: mysterious eyes, woman in coral halter bikini under tropical waterfall, intense magnetic stare, 4K photorealistic"
sleep 60

# Photo 7 - Navy bandeau
echo "[7/9] Navy blue strapless bandeau..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: sophisticated eyes, woman in navy blue bandeau bikini on yacht deck, confident gaze, emphasis on facial beauty and eyes, 4K editorial"
sleep 60

# Photo 8 - Turquoise strappy
echo "[8/9] Turquoise strappy bikini..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: carefree eyes, woman in turquoise strappy bikini walking on shoreline, looking over shoulder, gentle smile with engaging eyes, 4K beach editorial"
sleep 60

# Photo 9 - White crochet
echo "[9/9] White crochet bikini..."
node nanobanana-direct.js generate "Sports Illustrated swimsuit editorial: dreamy eyes with romantic gaze, woman in white crochet bikini on beach blanket, intimate close-up focusing on eyes and face, 4K ultra-detailed"

echo ""
echo "✅ All 9 SI photos complete!"
