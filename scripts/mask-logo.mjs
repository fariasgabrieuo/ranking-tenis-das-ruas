import sharp from 'sharp';
import fs from 'fs';

const input =
  'C:/Users/Gabriel/.cursor/projects/c-Users-Gabriel-Projects-ranking-tenis-das-ruas/assets/logo-wings-out.png';
const outputTmp = 'public/logo-tmp.png';

/** Remove só fundo externo — nunca cores do mascote */
function isBackground(r, g, b, a) {
  if (a < 8) return true;
  if (r > 245 && g > 245 && b > 245) return true;
  if (r < 12 && g < 12 && b < 12) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 10 && max > 195 && max < 245) return true;
  return false;
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const visited = new Uint8Array(w * h);

function flood(startX, startY) {
  const stack = [[startX, startY]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const vi = y * w + x;
    if (visited[vi]) continue;
    const i = vi * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (!isBackground(r, g, b, a)) continue;
    visited[vi] = 1;
    data[i + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

for (let x = 0; x < w; x++) {
  flood(x, 0);
  flood(x, h - 1);
}
for (let y = 0; y < h; y++) {
  flood(0, y);
  flood(w - 1, y);
}

await sharp(data, { raw: info }).trim({ threshold: 6 }).png().toFile(outputTmp);
await sharp(outputTmp).resize(256, 256, { fit: 'inside' }).png().toFile('public/favicon.png');
fs.renameSync(outputTmp, 'public/logo.png');
console.log('logo ok');
