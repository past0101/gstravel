import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const input = join(process.cwd(), 'public', 'icon.gif');
const outDir = join(process.cwd(), 'public');
const iconsDir = join(outDir, 'icons');

if (!existsSync(input)) {
  console.error('Missing public/icon.gif. Place your source icon at public/icon.gif and rerun.');
  process.exit(1);
}
if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 32, 48, 64, 96, 128, 192, 256, 384, 512];

(async () => {
  try {
    const pipeline = sharp(input, { animated: true }).flatten({ background: '#ffffff' });

    // Generate pngs
    await Promise.all(
      sizes.map(async (sz) => {
        const p = join(iconsDir, `icon-${sz}.png`);
        await pipeline.clone().resize(sz, sz).png({ compressionLevel: 9 }).toFile(p);
      })
    );

    // maskable (safe area with padding)
    const maskableSizes = [192, 512];
    await Promise.all(
      maskableSizes.map(async (sz) => {
        const pad = Math.round(sz * 0.1);
        const p = join(iconsDir, `icon-${sz}-maskable.png`);
        await pipeline
          .clone()
          .resize(sz - pad * 2, sz - pad * 2)
          .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' })
          .png({ compressionLevel: 9 })
          .toFile(p);
      })
    );

    // favicon.ico (16,32,48)
    const icoPath = join(outDir, 'favicon.ico');
    const icoBuffers = await Promise.all([16, 32, 48].map((sz) => pipeline.clone().resize(sz, sz).png().toBuffer()));
    // sharp doesn't write .ico directly; use a simple ICO writer
    const toIco = async (buffers) => {
      // Minimal ICO encoder for a few PNGs
      const header = Buffer.alloc(6);
      header.writeUInt16LE(0, 0); // reserved
      header.writeUInt16LE(1, 2); // image type = icon
      header.writeUInt16LE(buffers.length, 4); // count
      const entries = [];
      let offset = 6 + 16 * buffers.length;
      buffers.forEach((buf, i) => {
        const size = i === 0 ? 16 : i === 1 ? 32 : 48;
        const e = Buffer.alloc(16);
        e.writeUInt8(size === 256 ? 0 : size, 0); // width
        e.writeUInt8(size === 256 ? 0 : size, 1); // height
        e.writeUInt8(0, 2); // colors
        e.writeUInt8(0, 3); // reserved
        e.writeUInt16LE(1, 4); // color planes
        e.writeUInt16LE(32, 6); // bits per pixel
        e.writeUInt32LE(buf.length, 8); // size
        e.writeUInt32LE(offset, 12); // offset
        entries.push(e);
        offset += buf.length;
      });
      return Buffer.concat([header, ...entries, ...buffers]);
    };
    writeFileSync(icoPath, await toIco(icoBuffers));

    console.log('Icons generated in /public/icons and /public/favicon.ico');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
