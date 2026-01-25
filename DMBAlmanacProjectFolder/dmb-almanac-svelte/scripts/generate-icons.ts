/**
 * PWA Icon Generator for DMB Almanac
 *
 * Generates all required PWA icons using the sharp library:
 * - Standard icons (48-512px)
 * - Maskable icons with safe zone padding
 * - Shortcut icons with unique symbols
 */

import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

// DMB-themed colors (aligned with brand analysis)
const COLORS = {
  background: "#030712", // Dark gray-black (matches theme)
  backgroundDark: "#0a0a12", // Even darker variant
  primary: "#f59e0b", // Amber/gold (fire dancer color)
  secondary: "#1f2937", // Dark gray
  text: "#ffffff", // White text
  accent: "#fcd34d", // Lighter gold accent
};

// Icon sizes needed for the manifest
const STANDARD_SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
const MASKABLE_SIZES = [192, 512];
const SHORTCUT_SIZE = 96;
const BADGE_SIZE = 72;

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), "public", "icons");

/**
 * Create an SVG string for the main DMB icon
 * Features "DMB" text with a stylized fire dancer silhouette element
 */
function createMainIconSVG(size: number): string {
  const fontSize = Math.floor(size * 0.28);
  const subFontSize = Math.floor(size * 0.08);
  const strokeWidth = Math.max(1, Math.floor(size * 0.02));

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.background}"/>
          <stop offset="100%" style="stop-color:${COLORS.backgroundDark}"/>
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.text}"/>
          <stop offset="100%" style="stop-color:#e0e0e0"/>
        </linearGradient>
        <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:${COLORS.primary}"/>
          <stop offset="50%" style="stop-color:#facc15"/>
          <stop offset="100%" style="stop-color:${COLORS.accent}"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${size}" height="${size}" fill="url(#bgGrad)"/>

      <!-- Fire dancer silhouette (simplified) -->
      <g transform="translate(${size * 0.5}, ${size * 0.35})">
        <!-- Flame shapes -->
        <ellipse cx="0" cy="${size * 0.05}" rx="${size * 0.15}" ry="${size * 0.08}" fill="url(#fireGrad)" opacity="0.3"/>
        <path d="M 0 ${size * 0.12}
                 Q ${size * 0.08} ${size * 0.02} ${size * 0.04} ${-size * 0.08}
                 Q 0 ${-size * 0.12} ${-size * 0.04} ${-size * 0.08}
                 Q ${-size * 0.08} ${size * 0.02} 0 ${size * 0.12}"
              fill="url(#fireGrad)" opacity="0.6"/>
      </g>

      <!-- DMB text -->
      <text x="50%" y="58%"
            font-family="Arial Black, Arial, sans-serif"
            font-size="${fontSize}px"
            font-weight="900"
            fill="url(#textGrad)"
            text-anchor="middle"
            dominant-baseline="middle"
            letter-spacing="${size * 0.01}px">DMB</text>

      <!-- ALMANAC subtitle -->
      <text x="50%" y="78%"
            font-family="Arial, sans-serif"
            font-size="${subFontSize}px"
            font-weight="400"
            fill="${COLORS.text}"
            text-anchor="middle"
            dominant-baseline="middle"
            letter-spacing="${size * 0.02}px"
            opacity="0.8">ALMANAC</text>

      <!-- Decorative bottom line -->
      <line x1="${size * 0.25}" y1="${size * 0.88}"
            x2="${size * 0.75}" y2="${size * 0.88}"
            stroke="${COLORS.primary}"
            stroke-width="${strokeWidth}"
            opacity="0.6"/>
    </svg>
  `;
}

/**
 * Create a maskable icon SVG with safe zone padding (10% on each side)
 * The safe zone ensures the icon content is visible on all platforms
 */
function createMaskableIconSVG(size: number): string {
  const safeZone = size * 0.1; // 10% padding
  const innerSize = size - safeZone * 2;
  const fontSize = Math.floor(innerSize * 0.28);
  const subFontSize = Math.floor(innerSize * 0.08);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.background}"/>
          <stop offset="100%" style="stop-color:${COLORS.backgroundDark}"/>
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.text}"/>
          <stop offset="100%" style="stop-color:#e0e0e0"/>
        </linearGradient>
        <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:${COLORS.primary}"/>
          <stop offset="50%" style="stop-color:#facc15"/>
          <stop offset="100%" style="stop-color:${COLORS.accent}"/>
        </linearGradient>
      </defs>

      <!-- Full background (extends to edges for maskable) -->
      <rect width="${size}" height="${size}" fill="url(#bgGrad)"/>

      <!-- Content within safe zone -->
      <g transform="translate(${safeZone}, ${safeZone})">
        <!-- Fire dancer silhouette (simplified) -->
        <g transform="translate(${innerSize * 0.5}, ${innerSize * 0.32})">
          <ellipse cx="0" cy="${innerSize * 0.05}" rx="${innerSize * 0.15}" ry="${innerSize * 0.08}" fill="url(#fireGrad)" opacity="0.3"/>
          <path d="M 0 ${innerSize * 0.12}
                   Q ${innerSize * 0.08} ${innerSize * 0.02} ${innerSize * 0.04} ${-innerSize * 0.08}
                   Q 0 ${-innerSize * 0.12} ${-innerSize * 0.04} ${-innerSize * 0.08}
                   Q ${-innerSize * 0.08} ${innerSize * 0.02} 0 ${innerSize * 0.12}"
                fill="url(#fireGrad)" opacity="0.6"/>
        </g>

        <!-- DMB text -->
        <text x="50%" y="55%"
              font-family="Arial Black, Arial, sans-serif"
              font-size="${fontSize}px"
              font-weight="900"
              fill="url(#textGrad)"
              text-anchor="middle"
              dominant-baseline="middle">DMB</text>

        <!-- ALMANAC subtitle -->
        <text x="50%" y="75%"
              font-family="Arial, sans-serif"
              font-size="${subFontSize}px"
              font-weight="400"
              fill="${COLORS.text}"
              text-anchor="middle"
              dominant-baseline="middle"
              opacity="0.8">ALMANAC</text>
      </g>
    </svg>
  `;
}

