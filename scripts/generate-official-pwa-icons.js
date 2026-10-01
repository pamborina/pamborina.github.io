import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

// SVG Definition for Pamborina Official PWA App Icon
const pamborinaOfficialSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Radial Gradient -->
    <radialGradient id="darkBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1B120B" />
      <stop offset="60%" stop-color="#100A06" />
      <stop offset="100%" stop-color="#070503" />
    </radialGradient>

    <!-- Metallic Gold Gradient Primary -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE893" />
      <stop offset="25%" stop-color="#E5C158" />
      <stop offset="50%" stop-color="#C59B27" />
      <stop offset="75%" stop-color="#E6C86E" />
      <stop offset="100%" stop-color="#8C660D" />
    </linearGradient>

    <!-- Metallic Gold Gradient Secondary -->
    <linearGradient id="goldGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9E7618" />
      <stop offset="30%" stop-color="#F7E49A" />
      <stop offset="70%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#7A560B" />
    </linearGradient>

    <!-- Bronze Accent Gradient -->
    <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#4A3209" />
    </linearGradient>

    <!-- Soft Ambient Glow Filter -->
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Text Ring Path -->
    <path id="ringPath" d="M 256, 256 m -168, 0 a 168,168 0 1,1 336,0 a 168,168 0 1,1 -336,0" />
  </defs>

  <!-- 1. Deep Luxury Squircle Base -->
  <rect width="512" height="512" rx="112" fill="url(#darkBg)" />

  <!-- 2. Dual Metallic Outer Border Frame -->
  <rect x="10" y="10" width="492" height="492" rx="102" fill="none" stroke="url(#goldGrad)" stroke-width="7" />
  <rect x="18" y="18" width="476" height="476" rx="94" fill="none" stroke="#000000" stroke-width="3" opacity="0.8" />
  <rect x="22" y="22" width="468" height="468" rx="90" fill="none" stroke="url(#goldGrad2)" stroke-width="2" opacity="0.6" />

  <!-- 3. Dashed Stitching Golden Ring -->
  <circle cx="256" cy="256" r="222" fill="none" stroke="url(#goldGrad)" stroke-width="2" stroke-dasharray="9 7" opacity="0.65" />

  <!-- 4. Inner Medallion Double Ring Frame -->
  <circle cx="256" cy="256" r="186" fill="#0C0805" stroke="url(#goldGrad)" stroke-width="6" filter="url(#goldGlow)" />
  <circle cx="256" cy="256" r="154" fill="none" stroke="url(#goldGrad2)" stroke-width="2.5" />

  <!-- 5. Rim Circular Text (Pamborina sweet ***) -->
  <text fill="url(#goldGrad)" font-size="14.5" font-family="'Readex Pro', 'Cinzel', serif" font-weight="700" letter-spacing="2.8px">
    <textPath href="#ringPath" startOffset="0%">
      Pamborina sweet *** Pamborina sweet *** Pamborina sweet *** Pamborina sweet ***
    </textPath>
  </text>

  <!-- 6. Central Emblem Group -->
  <!-- A. The Tree of Life Emblem -->
  <g transform="translate(256, 150) scale(1.05)">
    <!-- Foliage Canopy -->
    <circle cx="0" cy="-34" r="38" fill="#43632F" opacity="0.9" />
    <circle cx="-22" cy="-28" r="24" fill="#58813F" />
    <circle cx="22" cy="-28" r="24" fill="#58813F" />
    <circle cx="-12" cy="-48" r="22" fill="#75A054" />
    <circle cx="12" cy="-48" r="22" fill="#75A054" />
    <circle cx="0" cy="-38" r="26" fill="#88B861" />

    <!-- Golden Leaf Sparkles inside Tree -->
    <circle cx="-16" cy="-42" r="3.5" fill="#FFE893" />
    <circle cx="18" cy="-36" r="3.5" fill="#FFE893" />
    <circle cx="0" cy="-52" r="4" fill="#FFF2A8" />
    <circle cx="-8" cy="-24" r="3" fill="#FFE893" />
    <circle cx="10" cy="-22" r="3" fill="#FFE893" />
    <circle cx="24" cy="-44" r="2.5" fill="#FFF8DC" />

    <!-- Tree Trunk & Branches (Metallic Gold) -->
    <path d="M -6 16 C -6 4 -18 -8 -26 -16 C -18 -12 -8 0 -4 4 C -4 -12 -14 -24 -20 -32 C -12 -24 -2 -16 0 -8 C 2 -16 12 -24 20 -32 C 14 -24 4 -12 4 4 C 8 0 18 -12 26 -16 C 18 -8 6 4 6 16 Z" fill="url(#goldGrad)" />
    <!-- Trunk Base Roots -->
    <path d="M -12 24 Q 0 14 12 24 Q 4 18 0 18 Q -4 18 -12 24 Z" fill="url(#goldGrad)" />
  </g>

  <!-- B. Pamborina Calligraphic Logo Text -->
  <g transform="translate(256, 252)">
    <!-- Shadow Effect for Depth -->
    <text x="1" y="1" text-anchor="middle" font-family="'Playfair Display', 'Brush Script MT', 'Great Vibes', serif" font-size="52" font-weight="bold" font-style="italic" fill="#000000" opacity="0.8">
      Pamborina
    </text>
    <text x="0" y="0" text-anchor="middle" font-family="'Playfair Display', 'Brush Script MT', 'Great Vibes', serif" font-size="52" font-weight="bold" font-style="italic" fill="url(#goldGrad)" filter="url(#goldGlow)">
      Pamborina
    </text>
  </g>

  <!-- C. PATISSERIE Subtitle -->
  <text x="256" y="294" text-anchor="middle" font-family="'Readex Pro', 'Montserrat', sans-serif" font-size="17" font-weight="800" letter-spacing="9px" fill="#F4E08B">
    PATISSERIE
  </text>

  <!-- D. Tapered Gold Accent Bar -->
  <path d="M 166 310 Q 256 306 346 310 Q 256 314 166 310 Z" fill="url(#goldGrad)" />

  <!-- E. Three Gold Stars -->
  <!-- Center Star (Larger) -->
  <g transform="translate(256, 334) scale(1.15)">
    <polygon points="0,-12 3.5,-3.5 12,0 3.5,3.5 0,12 -3.5,3.5 -12,0 -3.5,-3.5" fill="url(#goldGrad)" />
  </g>
  <!-- Left Star -->
  <g transform="translate(216, 336) scale(0.85)">
    <polygon points="0,-12 3.5,-3.5 12,0 3.5,3.5 0,12 -3.5,3.5 -12,0 -3.5,-3.5" fill="url(#goldGrad2)" opacity="0.9" />
  </g>
  <!-- Right Star -->
  <g transform="translate(296, 336) scale(0.85)">
    <polygon points="0,-12 3.5,-3.5 12,0 3.5,3.5 0,12 -3.5,3.5 -12,0 -3.5,-3.5" fill="url(#goldGrad2)" opacity="0.9" />
  </g>
