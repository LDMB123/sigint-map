#!/usr/bin/env python3
"""
Generate all 30 dive bar portrait concepts with 75-second delays
Reads prompts from the markdown files and executes them sequentially
"""

import subprocess
import time
import re
from pathlib import Path

# All 30 prompts extracted from the markdown files
PROMPTS = [
    # Concept 1
    "Photorealistic candid portrait of a woman in her late 20s inside Ego's Lounge on South Congress in Austin, Texas. She is seated on a cracked red vinyl bar stool, body angled three-quarters to camera left, face turned toward the lens with direct eye contact. She wears a black leather mini dress with a square neckline and cap sleeves that catches light in irregular streaks across the material. The dress hits mid-thigh. Her legs are bare, crossed at the ankles, feet in black pointed-toe stilettos with scuffed soles visible. Her dark brown hair is straight, parted cleanly in the middle, falling just past her shoulders with a few strands catching the light. She fills approximately 75% of the frame. Her expression is a confident smirk, the left corner of her mouth pulled slightly higher than the right, eyes narrowed just enough to suggest amusement. Her skin has a light sheen of perspiration across her forehead and collarbones. A small dark mole sits above her right eyebrow. Fine lines are visible at the corners of her eyes. The primary light source is a Lone Star beer neon sign mounted on the wood-paneled wall behind her and to camera right, casting a warm amber-red glow across the right side of her face and shoulder. A single bare incandescent bulb hangs from a cord above the bar to camera left, providing a dim secondary fill that catches the edge of her jaw and left ear. The background shows a cluttered bar top with half-empty pint glasses, a plastic tip jar, and a stack of cardboard coasters. A blurred figure in a flannel shirt leans against the far end of the bar. Shot on a Canon EOS R5 with a Canon RF 50mm f/1.2L USM lens at f/1.4. ISO 4000, shutter speed 1/80s. White balance intentionally set too warm at approximately 4200K, pushing skin tones into golden-amber territory. The image is underexposed by roughly one stop, crushing shadow detail under the bar and in the far corners. Heavy natural vignetting darkens the frame edges. Visible grain structure consistent with high ISO digital noise. Slight chromatic aberration appears as magenta fringing along the high-contrast edge where her shoulder meets the neon glow. Bokeh in the background shows slight onion-ring artifacts from the aspherical lens element. The depth of field is razor thin, with her near eye tack sharp and her far ear already softening. Her eyes are placed on the upper-right rule of thirds intersection. Camera is positioned at her seated eye level. The composition feels like a snapshot taken by a friend who borrowed an expensive camera for the night.",
]

CONCEPTS = [
    "Black leather dress at Ego's Lounge",
    "Emerald velvet at Hole in the Wall [THIGH-HIGHS + WILD HAIR]",
    "Hot pink satin at Nickel City [KNEE-HIGH BOOTS]",
    # ... will add all 30
]

def run_generation(concept_num, prompt, description):
    """Run a single image generation"""
    print(f"\n{'='*70}")
    print(f"Generating Concept {concept_num}/30 - {description}")
    print(f"{'='*70}\n")

    cmd = [
        'node',
        'nanobanana-direct.js',
        'edit',
        '/Users/louisherman/Documents/LWMMoms - 374.jpeg',
        prompt
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        if result.returncode != 0:
            print(f"⚠️  Warning: Command exited with code {result.returncode}")
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("❌ Error: Command timed out after 180 seconds")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("="*70)
    print("BATCH GENERATION: 30 Unique Dive Bar Portraits")
    print("="*70)
    print(f"Total concepts: {len(PROMPTS)}")
    print("Delay between generations: 75 seconds")
    print("Estimated total time: ~40-45 minutes")
    print("="*70)

    input("\nPress Enter to begin generation...")

    successful = 0
    failed = 0

    for i, prompt in enumerate(PROMPTS, 1):
        description = CONCEPTS[i-1] if i-1 < len(CONCEPTS) else f"Concept {i}"

        success = run_generation(i, prompt, description)

        if success:
            successful += 1
            print(f"\n✅ Concept {i} completed successfully")
        else:
            failed += 1
            print(f"\n❌ Concept {i} failed")

        # Wait 75 seconds before next generation (except after the last one)
        if i < len(PROMPTS):
            print(f"\n⏳ Waiting 75 seconds before next generation...")
            print(f"Progress: {i}/{len(PROMPTS)} complete")
            time.sleep(75)

    print("\n" + "="*70)
    print("BATCH GENERATION COMPLETE")
    print("="*70)
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📁 Check ~/nanobanana-output/ for all generated images")
    print("="*70)

if __name__ == "__main__":
    main()
