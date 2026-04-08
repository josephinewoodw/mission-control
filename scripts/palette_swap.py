#!/usr/bin/env python3
"""
palette_swap.py — Remap Modern Office tileset sprites to Eliza LPC palette.

Uses perceptual color distance (CIELAB deltaE) to find the closest Eliza
palette color for each pixel in the Modern Office sprites.

Usage:
    python3 palette_swap.py --preview Modern_Office_16x16.png
    python3 palette_swap.py --all
    python3 palette_swap.py --info           (show extracted palettes only)
"""

import argparse
import json
import math
import os
import sys
import warnings
from pathlib import Path
from collections import Counter

# Suppress Pillow getdata deprecation warning (Pillow 12+ internals)
warnings.filterwarnings("ignore", category=DeprecationWarning)

try:
    from PIL import Image
except ImportError:
    print("Pillow not found. Install with: pip3 install Pillow")
    sys.exit(1)

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE = Path("/Users/josephinewood/mission-control/ldtk-assets")
ELIZA_DIR = BASE / "Eliza"
MODERN_DIR = BASE / "Modern_Office_Revamped_v1"
OUTPUT_DIR = BASE / "Modern_Office_Recolored"
ELIZA_PALETTE_JSON = ELIZA_DIR / "_ Palette" / "palette.json"

# ─── Color math ───────────────────────────────────────────────────────────────

def srgb_to_linear(c: float) -> float:
    """Convert sRGB component [0,1] to linear."""
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def linear_to_xyz(r: float, g: float, b: float) -> tuple[float, float, float]:
    """Linear RGB → CIE XYZ (D65)."""
    r = srgb_to_linear(r)
    g = srgb_to_linear(g)
    b = srgb_to_linear(b)
    x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
    y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
    z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
    return x, y, z


def xyz_to_lab(x: float, y: float, z: float) -> tuple[float, float, float]:
    """CIE XYZ → CIELAB (D65 white point)."""
    xn, yn, zn = 0.95047, 1.00000, 1.08883

    def f(t: float) -> float:
        delta = 6.0 / 29.0
        if t > delta ** 3:
            return t ** (1.0 / 3.0)
        return t / (3 * delta ** 2) + 4.0 / 29.0

    fx = f(x / xn)
    fy = f(y / yn)
    fz = f(z / zn)
    L = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b = 200.0 * (fy - fz)
    return L, a, b


def rgb_to_lab(r8: int, g8: int, b8: int) -> tuple[float, float, float]:
    """Integer RGB (0-255) → CIELAB."""
    return xyz_to_lab(*linear_to_xyz(r8 / 255.0, g8 / 255.0, b8 / 255.0))