/**
 * Create shortcut icon SVGs with unique symbols
 */
function createShortcutIconSVG(
  type: "favorites" | "search" | "songs" | "venues" | "stats",
  size: number
): string {
  const iconSize = size * 0.5;
  const _offset = (size - iconSize) / 2;

  let iconPath: string;

  switch (type) {
    case "favorites":
      // Heart/star icon
      iconPath = `
        <path d="M ${size * 0.5} ${size * 0.75}
                 C ${size * 0.3} ${size * 0.55} ${size * 0.15} ${size * 0.4} ${size * 0.15} ${size * 0.3}
                 C ${size * 0.15} ${size * 0.15} ${size * 0.3} ${size * 0.05} ${size * 0.42} ${size * 0.05}
                 C ${size * 0.5} ${size * 0.05} ${size * 0.5} ${size * 0.15} ${size * 0.5} ${size * 0.15}
                 C ${size * 0.5} ${size * 0.15} ${size * 0.5} ${size * 0.05} ${size * 0.58} ${size * 0.05}
                 C ${size * 0.7} ${size * 0.05} ${size * 0.85} ${size * 0.15} ${size * 0.85} ${size * 0.3}
                 C ${size * 0.85} ${size * 0.4} ${size * 0.7} ${size * 0.55} ${size * 0.5} ${size * 0.75} Z"
              fill="${COLORS.text}"/>
      `;
      break;
    case "search":
      // Magnifying glass
      iconPath = `
        <circle cx="${size * 0.42}" cy="${size * 0.42}" r="${size * 0.18}"
                fill="none" stroke="${COLORS.text}" stroke-width="${size * 0.04}"/>
        <line x1="${size * 0.55}" y1="${size * 0.55}" x2="${size * 0.72}" y2="${size * 0.72}"
              stroke="${COLORS.text}" stroke-width="${size * 0.05}" stroke-linecap="round"/>
      `;
      break;
    case "songs":
      // Musical note
      iconPath = `
        <ellipse cx="${size * 0.35}" cy="${size * 0.65}" rx="${size * 0.1}" ry="${size * 0.08}"
                 fill="${COLORS.text}"/>
        <ellipse cx="${size * 0.65}" cy="${size * 0.58}" rx="${size * 0.1}" ry="${size * 0.08}"
                 fill="${COLORS.text}"/>
        <rect x="${size * 0.42}" y="${size * 0.25}" width="${size * 0.04}" height="${size * 0.42}"
              fill="${COLORS.text}"/>
        <rect x="${size * 0.72}" y="${size * 0.18}" width="${size * 0.04}" height="${size * 0.42}"
              fill="${COLORS.text}"/>
        <path d="M ${size * 0.46} ${size * 0.25} L ${size * 0.76} ${size * 0.18} L ${size * 0.76} ${size * 0.28} L ${size * 0.46} ${size * 0.35} Z"
              fill="${COLORS.text}"/>
      `;
      break;
    case "venues":
      // Location pin / building
      iconPath = `
        <path d="M ${size * 0.5} ${size * 0.18}
                 C ${size * 0.3} ${size * 0.18} ${size * 0.22} ${size * 0.32} ${size * 0.22} ${size * 0.42}
                 C ${size * 0.22} ${size * 0.58} ${size * 0.5} ${size * 0.8} ${size * 0.5} ${size * 0.8}
                 C ${size * 0.5} ${size * 0.8} ${size * 0.78} ${size * 0.58} ${size * 0.78} ${size * 0.42}
                 C ${size * 0.78} ${size * 0.32} ${size * 0.7} ${size * 0.18} ${size * 0.5} ${size * 0.18} Z"
              fill="${COLORS.text}"/>
        <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.1}"
                fill="${COLORS.background}"/>
      `;
      break;
    case "stats":
      // Bar chart
      iconPath = `
        <rect x="${size * 0.22}" y="${size * 0.55}" width="${size * 0.14}" height="${size * 0.25}"
              fill="${COLORS.text}" rx="${size * 0.02}"/>
        <rect x="${size * 0.43}" y="${size * 0.35}" width="${size * 0.14}" height="${size * 0.45}"
              fill="${COLORS.text}" rx="${size * 0.02}"/>
        <rect x="${size * 0.64}" y="${size * 0.2}" width="${size * 0.14}" height="${size * 0.6}"
              fill="${COLORS.text}" rx="${size * 0.02}"/>
      `;
      break;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shortcutBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.primary}"/>
          <stop offset="100%" style="stop-color:#b83b5e"/>
        </linearGradient>
      </defs>

      <!-- Rounded background -->
      <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#shortcutBg)"/>

      <!-- Icon -->
      ${iconPath}
    </svg>
  `;
}

/**
 * Create a badge icon for push notifications (monochrome, simple)
 * Badge icons should be simple silhouettes that work well at small sizes
 */
function createBadgeIconSVG(size: number): string {
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Transparent background -->
      <rect width="${size}" height="${size}" fill="transparent"/>

      <!-- Simple DMB letters as silhouette -->
      <text x="50%" y="55%"
            font-family="Arial Black, Arial, sans-serif"
            font-size="${size * 0.4}px"
            font-weight="900"
            fill="#000000"
            text-anchor="middle"
            dominant-baseline="middle">DMB</text>
    </svg>
  `;
}

