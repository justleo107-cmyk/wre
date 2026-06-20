/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function getJpgSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  let i = 0;
  if (buffer[i] !== 0xFF || buffer[i+1] !== 0xD8) {
    throw new Error('Not a valid JPEG');
  }
  i += 2;
  while (i < buffer.length) {
    if (buffer[i] === 0xFF && buffer[i+1] === 0xC0) {
      // SOF0 block
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    i++;
  }
  return null;
}

try {
  const fullPath = path.join(__dirname, '../../public/vanta_logo_full.jpg');
  console.log('vanta_logo_full:', getJpgSize(fullPath));
  const iconPath = path.join(__dirname, '../../public/vanta_logo_icon.jpg');
  console.log('vanta_logo_icon:', getJpgSize(iconPath));
} catch (e) {
  console.error(e);
}
