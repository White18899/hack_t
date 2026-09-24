import fs from 'fs';

const b64 = fs.readFileSync('public/assets/infinity_gauntlet_opt.jpg').toString('base64');
const content = `window.INFINITY_GAUNTLET_BASE64 = "data:image/jpeg;base64,${b64}";\n`;

fs.writeFileSync('public/assets/gauntlet-asset.js', content, 'utf8');
if (fs.existsSync('assets')) {
  fs.writeFileSync('assets/gauntlet-asset.js', content, 'utf8');
}
if (fs.existsSync('a:/assets')) {
  fs.writeFileSync('a:/assets/gauntlet-asset.js', content, 'utf8');
}

console.log('gauntlet-asset.js created successfully. Total characters:', content.length);
