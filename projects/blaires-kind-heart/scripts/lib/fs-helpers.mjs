import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function writeBase64Image(outputPath, bytesBase64Encoded) {
  const imageData = Buffer.from(bytesBase64Encoded, 'base64');
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, imageData);
  return imageData.length;
}

export async function copyAndCleanupTempImage(sourcePath, outputPath) {
  await ensureDir(path.dirname(outputPath));
  await fs.copyFile(sourcePath, outputPath);
  await fs.unlink(sourcePath).catch(() => {});
  const stats = await fs.stat(outputPath);
  return stats.size;
}
