import fs from 'fs';
import path from 'path';

const logoB64 = fs.readFileSync('logo_base64.txt', 'utf-8').trim();
const base64Data = logoB64.replace(/^data:image\/png;base64,/, "");
const buffer = Buffer.from(base64Data, 'base64');

const files = [
  'public/icon16.png',
  'public/icon48.png',
  'public/icon128.png',
  'public/icon_v2_16.png',
  'public/icon_v2_48.png',
  'public/icon_v2_128.png',
  'public/icon_v3_16.png',
  'public/icon_v3_48.png',
  'public/icon_v3_128.png'
];

files.forEach(file => {
    try {
        fs.writeFileSync(file, buffer);
        console.log(`Restored ${file}`);
    } catch (e) {
        console.error(`Failed to restore ${file}: ${e.message}`);
    }
});