/**
 * Create Safari pinned tab SVG (must be monochrome black)
 * Safari uses the color attribute to tint this icon
 */
function createSafariPinnedTabSVG(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <!-- Simple DMB text as monochrome SVG -->
  <text x="50%" y="60%"
        font-family="Arial Black, Arial, sans-serif"
        font-size="5px"
        font-weight="900"
        fill="#000000"
        text-anchor="middle"
        dominant-baseline="middle">DMB</text>
</svg>`;
}

/**
 * Generate a PNG icon from SVG using sharp
 */
async function generateIcon(svg: string, outputPath: string, size: number): Promise<void> {
  const buffer = Buffer.from(svg);

  await sharp(buffer)
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);
}

/**
 * Main function to generate all icons
 */
async function main(): Promise<void> {
  console.log("PWA Icon Generator for DMB Almanac");
  console.log("===================================\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}\n`);
  }

  // Generate standard icons
  console.log("Generating standard icons...");
  for (const size of STANDARD_SIZES) {
    const svg = createMainIconSVG(size);
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    await generateIcon(svg, outputPath, size);
    console.log(`  - icon-${size}.png`);
  }

  // Generate maskable icons
  console.log("\nGenerating maskable icons...");
  for (const size of MASKABLE_SIZES) {
    const svg = createMaskableIconSVG(size);
    const outputPath = path.join(OUTPUT_DIR, `icon-maskable-${size}.png`);
    await generateIcon(svg, outputPath, size);
    console.log(`  - icon-maskable-${size}.png`);
  }

  // Generate shortcut icons
  console.log("\nGenerating shortcut icons...");
  const shortcuts: Array<"favorites" | "search" | "songs" | "venues" | "stats"> = [
    "favorites",
    "search",
    "songs",
    "venues",
    "stats",
  ];
  for (const shortcut of shortcuts) {
    const svg = createShortcutIconSVG(shortcut, SHORTCUT_SIZE);
    const outputPath = path.join(OUTPUT_DIR, `shortcut-${shortcut}.png`);
    await generateIcon(svg, outputPath, SHORTCUT_SIZE);
    console.log(`  - shortcut-${shortcut}.png`);
  }

  // Generate Apple Touch Icon (180x180 is the standard size)
  console.log("\nGenerating Apple Touch Icon...");
  const appleTouchSvg = createMainIconSVG(180);
  await generateIcon(appleTouchSvg, path.join(OUTPUT_DIR, "apple-touch-icon.png"), 180);
  console.log("  - apple-touch-icon.png");

  // Generate badge icon for push notifications (monochrome style)
  console.log("\nGenerating badge icon...");
  const badgeSvg = createBadgeIconSVG(BADGE_SIZE);
  await generateIcon(badgeSvg, path.join(OUTPUT_DIR, `badge-${BADGE_SIZE}.png`), BADGE_SIZE);
  console.log(`  - badge-${BADGE_SIZE}.png`);

  // Generate Safari pinned tab SVG (monochrome)
  console.log("\nGenerating Safari pinned tab SVG...");
  const safariSvg = createSafariPinnedTabSVG();
  fs.writeFileSync(path.join(OUTPUT_DIR, "safari-pinned-tab.svg"), safariSvg);
  console.log("  - safari-pinned-tab.svg");

  console.log("\nIcon generation complete!");
  console.log(
    `\nGenerated ${STANDARD_SIZES.length + MASKABLE_SIZES.length + shortcuts.length + 3} icons in ${OUTPUT_DIR}`
  );

  // Summary
  console.log("\n=== Generated Files Summary ===");
  console.log(`Standard icons: ${STANDARD_SIZES.length}`);
  console.log(`Maskable icons: ${MASKABLE_SIZES.length}`);
  console.log(`Shortcut icons: ${shortcuts.length}`);
  console.log(`Apple Touch Icon: 1`);
  console.log(`Badge icon: 1`);
  console.log(`Safari pinned tab SVG: 1`);
  console.log(
    `Total: ${STANDARD_SIZES.length + MASKABLE_SIZES.length + shortcuts.length + 3} assets`
  );
}

// Run the script
main().catch((error) => {
  console.error("Error generating icons:", error);
  process.exit(1);
});
