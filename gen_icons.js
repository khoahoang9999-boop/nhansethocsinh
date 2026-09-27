const sharp = require('sharp');

function generateIcon(size) {
    const fontSize = Math.floor(size * 0.7);
    // Use #F59E0B for a nice yellow/amber background (or #EAB308)
    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.2)}" ry="${Math.floor(size * 0.2)}" fill="#EAB308" />
      <text x="50%" y="55%" fill="white" font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}px" text-anchor="middle" dominant-baseline="middle">K</text>
    </svg>`;
    
    return sharp(Buffer.from(svg))
      .png()
      .toFile(`public/icon${size}.png`);
}

Promise.all([
    generateIcon(16),
    generateIcon(48),
    generateIcon(128)
]).then(() => {
    console.log("Icons generated successfully!");
}).catch(err => {
    console.error("Error generating icons:", err);
});
