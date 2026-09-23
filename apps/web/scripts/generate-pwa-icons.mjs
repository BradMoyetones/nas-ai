#!/usr/bin/env node

/**
 * Genera todos los íconos PWA necesarios desde el logo fuente.
 *
 * Uso: node scripts/generate-pwa-icons.mjs
 *
 * Logo fuente: public/img/LOGO_IDT_192x192.png (fondo transparente)
 * Salida:      public/img/PWA/
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE_LOGO = resolve(ROOT, 'public/img/logo-background.png');
const OUTPUT_DIR = resolve(ROOT, 'public/img/PWA');

// ---------------------------------------------------------------------------
// Configuración de íconos a generar
// ---------------------------------------------------------------------------
const ICONS = [
  // Favicons
  { name: 'favicon-16x16.png', size: 16, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  { name: 'favicon-32x32.png', size: 32, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  { name: 'favicon-48x48.png', size: 48, background: { r: 255, g: 255, b: 255, alpha: 0 } },

  // Apple Touch Icon (requiere fondo sólido, iOS no soporta transparencia bien)
  { name: 'apple-touch-icon-180x180.png', size: 180, background: { r: 255, g: 255, b: 255, alpha: 1 }, padding: 0 },

  // PWA Standard Icons (any purpose)
  { name: 'pwa-icon-192x192.png', size: 192, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  { name: 'pwa-icon-512x512.png', size: 512, background: { r: 255, g: 255, b: 255, alpha: 0 } },

  // PWA Maskable Icon (necesita safe zone del 20% = padding del 10% en cada lado)
  { name: 'pwa-maskable-512x512.png', size: 512, background: { r: 255, g: 255, b: 255, alpha: 1 }, padding: 0 },
];

// ---------------------------------------------------------------------------
// Generador
// ---------------------------------------------------------------------------
async function generateIcon(sourceBuffer, { name, size, background, padding = 0 }) {
  const logoSize = Math.round(size * (1 - padding * 2));

  const resizedLogo = await sharp(sourceBuffer)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const icon = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resizedLogo, gravity: 'centre' }])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  const outputPath = resolve(OUTPUT_DIR, name);
  await writeFile(outputPath, icon);
  console.log(`  ✓ ${name} (${size}×${size})`);
}

async function generateFaviconICO(sourceBuffer) {
  // Generar las 3 resoluciones para el .ico
  const sizes = [16, 32, 48];
  const buffers = await Promise.all(
    sizes.map((size) =>
      sharp(sourceBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  // Construir ICO manualmente (formato simple)
  const ico = buildICO(
    buffers.map((buf, i) => ({ buffer: buf, size: sizes[i] }))
  );

  const outputPath = resolve(OUTPUT_DIR, 'favicon.ico');
  await writeFile(outputPath, ico);
  console.log(`  ✓ favicon.ico (${sizes.join('+')})`);
}

/**
 * Construye un archivo ICO básico a partir de imágenes PNG.
 * Formato: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function buildICO(images) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;

  let dataOffset = headerSize + dirEntrySize * numImages;
  const dirEntries = [];
  const imageDataParts = [];

  for (const { buffer, size } of images) {
    const width = size >= 256 ? 0 : size;
    const height = size >= 256 ? 0 : size;

    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(width, 0);        // width
    entry.writeUInt8(height, 1);       // height
    entry.writeUInt8(0, 2);            // color palette
    entry.writeUInt8(0, 3);            // reserved
    entry.writeUInt16LE(1, 4);         // color planes
    entry.writeUInt16LE(32, 6);        // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);  // image data size
    entry.writeUInt32LE(dataOffset, 12);    // image data offset

    dirEntries.push(entry);
    imageDataParts.push(buffer);
    dataOffset += buffer.length;
  }

  // ICO Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);           // reserved
  header.writeUInt16LE(1, 2);           // type: 1 = ICO
  header.writeUInt16LE(numImages, 4);   // number of images

  return Buffer.concat([header, ...dirEntries, ...imageDataParts]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🎨 Generando íconos PWA...\n');
  console.log(`  Logo fuente: ${SOURCE_LOGO}`);
  console.log(`  Directorio de salida: ${OUTPUT_DIR}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const sourceBuffer = await sharp(SOURCE_LOGO)
    .png()
    .toBuffer();

  // Generar todos los PNGs
  for (const config of ICONS) {
    await generateIcon(sourceBuffer, config);
  }

  // Generar favicon.ico
  await generateFaviconICO(sourceBuffer);

  console.log('\n✅ Todos los íconos generados correctamente.\n');
}

main().catch((err) => {
  console.error('❌ Error generando íconos:', err);
  process.exit(1);
});
