#!/bin/bash

# Generate 10 versions with 75 second delays between each

echo "Starting batch generation of 10 speakeasy portraits..."
echo "Each generation will wait 75 seconds to respect API rate limits"
echo ""

# Version 1
echo "=== Generating Version 1/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Professional portrait in modern speakeasy, rule of thirds composition with eyes at upper intersection point. Woman in red mini dress at bar, direct eye contact with camera. Shot on Canon 5D Mark IV, f/2.8, shallow depth of field, eyes razor sharp focus. Natural Edison bulb lighting, exposed brick background softly blurred. Photojournalistic style, authentic moment, raw unedited look."
echo "Waiting 75 seconds..."
sleep 75

# Version 2
echo "=== Generating Version 2/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Editorial fashion shot, rule of thirds with subject positioned left third. Woman in red dress leaning against speakeasy bar, eyes looking directly at viewer with natural expression. 50mm portrait lens, eyes in critical focus. Moody bar lighting, leather booth visible in background. Authentic photography, real skin texture, genuine moment captured."
echo "Waiting 75 seconds..."
sleep 75

# Version 3
echo "=== Generating Version 3/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Close-up portrait in speakeasy, eyes positioned on upper third line. Red dress visible from shoulders up, sitting at dark wood bar. 85mm lens, f/1.8, eyes crystal clear focus, soft bokeh background. Warm ambient bar light on face, natural shadows. Raw photographic style, no retouching, real skin detail."
echo "Waiting 75 seconds..."
sleep 75

# Version 4
echo "=== Generating Version 4/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Three-quarter shot, subject on right third of frame. Woman in red mini dress against exposed brick wall, eyes meeting camera with confident gaze. Prime lens, selective focus on eyes. Edison bulbs hanging in left third provide ambient light. Documentary style photography, natural grain, authentic bar atmosphere."
echo "Waiting 75 seconds..."
sleep 75

# Version 5
echo "=== Generating Version 5/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Environmental portrait, woman positioned in left third looking right across frame. Red dress, standing near cocktail bar, eyes sharp focus with storytelling gaze. 35mm lens captures speakeasy context. Natural bar lighting, real depth and dimension. Photojournalistic capture, unposed authentic expression, true to life colors."
echo "Waiting 75 seconds..."
sleep 75

# Version 6
echo "=== Generating Version 6/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Seated portrait at speakeasy bar, eyes on upper intersection point of rule of thirds grid. Woman in red dress holding cocktail glass, direct eye contact. 50mm f/1.4, eyes tack sharp. Leather booth and bottles visible in soft focus background. Natural window light mixed with bar ambiance, realistic shadows, genuine candid moment."
echo "Waiting 75 seconds..."
sleep 75

# Version 7
echo "=== Generating Version 7/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Standing portrait, subject in right third facing left. Red mini dress, hand on bar rail, eyes looking into camera with natural warmth. 85mm portrait lens, f/2.0, laser focus on eyes. Dark wood and brass bar details in background blur. Real photography aesthetic, natural skin tones, authentic lighting, unfiltered."
echo "Waiting 75 seconds..."
sleep 75

# Version 8
echo "=== Generating Version 8/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Intimate mid-shot, eyes positioned at left upper third intersection. Woman in red dress at dimly lit speakeasy corner booth, engaging eye contact. 50mm lens wide open, eyes in perfect focus. Candlelight and Edison bulbs provide natural warm glow. Street photography style, caught moment feel, genuine expression, film-like quality."
echo "Waiting 75 seconds..."
sleep 75

# Version 9
echo "=== Generating Version 9/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Portrait with negative space, subject in lower left third looking up and right. Red dress against dark speakeasy interior, eyes captivating and sharp. 35mm lens, f/2.8, eyes crisp while bar fades to bokeh. Low-key natural lighting from bar sconces. Real photography, no manipulation, authentic depth and mood."
echo "Waiting 75 seconds..."
sleep 75

# Version 10
echo "=== Generating Version 10/10 ==="
node nanobanana-direct.js edit "/Users/louisherman/Documents/LWMMoms - 374.jpeg" "Over-the-shoulder bar view, woman centered in middle third turning toward camera. Red mini dress, eyes meeting lens over shoulder with magnetic gaze. 70mm lens, f/2.2, selective focus pulling eyes razor sharp. Bar mirror and bottles frame composition. Documentary realism, natural bar atmosphere, true-to-life lighting and texture."

echo ""
echo "=== All 10 versions complete! ==="
echo "Check ~/nanobanana-output/ for all generated images"
