#!/bin/bash

# Generate 10 lace swimwear editorial photos
export GEMINI_API_KEY="AIzaSyAfaz9ab1OhqyAxGKrEhFvEqrHtB549as8"
REF_IMAGE="/Users/louisherman/Documents/157302266_2835686659981421_8002359656987373105_n.jpeg"

echo "Generating 10 lace swimwear editorial photos..."
echo ""

# Photo 1 - Red lace
echo "[1/10] Red lace swimwear beach..."
node nanobanana-apikey.js edit "$REF_IMAGE" "red lace swimwear editorial, beach"
sleep 60

# Photo 2 - White lace
echo "[2/10] White lace swimwear water..."
node nanobanana-apikey.js edit "$REF_IMAGE" "white lace swimwear editorial, ocean"
sleep 60

# Photo 3 - Animal print lace
echo "[3/10] Leopard lace swimwear sand..."
node nanobanana-apikey.js edit "$REF_IMAGE" "leopard print lace swimwear editorial, sand"
sleep 60

# Photo 4 - Gold lace
echo "[4/10] Gold lace swimwear pool..."
node nanobanana-apikey.js edit "$REF_IMAGE" "metallic gold lace swimwear editorial, pool"
sleep 60

# Photo 5 - Black lace
echo "[5/10] Black lace swimwear waves..."
node nanobanana-apikey.js edit "$REF_IMAGE" "black lace swimwear editorial, waves"
sleep 60

# Photo 6 - Coral lace
echo "[6/10] Coral lace swimwear tropical..."
node nanobanana-apikey.js edit "$REF_IMAGE" "coral lace swimwear editorial, tropical"
sleep 60

# Photo 7 - Navy lace
echo "[7/10] Navy lace swimwear yacht..."
node nanobanana-apikey.js edit "$REF_IMAGE" "navy blue lace swimwear editorial, yacht"
sleep 60

# Photo 8 - Turquoise lace
echo "[8/10] Turquoise lace swimwear shoreline..."
node nanobanana-apikey.js edit "$REF_IMAGE" "turquoise lace swimwear editorial, shoreline"
sleep 60

# Photo 9 - White crochet lace
echo "[9/10] Crochet lace swimwear beach..."
node nanobanana-apikey.js edit "$REF_IMAGE" "white crochet lace swimwear editorial, beach"
sleep 60

# Photo 10 - Pink lace
echo "[10/10] Pink lace swimwear sunset..."
node nanobanana-apikey.js edit "$REF_IMAGE" "pink lace swimwear editorial, sunset beach"

echo ""
echo "✅ All 10 lace swimwear editorial photos complete!"
