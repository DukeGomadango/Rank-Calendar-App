import { readFile } from "node:fs/promises";
import { createWorker } from "tesseract.js";

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Usage: node scripts/debug-calendar-ocr.mjs <image-path>");
    process.exit(1);
  }

  console.log("[debug-ocr] reading image:", imagePath);
  await readFile(imagePath); // just to fail fast if not found

  const worker = await createWorker("jpn", 1);
  const {
    data: { text },
  } = await worker.recognize(imagePath);
  await worker.terminate();

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log("----- OCR raw lines -----");
  lines.forEach((line, idx) => {
    console.log(String(idx + 1).padStart(3, " "), line);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

