/**
 * Icon Generator Script
 * Run with: node scripts/generate-icons.js
 *
 * This creates placeholder PNG icons for the extension.
 * For production, replace with properly designed icons.
 */

const fs = require('fs');
const path = require('path');

// Simple 1x1 purple pixel PNG (placeholder)
// In production, use proper icon design tools
const createPlaceholderPNG = (size) => {
  // PNG header and minimal IHDR for a solid color square
  // This is a very basic approach - for real icons, use canvas or an image library

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#818cf8"/>
        <stop offset="100%" style="stop-color:#6366f1"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#bg)"/>
    <text x="64" y="85" font-family="system-ui, sans-serif" font-size="64" font-weight="bold" fill="white" text-anchor="middle">¡E!</text>
  </svg>`;

  return svg;
};

// For Chrome extension, we can actually use SVG icons in manifest v3
// But we'll provide PNG fallbacks

const iconsDir = path.join(__dirname, '..', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icons at different sizes (Chrome will scale as needed)
[16, 48, 128].forEach(size => {
  const svg = createPlaceholderPNG(size);
  const filename = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Created ${filename}`);
});

console.log('\nNote: For production, convert SVG to PNG using:');
console.log('- https://convertio.co/svg-png/');
console.log('- Inkscape: inkscape icon.svg -w 128 -h 128 -o icon128.png');
console.log('- ImageMagick: convert icon.svg icon128.png');
