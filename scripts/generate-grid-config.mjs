// scripts/generate-grid-config.mjs
import fs from 'fs';
import path from 'path';

const setDir = process.argv[2];  // ABS path to the specific set folder
const outFile = process.argv[3]; // ABS path to grid-config.js

if (!setDir || !outFile) {
  console.error('Usage: node scripts/generate-grid-config.mjs <ABS_SET_DIR> <ABS_OUT_JS>');
  process.exit(1);
}

const re = /^(\d+)-(\d+)-(\d+)\.stl$/i;
const files = fs.readdirSync(setDir).filter(f => re.test(f));
if (!files.length) {
  console.error('No STL tiles found in:', setDir);
  process.exit(1);
}

let maxX = -1, maxY = -1, maxZ = -1;
for (const f of files) {
  const [, xs, ys, zs] = f.match(re);
  const x = parseInt(xs, 10), y = parseInt(ys, 10), z = parseInt(zs, 10);
  if (x > maxX) maxX = x;
  if (y > maxY) maxY = y;
  if (z > maxZ) maxZ = z;
}
const countX = maxX + 1, countY = maxY + 1, countZ = maxZ + 1;

const partsVis = Array.from({ length: countX }, () =>
  Array.from({ length: countY }, () => Array(countZ).fill(false))
);

for (const f of files) {
  const [, xs, ys, zs] = f.match(re);
  const x = parseInt(xs, 10), y = parseInt(ys, 10), z = parseInt(zs, 10);
  partsVis[x][y][z] = true;
}

const cfg = `// Auto-generated from ${path.basename(setDir)}
var countX=${countX}, countY=${countY}, countZ=${countZ};
var cropX=${countX}, cropY=${countY}, cropZ=${countZ};
var partSizeX=${1 / countX}, partSizeY=${1 / countY}, partSizeZ=${1 / countZ};
var partsVis=${JSON.stringify(partsVis)};`;

fs.writeFileSync(outFile, cfg, 'utf8');
console.log('Wrote', outFile);
