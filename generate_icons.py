#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFilter
import os

def create_blaire_kind_heart_icon(size, maskable=False):
    """
    Create a cute purple unicorn icon for Blaire's Kind Heart app
    """
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img, 'RGBA')

    # Create gradient background
    for y in range(size):
        # Create a pastel pink to purple gradient
        ratio = y / size
        r = int(255 * (1 - ratio * 0.3))  # 255 to ~178
        g = int(200 * (1 - ratio * 0.2))  # 200 to ~160
        b = int(230 + ratio * 20)         # 230 to 250
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Calculate proportions based on size
    center_x = size / 2
    center_y = size / 2.2  # Slightly higher center for cute proportions
    scale = size / 512

    # Draw unicorn body (rounded)
    body_radius = int(90 * scale)
    body_x = center_x
    body_y = center_y + int(40 * scale)
    draw.ellipse(
        [body_x - body_radius, body_y - body_radius,
         body_x + body_radius, body_y + body_radius],
        fill=(200, 150, 220, 255),
        outline=(180, 120, 200, 255)
    )

    # Draw unicorn head
    head_radius = int(70 * scale)
    head_x = center_x
    head_y = center_y - int(50 * scale)
    draw.ellipse(
        [head_x - head_radius, head_y - head_radius,
         head_x + head_radius, head_y + head_radius],
        fill=(220, 180, 240, 255),
        outline=(190, 140, 210, 255)
    )

    # Draw horn (triangle approximated with polygon)
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

    # Add sparkles on horn
    sparkle_colors = [(255, 240, 100, 255), (255, 255, 150, 255)]
    sparkle_y1 = horn_y - int(30 * scale)
    sparkle_y2 = horn_y - int(60 * scale)
    for i, (sy, sc) in enumerate([(sparkle_y1, sparkle_colors[0]), (sparkle_y2, sparkle_colors[1])]):
        sp_size = int(6 * scale)
        draw.ellipse([horn_x - sp_size - int(5*scale), sy - sp_size,
                     horn_x - sp_size + int(5*scale), sy + sp_size],
                    fill=sc)
        draw.ellipse([horn_x + sp_size - int(5*scale), sy - sp_size,
                     horn_x + sp_size + int(5*scale), sy + sp_size],
                    fill=sc)

    # Draw eyes (big and sparkly for kawaii style)
    eye_radius = int(15 * scale)
    left_eye_x = head_x - int(25 * scale)
    right_eye_x = head_x + int(25 * scale)
    eye_y = head_y - int(15 * scale)

    # Eye whites
    draw.ellipse([left_eye_x - eye_radius, eye_y - eye_radius,
                 left_eye_x + eye_radius, eye_y + eye_radius],
                fill=(255, 255, 255, 255))
    draw.ellipse([right_eye_x - eye_radius, eye_y - eye_radius,
                 right_eye_x + eye_radius, eye_y + eye_radius],
                fill=(255, 255, 255, 255))

    # Pupils
    pupil_radius = int(8 * scale)
    draw.ellipse([left_eye_x - pupil_radius + int(3*scale), eye_y - pupil_radius,
                 left_eye_x + pupil_radius + int(3*scale), eye_y + pupil_radius],
                fill=(100, 80, 160, 255))
    draw.ellipse([right_eye_x - pupil_radius + int(3*scale), eye_y - pupil_radius,
                 right_eye_x + pupil_radius + int(3*scale), eye_y + pupil_radius],
                fill=(100, 80, 160, 255))

    # Sparkles in eyes
    sparkle_radius = int(3 * scale)
    draw.ellipse([left_eye_x - int(8*scale), eye_y - int(8*scale),
                 left_eye_x - int(8*scale) + sparkle_radius*2, eye_y - int(8*scale) + sparkle_radius*2],
                fill=(255, 255, 255, 255))
    draw.ellipse([right_eye_x - int(8*scale), eye_y - int(8*scale),
                 right_eye_x - int(8*scale) + sparkle_radius*2, eye_y - int(8*scale) + sparkle_radius*2],
                fill=(255, 255, 255, 255))

    # Draw cute smile
    smile_y = head_y + int(20 * scale)
    smile_width = int(30 * scale)
    smile_arc = draw.arc(
        [head_x - smile_width, smile_y - int(15*scale),
         head_x + smile_width, smile_y + int(15*scale)],
        0, 180,
        fill=(150, 100, 150, 255),
        width=int(3 * scale)
    )

    # Draw mane
    mane_y = head_y - head_radius - int(20 * scale)
    mane_x_positions = [head_x - int(40*scale), head_x, head_x + int(40*scale)]
    for mx in mane_x_positions:
        mane_radius = int(20 * scale)
        draw.ellipse([mx - mane_radius, mane_y - mane_radius,
                     mx + mane_radius, mane_y + mane_radius],
                    fill=(230, 150, 200, 255),
                    outline=(210, 120, 180, 255))

    # Draw heart (big glowing pink heart for the main feature)
    heart_x = center_x
    heart_y = body_y + int(20 * scale)
    heart_size = int(60 * scale)

    # Heart shape using circles and polygon
    # Top bumps
    bump_radius = int(heart_size * 0.3)
    bump_y = heart_y - int(heart_size * 0.15)

    # Left bump
    draw.ellipse([heart_x - heart_size * 0.4 - bump_radius, bump_y - bump_radius,
                 heart_x - heart_size * 0.4 + bump_radius, bump_y + bump_radius],
                fill=(255, 100, 150, 255),
                outline=(240, 80, 130, 255))

    # Right bump
    draw.ellipse([heart_x + heart_size * 0.4 - bump_radius, bump_y - bump_radius,
                 heart_x + heart_size * 0.4 + bump_radius, bump_y + bump_radius],
                fill=(255, 100, 150, 255),
                outline=(240, 80, 130, 255))

    # Heart point (bottom)
    point_height = int(heart_size * 0.6)
    heart_points = [
        (heart_x - heart_size * 0.35, heart_y),
        (heart_x, heart_y + point_height),
        (heart_x + heart_size * 0.35, heart_y)
    ]
    draw.polygon(heart_points, fill=(255, 100, 150, 255), outline=(240, 80, 130, 255))

    # Add glow effect to heart with a slightly larger semi-transparent version
    glow_radius = int(heart_size * 0.4)
    # Left glow
    draw.ellipse([heart_x - heart_size * 0.4 - glow_radius - int(5*scale), bump_y - glow_radius - int(5*scale),
                 heart_x - heart_size * 0.4 + glow_radius + int(5*scale), bump_y + glow_radius + int(5*scale)],
                fill=(255, 150, 180, 100))
    # Right glow
    draw.ellipse([heart_x + heart_size * 0.4 - glow_radius - int(5*scale), bump_y - glow_radius - int(5*scale),
                 heart_x + heart_size * 0.4 + glow_radius + int(5*scale), bump_y + glow_radius + int(5*scale)],
                fill=(255, 150, 180, 100))

    # Apply slight blur for softer edges
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    return img

# Create all required icon sizes
icon_sizes = [
    (512, 'icon-512.png', False),
    (192, 'icon-192.png', False),
    (180, 'icon-180.png', False),
    (512, 'icon-512-maskable.png', True),
    (192, 'icon-192-maskable.png', True),
]

base_path = '/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/assets/icons/'

# Ensure directory exists
os.makedirs(base_path, exist_ok=True)

for size, filename, maskable in icon_sizes:
    print(f"Generating {filename} ({size}x{size})...")
    icon = create_blaire_kind_heart_icon(size, maskable=maskable)
    icon.save(base_path + filename, 'PNG', quality=95)
    print(f"  Saved: {base_path}{filename}")

print("\nAll icons generated successfully!")