</svg>`;

// Ensure directories exist
const publicDir = path.resolve('public');
const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Save master SVG file to public/favicon.svg and public/icons/icon-master.svg
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), pamborinaOfficialSvg);
fs.writeFileSync(path.join(iconsDir, 'icon-master.svg'), pamborinaOfficialSvg);
console.log('Saved master SVG logo to public/favicon.svg and public/icons/icon-master.svg');

// 2. Render standard icons
const resvgMaster = new Resvg(Buffer.from(pamborinaOfficialSvg), {
  fitTo: { mode: 'width', value: 512 },
});
const png512Buffer = resvgMaster.render().asPng();

// Render 192x192
const resvg192 = new Resvg(Buffer.from(pamborinaOfficialSvg), {
  fitTo: { mode: 'width', value: 192 },
});
const png192Buffer = resvg192.render().asPng();

// Render Apple Touch Icon (180x180)
const resvg180 = new Resvg(Buffer.from(pamborinaOfficialSvg), {
  fitTo: { mode: 'width', value: 180 },
});
const png180Buffer = resvg180.render().asPng();

// Write files to public/ and public/icons/
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512Buffer);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192Buffer);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180Buffer);

fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512Buffer);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192Buffer);
console.log('Saved standard 512x512 and 192x192 icons to public/ and public/icons/');

// 3. Render Maskable Icon with 10% safety margin (scale 80% inside black background)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#070503" />
  <g transform="translate(51.2, 51.2) scale(0.8)">
    ${pamborinaOfficialSvg.replace(/<svg[^>]*>|<\/svg>/g, '')}
  </g>
</svg>`;

const resvgMaskable = new Resvg(Buffer.from(maskableSvg), {
  fitTo: { mode: 'width', value: 512 },
});
const pngMaskableBuffer = resvgMaskable.render().asPng();

fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskableBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), pngMaskableBuffer);
console.log('Saved maskable icons to public/pwa-maskable-512x512.png and public/icons/icon-maskable-512.png');
