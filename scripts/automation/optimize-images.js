const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDir = path.resolve(__dirname, "../../apps/web/public/images");
const outputDir = path.resolve(inputDir, "optimized");

if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const images = fs
    .readdirSync(inputDir)
    .filter((file) => /\.(jpg|jpeg|png|tiff)$/i.test(file));

console.log(`Optimizing ${images.length} images...`);

images.forEach((file) => {
    const inputPath = path.join(inputDir, file);
    const fileName = path.parse(file).name;

    sharp(inputPath)
        .resize(600)
        .webp({ quality: 80 })
        .toFile(path.join(outputDir, `${fileName}-mobile.webp`));

    sharp(inputPath)
        .resize(600)
        .avif({ quality: 50 })
        .toFile(path.join(outputDir, `${fileName}-mobile.avif`));

    sharp(inputPath)
        .resize(1200)
        .webp({ quality: 80 })
        .toFile(path.join(outputDir, `${fileName}-desktop.webp`));

    sharp(inputPath)
        .resize(1200)
        .avif({ quality: 50 })
        .toFile(path.join(outputDir, `${fileName}-desktop.avif`));

    console.log(`Optimized: ${file}`);
});
