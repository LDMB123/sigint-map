#!/bin/bash
# Generate all 30 dive bar portraits with 75-second delays
# Total time: approximately 40-45 minutes

IMAGE_PATH="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=75

echo "=========================================="
echo "Generating 30 Unique Dive Bar Portraits"
echo "=========================================="
echo "Estimated time: 40-45 minutes"
echo "Press Ctrl+C to cancel"
echo "=========================================="
echo ""

# We'll run just the first few to start, then user can continue
# This allows testing before committing to the full 40-minute run

for i in {1..30}; do
  echo "=== Concept $i/30 ==="
  echo "Generating..."
  echo "NOTE: Full prompts will be added - starting first 2 as proof of concept"

  if [ $i -eq 1 ]; then
    node nanobanana-direct.js edit "$IMAGE_PATH" "Photorealistic candid portrait of a woman in her late 20s inside Ego's Lounge on South Congress in Austin, Texas. She is seated on a cracked red vinyl bar stool, body angled three-quarters to camera left, face turned toward the lens with direct eye contact. She wears a black leather mini dress with a square neckline and cap sleeves that catches light in irregular streaks across the material. The dress hits mid-thigh. Her legs are bare, crossed at the ankles, feet in black pointed-toe stilettos with scuffed soles visible. Her dark brown hair is straight, parted cleanly in the middle, falling just past her shoulders with a few strands catching the light. She fills approximately 75% of the frame. Her expression is a confident smirk, the left corner of her mouth pulled slightly higher than the right, eyes narrowed just enough to suggest amusement. Her skin has a light sheen of perspiration across her forehead and collarbones. A small dark mole sits above her right eyebrow. Fine lines are visible at the corners of her eyes. The primary light source is a Lone Star beer neon sign mounted on the wood-paneled wall behind her and to camera right, casting a warm amber-red glow across the right side of her face and shoulder. A single bare incandescent bulb hangs from a cord above the bar to camera left, providing a dim secondary fill that catches the edge of her jaw and left ear. The background shows a cluttered bar top with half-empty pint glasses, a plastic tip jar, and a stack of cardboard coasters. A blurred figure in a flannel shirt leans against the far end of the bar. Shot on a Canon EOS R5 with a Canon RF 50mm f/1.2L USM lens at f/1.4. ISO 4000, shutter speed 1/80s. White balance intentionally set too warm at approximately 4200K, pushing skin tones into golden-amber territory. The image is underexposed by roughly one stop, crushing shadow detail under the bar and in the far corners. Heavy natural vignetting darkens the frame edges. Visible grain structure consistent with high ISO digital noise. Slight chromatic aberration appears as magenta fringing along the high-contrast edge where her shoulder meets the neon glow. Bokeh in the background shows slight onion-ring artifacts from the aspherical lens element. The depth of field is razor thin, with her near eye tack sharp and her far ear already softening. Her eyes are placed on the upper-right rule of thirds intersection. Camera is positioned at her seated eye level. The composition feels like a snapshot taken by a friend who borrowed an expensive camera for the night."
  elif [ $i -eq 2 ]; then
    echo "Waiting $DELAY seconds..."
    sleep $DELAY
    echo "TODO: Add all remaining prompts"
    break
  fi

done

echo ""
echo "=========================================="
echo "Script template created"
echo "Ready to add all 30 prompts"
echo "=========================================="
