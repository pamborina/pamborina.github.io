import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve('public/favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Generate standard PNGs
const sizes = [
  { name: 'pwa-192x192.png', width: 192 },
  { name: 'pwa-512x512.png', width: 512 },
  { name: 'apple-touch-icon.png', width: 180 },
  { name: 'favicon-32x32.png', width: 32 },
  { name: 'favicon-16x16.png', width: 16 },
];

for (const item of sizes) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: item.width,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.resolve('public', item.name), pngBuffer);
  console.log(`Generated public/${item.name} (${item.width}x${item.width})`);
}

// Generate maskable PNG with safe zone margin (scaled to 80% inside full background)
const svgString = svgBuffer.toString('utf-8');
const maskableSvg = svgString.replace(
  '<g transform="translate(0, 10)" filter="url(#goldGlow)">',
  '<g transform="translate(51.2, 51.2) scale(0.8)" filter="url(#goldGlow)">'
);

const maskableResvg = new Resvg(Buffer.from(maskableSvg), {
  fitTo: {
    mode: 'width',
    value: 512,
  },
});
const maskablePngData = maskableResvg.render();
fs.writeFileSync(path.resolve('public/pwa-maskable-512x512.png'), maskablePngData.asPng());
console.log('Generated public/pwa-maskable-512x512.png (512x512 maskable)');
