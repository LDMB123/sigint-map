import fs from "fs/promises";
import path from "path";
import { copyAndCleanupTempImage, fileExists, sleep } from "./fs-helpers.mjs";

function isRateLimitError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
}

export async function runNanobananaBatch({
  title,
  outputDir,
  items,
  delayMs = 65_000,
  maxRetries = 3,
  emptyResultLabel = "images",
  itemLabel = (item, index, total) =>
    `[${index + 1}/${total}] ${item.filename || path.basename(item.outputPath)}`,
  itemContext = () => "",
  generateImage,
}) {
  console.log("=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
  console.log(`Output directory: ${outputDir}`);
  console.log(`Delay between calls: ${delayMs / 1000}s`);
  console.log();

  await fs.mkdir(outputDir, { recursive: true });

  console.log(`Total items to process: ${items.length}`);
  console.log();

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const label = itemLabel(item, index, items.length);

    if (await fileExists(item.outputPath)) {
      console.log(`${label} — SKIP (already exists)`);
      skipped += 1;
      continue;
    }

    console.log(`${label} — Generating...`);
    const context = itemContext(item);
    if (context) {
      console.log(context);
    }

    let success = false;
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        const result = await generateImage({
          prompt: item.prompt,
          aspectRatio: item.aspectRatio ?? "1:1",
          imageSize: "1K",
          showThinkingProcess: false,
        });

        if (result.images && result.images.length > 0) {
          const sourcePath = result.images[0];
          const bytes = await copyAndCleanupTempImage(sourcePath, item.outputPath);
          const sizeKB = (bytes / 1024).toFixed(0);
          console.log(`  OK: ${path.basename(item.outputPath)} (${sizeKB} KB)`);
          generated += 1;
          success = true;
          break;
        }
        console.error(
          `  EMPTY: No ${emptyResultLabel} returned (attempt ${attempt}/${maxRetries})`,
        );
      } catch (error) {
        if (isRateLimitError(error) && attempt < maxRetries) {
          const backoff = attempt * 60_000;
          console.log(
            `  RATE LIMITED (attempt ${attempt}/${maxRetries}), waiting ${backoff / 1000}s...`,
          );
          await sleep(backoff);
          continue;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ERROR: ${path.basename(item.outputPath)} — ${message.substring(0, 120)}`);
        break;
      }
    }

    if (!success) {
      failed += 1;
    }

    if (index < items.length - 1) {
      const nextItem = items[index + 1];
      if (!(await fileExists(nextItem.outputPath))) {
        console.log(`  Waiting ${delayMs / 1000}s before next request...`);
        await sleep(delayMs);
      }
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total:     ${items.length}`);
  console.log();

  if (failed > 0) {
    console.log("Some items failed. Re-run this script to retry (skip-if-exists).");
  } else if (generated === 0 && skipped === items.length) {
    console.log("All items already exist. Nothing to generate.");
  } else {
    console.log("All items generated successfully!");
  }
}
