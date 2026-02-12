#!/usr/bin/env python3
"""
Generate Blaire's Kind Heart app icons
Features a cute purple unicorn (Sparkle) with a pink heart
Designed for a 4-year-old with large, cheerful elements
"""

from PIL import Image, ImageDraw, ImageFilter
import os
import sys

def create_blaire_kind_heart_icon(size, maskable=False):
    """
    Create a cute purple unicorn icon for Blaire's Kind Heart app

    Args:
        size: Icon size (512, 192, 180)
        maskable: If True, adds safe area padding for maskable icons

    Returns:
        PIL Image object in RGBA mode
    """
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, 'RGBA')

    # Create pastel pink-to-purple gradient background
    for y in range(size):
        ratio = y / size
        # Smooth gradient from pastel pink (top) to lavender (bottom)
        r = int(255 * (1 - ratio * 0.25))   # 255 to 191
        g = int(200 * (1 - ratio * 0.25))   # 200 to 150
        b = int(230 + ratio * 15)            # 230 to 245
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Scale calculations for responsive design
    scale = size / 512
    center_x = size / 2
    center_y = size / 2.1  # Slightly higher for cute proportions

    # BODY - Large rounded circle
    body_radius = int(90 * scale)
    body_x = center_x
    body_y = center_y + int(40 * scale)
    draw.ellipse(
        [body_x - body_radius, body_y - body_radius,
         body_x + body_radius, body_y + body_radius],
        fill=(200, 150, 220, 255),        # Light purple body
        outline=(170, 110, 200, 255)      # Darker purple outline
    )

    # HEAD - Slightly lighter purple circle
    head_radius = int(70 * scale)
    head_x = center_x
    head_y = center_y - int(50 * scale)
    draw.ellipse(
        [head_x - head_radius, head_y - head_radius,
         head_x + head_radius, head_y + head_radius],
        fill=(220, 180, 240, 255),        # Light lavender head
        outline=(190, 140, 210, 255)      # Outline for definition
    )

    # HORN - Golden pointed triangle with sparkles
    horn_height = int(100 * scale)
    horn_width = int(25 * scale)
    horn_x = center_x
    horn_y = head_y - head_radius - int(5 * scale)

    horn_points = [
        (horn_x - horn_width // 2, horn_y),
        (horn_x + horn_width // 2, horn_y),
        (horn_x, horn_y - horn_height)
    ]
    draw.polygon(horn_points, fill=(255, 200, 100, 255), outline=(240, 180, 80, 255))

    # Horn sparkles - for extra magic
    sparkle_colors = [(255, 245, 100, 255), (255, 255, 150, 255)]
    sparkle_positions = [
        (horn_y - int(30 * scale), sparkle_colors[0]),
        (horn_y - int(65 * scale), sparkle_colors[1])
    ]

    for sy, color in sparkle_positions:
        sp_size = int(5 * scale)
        sp_offset = int(8 * scale)
        # Left sparkle
        draw.ellipse([horn_x - sp_offset - sp_size, sy - sp_size,
                     horn_x - sp_offset + sp_size, sy + sp_size],
                    fill=color)
        # Right sparkle
        draw.ellipse([horn_x + sp_offset - sp_size, sy - sp_size,
                     horn_x + sp_offset + sp_size, sy + sp_size],
                    fill=color)

    # EYES - Big and sparkly (kawaii style)
    eye_radius = int(15 * scale)
    eye_spacing = int(28 * scale)
    left_eye_x = head_x - eye_spacing
    right_eye_x = head_x + eye_spacing
    eye_y = head_y - int(18 * scale)

    # Eye whites (large for cute effect)
    for eye_x in [left_eye_x, right_eye_x]:
        draw.ellipse([eye_x - eye_radius, eye_y - eye_radius,
                     eye_x + eye_radius, eye_y + eye_radius],
                    fill=(255, 255, 255, 255))

    # Pupils (looking slightly down and to sides for cuteness)
    pupil_radius = int(8 * scale)
    pupil_offset = int(5 * scale)
    draw.ellipse([left_eye_x - pupil_radius + pupil_offset, eye_y - pupil_radius + int(2*scale),
                 left_eye_x + pupil_radius + pupil_offset, eye_y + pupil_radius + int(2*scale)],
                fill=(120, 100, 180, 255))
    draw.ellipse([right_eye_x - pupil_radius + pupil_offset, eye_y - pupil_radius + int(2*scale),
                 right_eye_x + pupil_radius + pupil_offset, eye_y + pupil_radius + int(2*scale)],
                fill=(120, 100, 180, 255))

    # Eye sparkles (shine/highlights for extra cuteness)
    highlight_size = int(4 * scale)
    highlight_offset = int(10 * scale)
    for eye_x in [left_eye_x, right_eye_x]:
        draw.ellipse([eye_x - highlight_offset - highlight_size, eye_y - highlight_offset - highlight_size,
                     eye_x - highlight_offset + highlight_size, eye_y - highlight_offset + highlight_size],
                    fill=(255, 255, 255, 255))

    # SMILE - Cute curved line
    smile_y = head_y + int(18 * scale)
    smile_width = int(28 * scale)
    smile_width_v = int(12 * scale)
    draw.arc(
        [head_x - smile_width, smile_y - smile_width_v,
         head_x + smile_width, smile_y + smile_width_v],
        0, 180,
        fill=(180, 120, 160, 255),
        width=int(3 * scale)
    )

    # MANE - Three fluffy puffs on top of head (pink/magenta)
    mane_y = head_y - head_radius - int(15 * scale)
    mane_positions = [
        head_x - int(45*scale),
        head_x,
        head_x + int(45*scale)
    ]

    for mx in mane_positions:
        mane_radius = int(22 * scale)
        draw.ellipse([mx - mane_radius, mane_y - mane_radius,
                     mx + mane_radius, mane_y + mane_radius],
                    fill=(235, 160, 210, 255),
                    outline=(210, 130, 190, 255))

    # HEART - The main feature! A big, glowing pink heart
    heart_x = center_x
    heart_y = body_y + int(25 * scale)
    heart_size = int(55 * scale)

    # Heart top bumps
    bump_radius = int(heart_size * 0.32)
    bump_y = heart_y - int(heart_size * 0.1)
    bump_x_offset = int(heart_size * 0.42)

    # Left bump
    draw.ellipse([heart_x - bump_x_offset - bump_radius, bump_y - bump_radius,
                 heart_x - bump_x_offset + bump_radius, bump_y + bump_radius],
                fill=(255, 110, 160, 255),
                outline=(240, 80, 140, 255))

    # Right bump
    draw.ellipse([heart_x + bump_x_offset - bump_radius, bump_y - bump_radius,
                 heart_x + bump_x_offset + bump_radius, bump_y + bump_radius],
                fill=(255, 110, 160, 255),
                outline=(240, 80, 140, 255))

    # Heart bottom point
    point_height = int(heart_size * 0.65)
    heart_points = [
        (heart_x - heart_size * 0.35, heart_y),
        (heart_x, heart_y + point_height),
        (heart_x + heart_size * 0.35, heart_y)
    ]
    draw.polygon(heart_points, fill=(255, 110, 160, 255), outline=(240, 80, 140, 255))

    # Heart glow effect - semi-transparent pink aura
    glow_color = (255, 160, 190, 80)
    glow_radius = int(heart_size * 0.45)
    glow_inflate = int(8 * scale)

    # Left glow
    draw.ellipse([heart_x - bump_x_offset - glow_radius - glow_inflate, bump_y - glow_radius - glow_inflate,
                 heart_x - bump_x_offset + glow_radius + glow_inflate, bump_y + glow_radius + glow_inflate],
                fill=glow_color)

    # Right glow
    draw.ellipse([heart_x + bump_x_offset - glow_radius - glow_inflate, bump_y - glow_radius - glow_inflate,
                 heart_x + bump_x_offset + glow_radius + glow_inflate, bump_y + glow_radius + glow_inflate],
                fill=glow_color)

    # Soft blur for rounded, friendly appearance
    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))

    return img


def main():
    """Generate all required icon sizes"""
    icon_specs = [
        (512, 'icon-512.png', False),
        (192, 'icon-192.png', False),
        (180, 'icon-180.png', False),
        (512, 'icon-512-maskable.png', True),
        (192, 'icon-192-maskable.png', True),
    ]

    # Get output directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = script_dir

    print("Generating Blaire's Kind Heart App Icons")
    print("=" * 50)
    print(f"Output directory: {output_dir}")
    print()

    try:
        for size, filename, maskable in icon_specs:
            icon_type = "maskable" if maskable else "standard"
            print(f"Generating {filename} ({size}x{size}) [{icon_type}]...", end=" ")

            icon = create_blaire_kind_heart_icon(size, maskable=maskable)
            output_path = os.path.join(output_dir, filename)
            icon.save(output_path, 'PNG', quality=95)

            # Verify file was created and check size
            file_size = os.path.getsize(output_path) / 1024  # KB
            print(f"OK ({file_size:.1f} KB)")

        print()
        print("=" * 50)
        print("All icons generated successfully!")
        print()
        print("Icons created:")
        for _, filename, _ in icon_specs:
            print(f"  - {filename}")

        return 0

    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
