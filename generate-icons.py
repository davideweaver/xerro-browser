#!/usr/bin/env python3
"""Generate Xerro app icons - a stylized X with node graph aesthetic."""

import math
from PIL import Image, ImageDraw, ImageFilter

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def draw_rounded_rect(draw, bbox, radius, fill):
    x0, y0, x1, y1 = bbox
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + radius * 2, y0 + radius * 2], fill=fill)
    draw.ellipse([x1 - radius * 2, y0, x1, y0 + radius * 2], fill=fill)
    draw.ellipse([x0, y1 - radius * 2, x0 + radius * 2, y1], fill=fill)
    draw.ellipse([x1 - radius * 2, y1 - radius * 2, x1, y1], fill=fill)

def generate_gradient_bg(size):
    """Create a deep dark radial gradient background."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    pixels = img.load()
    center = size / 2
    bg_dark = (11, 14, 31)      # very dark navy
    bg_mid = (18, 22, 48)        # slightly lighter navy

    for y in range(size):
        for x in range(size):
            dist = math.sqrt((x - center)**2 + (y - center)**2) / (size * 0.7)
            t = min(dist, 1.0)
            color = lerp_color(bg_mid, bg_dark, t)
            pixels[x, y] = (*color, 255)
    return img

def draw_thick_line_aa(draw, x0, y0, x1, y1, width, color):
    """Draw a thick anti-aliased line as an elongated rounded rectangle."""
    dx = x1 - x0
    dy = y1 - y0
    length = math.sqrt(dx*dx + dy*dy)
    if length == 0:
        return
    nx = -dy / length
    ny = dx / length
    hw = width / 2

    pts = [
        (x0 + nx*hw, y0 + ny*hw),
        (x1 + nx*hw, y1 + ny*hw),
        (x1 - nx*hw, y1 - ny*hw),
        (x0 - nx*hw, y0 - ny*hw),
    ]
    draw.polygon(pts, fill=color)
    # Round the ends
    r = hw
    draw.ellipse([x0 - r, y0 - r, x0 + r, y0 + r], fill=color)
    draw.ellipse([x1 - r, y1 - r, x1 + r, y1 + r], fill=color)

def draw_glow_line(img, x0, y0, x1, y1, width, color_rgb, glow_radius=3):
    """Draw a line with a soft glow effect using layered alpha."""
    layers = [
        (width + glow_radius * 4, (*color_rgb, 30)),
        (width + glow_radius * 2, (*color_rgb, 60)),
        (width + glow_radius, (*color_rgb, 100)),
        (width, (*color_rgb, 220)),
    ]
    for w, color in layers:
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        draw_thick_line_aa(d, x0, y0, x1, y1, w, color)
        img = Image.alpha_composite(img, overlay)
    return img

def draw_node(img, cx, cy, radius, color_rgb, glow=True):
    """Draw a glowing circle node."""
    if glow:
        for r_offset, alpha in [(radius * 2.5, 25), (radius * 1.8, 50), (radius * 1.3, 90)]:
            overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(overlay)
            d.ellipse([cx - r_offset, cy - r_offset, cx + r_offset, cy + r_offset],
                     fill=(*color_rgb, alpha))
            img = Image.alpha_composite(img, overlay)

    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
             fill=(*color_rgb, 255))
    # Bright center highlight
    hr = radius * 0.4
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr],
             fill=(255, 255, 255, 180))
    img = Image.alpha_composite(img, overlay)
    return img

def create_icon(size):
    """Create the Xerro icon at the given size."""
    # Scale factor (design at 512, scale down)
    s = size / 512

    # Start with gradient background
    img = generate_gradient_bg(size)

    # Round the corners (iOS wants square with rounded corners handled by system,
    # but we add subtle rounding for the manifest)
    if size >= 512:
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        r = int(size * 0.18)
        draw_rounded_rect(mask_draw, [0, 0, size, size], r, 255)
        img.putalpha(mask)

    # Color palette
    violet = (124, 58, 237)   # vibrant purple #7c3aed
    indigo = (99, 102, 241)   # indigo #6366f1
    blue = (59, 130, 246)     # blue #3b82f6
    cyan = (34, 211, 238)     # cyan accent #22d3ee

    # --- Draw connection lines first (behind the X) ---
    # The X goes from corners to center - add subtle connector lines suggesting a graph
    center = size / 2
    margin = size * 0.14

    # Secondary faint graph edges
    node_positions = [
        (margin, margin),                    # top-left
        (size - margin, margin),             # top-right
        (size - margin, size - margin),      # bottom-right
        (margin, size - margin),             # bottom-left
        (center, margin * 0.7),              # top-center
        (size - margin * 0.7, center),       # right-center
        (center, size - margin * 0.7),       # bottom-center
        (margin * 0.7, center),              # left-center
    ]

    # Draw faint connecting lines between some nodes
    connections = [(0, 4), (1, 4), (1, 5), (2, 5), (2, 6), (3, 6), (3, 7), (0, 7)]
    for i, j in connections:
        x0, y0 = node_positions[i]
        x1, y1 = node_positions[j]
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        draw_thick_line_aa(d, x0, y0, x1, y1, max(1, int(1 * s)), (99, 102, 241, 35))
        img = Image.alpha_composite(img, overlay)

    # --- Main X strokes ---
    arm_width = int(52 * s)
    x_margin = int(90 * s)

    # Top-left to bottom-right diagonal
    img = draw_glow_line(img,
        x_margin, x_margin,
        size - x_margin, size - x_margin,
        arm_width, violet, glow_radius=int(8 * s))

    # Top-right to bottom-left diagonal
    img = draw_glow_line(img,
        size - x_margin, x_margin,
        x_margin, size - x_margin,
        arm_width, blue, glow_radius=int(8 * s))

    # Center intersection node (brightest)
    center_color = lerp_color(violet, blue, 0.5)  # blend = ~indigo
    img = draw_node(img, center, center, int(28 * s), (165, 100, 255), glow=True)

    # Corner nodes
    corner_r = int(14 * s)
    for i, (nx, ny) in enumerate(node_positions[:4]):
        t = i / 3
        color = lerp_color(violet, blue, t)
        img = draw_node(img, nx, ny, corner_r, color, glow=True)

    # Mid-edge nodes (smaller, faint)
    for nx, ny in node_positions[4:]:
        img = draw_node(img, nx, ny, int(7 * s), (130, 130, 200), glow=False)

    return img

# Generate icons
for size in [192, 512]:
    icon = create_icon(size)
    # Convert to RGB for PNG output (keep alpha for 512 maskable)
    path = f"public/icon-{size}.png"
    icon.save(path, "PNG", optimize=True)
    print(f"Created {path} ({size}x{size})")

# Also create apple-touch-icon (180x180, no transparency - iOS fills transparent with black)
apple_icon = create_icon(512).resize((180, 180), Image.LANCZOS)
# Flatten onto dark background
bg = Image.new('RGBA', (180, 180), (11, 14, 31, 255))
bg = Image.alpha_composite(bg, apple_icon)
bg.convert('RGB').save("public/apple-touch-icon.png", "PNG", optimize=True)
print("Created public/apple-touch-icon.png (180x180)")

print("Done!")
