import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "icon-original.png");
const outputPath = path.join(root, "src", "app", "icon.png");

const image = sharp(inputPath);
const meta = await image.metadata();
const size = Math.min(meta.width ?? 512, meta.height ?? 512);

await image
  .extract({
    left: Math.floor(((meta.width ?? size) - size) / 2),
    top: Math.floor(((meta.height ?? size) - size) / 2),
    width: size,
    height: size,
  })
  .resize(512, 512)
  .png()
  .toFile(outputPath);

console.log("Cropped icon to square and saved to src/app/icon.png");