def delta_e(lab1: tuple[float, float, float],
            lab2: tuple[float, float, float]) -> float:
    """CIE76 deltaE — perceptual color distance."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2)))


# ─── Palette loading ──────────────────────────────────────────────────────────

def load_eliza_palette() -> list[tuple[int, int, int]]:
    """
    Load Eliza palette from the authoritative palette.json.
    Returns list of (R, G, B) tuples (0-255).
    """
    with open(ELIZA_PALETTE_JSON) as f:
        data = json.load(f)
    palette = []
    for entry in data:
        r = round(entry["r"] * 255)
        g = round(entry["g"] * 255)
        b = round(entry["b"] * 255)
        palette.append((r, g, b))
    return palette


def extract_palette_from_images(
    paths: list[Path],
    max_colors: int = 30,
    min_alpha: int = 128,
) -> list[tuple[int, int, int]]:
    """
    Extract dominant colors from a list of PNG files.
    Ignores transparent pixels (alpha < min_alpha).
    Returns the top max_colors unique colors by frequency.
    """
    counter: Counter = Counter()
    for path in paths:
        try:
            img = Image.open(path).convert("RGBA")
            data = list(img.getdata())
            for pixel in data:
                r, g, b, a = pixel
                if a >= min_alpha:
                    counter[(r, g, b)] += 1
        except Exception as e:
            print(f"  Warning: could not read {path.name}: {e}")

    # Return top colors by frequency
    return [color for color, _ in counter.most_common(max_colors)]


# ─── Nearest color mapping ────────────────────────────────────────────────────

def build_nearest_map(
    source_colors: list[tuple[int, int, int]],
    target_palette: list[tuple[int, int, int]],
) -> dict[tuple[int, int, int], tuple[int, int, int]]:
    """
    For each source color, find the nearest target palette color via deltaE.
    Returns a dict mapping source_rgb → target_rgb.
    """
    # Precompute LAB values for target palette
    target_lab = [rgb_to_lab(*c) for c in target_palette]

    mapping = {}
    for src in source_colors:
        src_lab = rgb_to_lab(*src)
        best_dist = float("inf")
        best_color = target_palette[0]
        for i, tgt_lab in enumerate(target_lab):
            d = delta_e(src_lab, tgt_lab)
            if d < best_dist:
                best_dist = d
                best_color = target_palette[i]
        mapping[src] = best_color
    return mapping


# ─── Image recoloring ─────────────────────────────────────────────────────────

def recolor_image(
    src_path: Path,
    dst_path: Path,
    color_map: dict[tuple[int, int, int], tuple[int, int, int]],
    min_alpha: int = 128,
) -> tuple[int, int]:
    """
    Apply color_map to all opaque pixels in src_path, save to dst_path.
    Returns (pixels_changed, pixels_total).
    """
    img = Image.open(src_path).convert("RGBA")
    pixels = list(img.getdata())
    new_pixels = []
    changed = 0
    total_opaque = 0

    for pixel in pixels:
        r, g, b, a = pixel
        if a < min_alpha:
            # Keep transparent pixels as-is
            new_pixels.append(pixel)
        else:
            total_opaque += 1
            src_color = (r, g, b)
            if src_color in color_map:
                new_r, new_g, new_b = color_map[src_color]
                if (new_r, new_g, new_b) != src_color:
                    changed += 1
                new_pixels.append((new_r, new_g, new_b, a))
            else:
                # Color not in map — shouldn't happen if map was built correctly,
                # but fall through unchanged
                new_pixels.append(pixel)

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    out = Image.new("RGBA", img.size)
    out.putdata(new_pixels)
    out.save(dst_path, "PNG")
    return changed, total_opaque


# ─── File discovery ───────────────────────────────────────────────────────────

def find_modern_office_pngs() -> list[Path]:
    """Recursively find all PNG files in the Modern Office directory."""
    return sorted(MODERN_DIR.rglob("*.png"))


def find_eliza_sample_pngs(max_files: int = 20) -> list[Path]:
    """
    Sample PNGs from Eliza Objects/Furniture/ and Objects/Small Items/.
    Used only for --info display (palette extraction from pixels).
    The actual palette comes from palette.json.
    """
    furniture = list((ELIZA_DIR / "Objects" / "Furniture").glob("*.png"))
    small_items = list((ELIZA_DIR / "Objects" / "Small Items").glob("*.png"))
    combined = furniture + small_items
    return combined[:max_files]


# ─── Display helpers ──────────────────────────────────────────────────────────

def format_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def print_palette(colors: list[tuple[int, int, int]], label: str) -> None:
    print(f"\n{label} ({len(colors)} colors):")
    for i, c in enumerate(colors):
        print(f"  {i+1:3d}. {format_hex(c)}  rgb{c}")


# ─── Main operations ──────────────────────────────────────────────────────────

def run_info() -> None:
    """Extract and display both palettes without processing images."""
    print("Loading Eliza palette from palette.json...")
    eliza_palette = load_eliza_palette()
    print_palette(eliza_palette[:30], "Eliza LPC palette (first 30 of full set)")

    print("\nExtracting Modern Office palette from sample images...")
    modern_pngs = find_modern_office_pngs()
    print(f"  Found {len(modern_pngs)} Modern Office PNGs")
    # Sample a cross-section: root PNGs + some from subdirs
    sample = [p for p in modern_pngs if p.parent == MODERN_DIR]
    sample += modern_pngs[:10]  # grab a few more
    modern_palette = extract_palette_from_images(list(set(sample)), max_colors=30)
    print_palette(modern_palette, "Modern Office dominant colors (extracted)")


def run_preview(filename: str) -> None:
    """Process a single file and show mapping stats."""
    # Try to find the file
    src = Path(filename)
    if not src.is_absolute():
        # Search in Modern Office dir
        candidates = list(MODERN_DIR.rglob(filename))
        if not candidates:
            print(f"Error: '{filename}' not found in {MODERN_DIR}")
            sys.exit(1)
        src = candidates[0]
        print(f"Found: {src}")

    if not src.exists():
        print(f"Error: file not found: {src}")
        sys.exit(1)

    print(f"\nPreview mode: {src.name}")
    print(f"Loading Eliza palette ({len(load_eliza_palette())} colors from palette.json)...")
    eliza_palette = load_eliza_palette()

    print("Extracting colors from source image...")
    src_colors = extract_palette_from_images([src], max_colors=256, min_alpha=128)
    print(f"  Found {len(src_colors)} unique opaque colors")

    print("Building color map (LAB deltaE nearest neighbor)...")
    color_map = build_nearest_map(src_colors, eliza_palette)

    # Show sample of the mapping
    print("\nColor mapping sample (source → nearest Eliza color):")
    for i, (src_c, dst_c) in enumerate(list(color_map.items())[:20]):
        diff = "  (unchanged)" if src_c == dst_c else ""
        print(f"  {format_hex(src_c)} → {format_hex(dst_c)}{diff}")
    if len(color_map) > 20:
        print(f"  ... and {len(color_map) - 20} more mappings")

    # Compute output path
    rel = src.relative_to(MODERN_DIR)
    dst = OUTPUT_DIR / rel
    print(f"\nWriting output to: {dst}")
    changed, total = recolor_image(src, dst, color_map)
    pct = (changed / total * 100) if total > 0 else 0
    print(f"Done. {changed:,} / {total:,} opaque pixels remapped ({pct:.1f}%)")


def run_all(quiet: bool = False) -> None:
    """Batch process all Modern Office PNGs."""
    print("Loading Eliza palette from palette.json...")
    eliza_palette = load_eliza_palette()
    print(f"  {len(eliza_palette)} colors loaded")

    modern_pngs = find_modern_office_pngs()
    print(f"Found {len(modern_pngs)} Modern Office PNG files")

    print("Extracting combined Modern Office color palette...")
    # Sample broadly: root files + a few from each subdir
    all_modern_palette = extract_palette_from_images(
        modern_pngs, max_colors=512, min_alpha=128
    )
    print(f"  Found {len(all_modern_palette)} unique dominant colors across all files")

    print("Building global color map (LAB deltaE nearest neighbor)...")
    color_map = build_nearest_map(all_modern_palette, eliza_palette)
    print(f"  Mapped {len(color_map)} source colors to Eliza palette")

    print(f"\nProcessing {len(modern_pngs)} files → {OUTPUT_DIR}")
    processed = 0
    errors = 0
    total_changed = 0
    total_pixels = 0

    for i, src in enumerate(modern_pngs):
        rel = src.relative_to(MODERN_DIR)
        dst = OUTPUT_DIR / rel
        try:
            # For any colors in this specific file not in global map,
            # add them on the fly (should be rare)
            file_colors = extract_palette_from_images([src], max_colors=512)
            new_colors = [c for c in file_colors if c not in color_map]
            if new_colors:
                extra_map = build_nearest_map(new_colors, eliza_palette)
                color_map.update(extra_map)

            changed, total = recolor_image(src, dst, color_map)
            total_changed += changed
            total_pixels += total
            processed += 1
            if not quiet:
                pct = (changed / total * 100) if total > 0 else 0
                print(f"  [{i+1:4d}/{len(modern_pngs)}] {rel}  ({pct:.0f}% changed)")
        except Exception as e:
            errors += 1
            print(f"  ERROR: {rel}: {e}")

    print(f"\nBatch complete.")
    print(f"  Processed: {processed} files")
    print(f"  Errors:    {errors} files")
    pct = (total_changed / total_pixels * 100) if total_pixels > 0 else 0
    print(f"  Pixels:    {total_changed:,} / {total_pixels:,} remapped ({pct:.1f}%)")
    print(f"  Output:    {OUTPUT_DIR}")


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remap Modern Office sprites to Eliza LPC color palette."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--preview",
        metavar="FILE",
        help="Process a single file and show mapping stats (e.g. Modern_Office_16x16.png)",
    )
    group.add_argument(
        "--all",
        action="store_true",
        help="Batch process all Modern Office PNGs",
    )
    group.add_argument(
        "--info",
        action="store_true",
        help="Show extracted palettes without processing any images",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress per-file output in --all mode",
    )

    args = parser.parse_args()

    if args.info:
        run_info()
    elif args.preview:
        run_preview(args.preview)
    elif args.all:
        run_all(quiet=args.quiet)


if __name__ == "__main__":
    main()
