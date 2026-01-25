/**
 * PWA Splash Screen Generator for DMB Almanac
 *
 * Generates Apple splash screens for iOS PWA installations.
 * These are displayed during app launch on iOS devices.
 *
 * Usage:
 *   npx tsx scripts/generate-splash.ts
 *
 * Generated splash screens match the sizes defined in layout.tsx appleWebApp.startupImage
 */

import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

// DMB-themed colors (aligned with brand analysis)
const COLORS = {
  background: "#030712", // Dark gray-black (matches theme)
  backgroundAlt: "#0a0a12", // Slightly lighter variant
  primary: "#f59e0b", // Amber/gold (fire dancer color)
  text: "#ffffff", // White text
  accent: "#fcd34d", // Lighter gold accent
};

// Splash screen sizes from layout.tsx
const SPLASH_SIZES = [
  { width: 2048, height: 2732, name: "apple-splash-2048-2732.png" }, // 12.9" iPad Pro
  { width: 1668, height: 2388, name: "apple-splash-1668-2388.png" }, // 11" iPad Pro
  { width: 1536, height: 2048, name: "apple-splash-1536-2048.png" }, // 9.7" iPad
  { width: 1125, height: 2436, name: "apple-splash-1125-2436.png" }, // iPhone X/XS
  { width: 1242, height: 2688, name: "apple-splash-1242-2688.png" }, // iPhone XS Max
  { width: 828, height: 1792, name: "apple-splash-828-1792.png" }, // iPhone XR
  { width: 1242, height: 2208, name: "apple-splash-1242-2208.png" }, // iPhone 8 Plus
  { width: 750, height: 1334, name: "apple-splash-750-1334.png" }, // iPhone 8
  { width: 640, height: 1136, name: "apple-splash-640-1136.png" }, // iPhone SE
];

const OUTPUT_DIR = path.join(process.cwd(), "public", "splash");

/**
 * Create an SVG for the splash screen
 * Features centered DMB Almanac branding
 */
function createSplashSVG(width: number, height: number): string {
  const logoSize = Math.min(width, height) * 0.25;
  const textSize = Math.min(width, height) * 0.06;
  const subtitleSize = Math.min(width, height) * 0.025;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${COLORS.background}"/>
          <stop offset="100%" style="stop-color:${COLORS.backgroundAlt}"/>
        </linearGradient>
        <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:${COLORS.primary}"/>
          <stop offset="50%" style="stop-color:#fcd34d"/>
          <stop offset="100%" style="stop-color:${COLORS.accent}"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>

      <!-- Fire dancer silhouette (decorative) -->
      <g transform="translate(${width / 2}, ${height / 2 - logoSize * 0.3})">
        <ellipse cx="0" cy="${logoSize * 0.08}" rx="${logoSize * 0.4}" ry="${logoSize * 0.2}"
                 fill="url(#fireGrad)" opacity="0.15"/>
        <path d="M 0 ${logoSize * 0.3}
                 Q ${logoSize * 0.2} ${logoSize * 0.05} ${logoSize * 0.1} ${-logoSize * 0.2}
                 Q 0 ${-logoSize * 0.3} ${-logoSize * 0.1} ${-logoSize * 0.2}
                 Q ${-logoSize * 0.2} ${logoSize * 0.05} 0 ${logoSize * 0.3}"
              fill="url(#fireGrad)" opacity="0.25"/>
      </g>

      <!-- DMB Text -->
      <text x="50%" y="${height / 2 + textSize * 0.2}"
            font-family="Arial Black, Arial, sans-serif"
            font-size="${textSize}px"
            font-weight="900"
            fill="${COLORS.text}"
            text-anchor="middle"
            dominant-baseline="middle"
            letter-spacing="${textSize * 0.05}px">DMB</text>

      <!-- ALMANAC Subtitle -->
      <text x="50%" y="${height / 2 + textSize * 0.2 + textSize * 0.8}"
            font-family="Arial, sans-serif"
            font-size="${subtitleSize}px"
            font-weight="400"
            fill="${COLORS.text}"
            text-anchor="middle"
            dominant-baseline="middle"
            letter-spacing="${subtitleSize * 0.15}px"
            opacity="0.7">ALMANAC</text>

      <!-- Decorative line -->
      <line x1="${width * 0.35}" y1="${height / 2 + textSize * 1.5}"
            x2="${width * 0.65}" y2="${height / 2 + textSize * 1.5}"
            stroke="${COLORS.primary}"
            stroke-width="${Math.max(2, logoSize * 0.02)}"
            opacity="0.5"/>
    </svg>
  `;
}

/**
 * Generate a PNG splash screen from SVG
 */
async function generateSplash(
  svg: string,
  outputPath: string,
  width: number,
  height: number
): Promise<void> {
  const buffer = Buffer.from(svg);

  await sharp(buffer)
    .resize(width, height)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log("PWA Splash Screen Generator for DMB Almanac");
  console.log("============================================\n");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}\n`);
  }

  console.log("Generating splash screens...");

  for (const size of SPLASH_SIZES) {
    const svg = createSplashSVG(size.width, size.height);
    const outputPath = path.join(OUTPUT_DIR, size.name);
    await generateSplash(svg, outputPath, size.width, size.height);
    console.log(`  - ${size.name} (${size.width}x${size.height})`);
  }

  console.log("\nSplash screen generation complete!");
  console.log(`\nGenerated ${SPLASH_SIZES.length} splash screens in ${OUTPUT_DIR}`);
}

// Run the script
main().catch((error) => {
  console.error("Error generating splash screens:", error);
  process.exit(1);
});
