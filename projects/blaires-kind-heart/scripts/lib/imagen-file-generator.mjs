import path from 'path';
import { fileExists, sleep, writeBase64Image } from './fs-helpers.mjs';
import { requestImagenBase64 } from './imagen-client.mjs';

export async function generateImagenFile({
  prompt,
  filename,
  outputDir,
  negativePrompt,
  aspectRatio = '1:1',
  skipExisting = false,
  attempts = 1,
  rateLimitDelayMs = 65_000,
  onRateLimit = null,
}) {
  const filepath = path.join(outputDir, filename);

  if (skipExisting && await fileExists(filepath)) {
    return { status: 'skipped', filepath, bytes: null, errorMessage: null };
  }

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await requestImagenBase64({
      prompt,
      aspectRatio,
      negativePrompt,
    });

    if (result.ok && result.bytesBase64Encoded) {
      const bytes = await writeBase64Image(filepath, result.bytesBase64Encoded);
      return { status: 'generated', filepath, bytes, errorMessage: null };
    }

    if (result.status === 429 && attempt < attempts) {
      if (typeof onRateLimit === 'function') {
        await onRateLimit({ filename, waitMs: rateLimitDelayMs, attempt, attempts });
      }
      await sleep(rateLimitDelayMs);
      continue;
    }

    return {
      status: 'failed',
      filepath,
      bytes: null,
      errorMessage: result.errorMessage || 'No image data returned',
    };
  }

  return {
    status: 'failed',
    filepath,
    bytes: null,
    errorMessage: 'No image data returned',
  };
}
