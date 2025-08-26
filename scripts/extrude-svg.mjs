// ABSOLUTE paths required.
// Usage:
//   node /Users/<you>/repos/bamb00/tools/extrude-svg.mjs \
//     --svg /ABS/path/to/shape.svg \
//     --out /ABS/path/to/bamb00/assets/head.stl \
//     --thickness 0.12 --scale 1.0 --flipY

import fs from 'fs/promises';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

// Try to import either package name
let svg2stl = null;
try { ({ default: svg2stl } = await import('svg2stl')); } catch {}
if (!svg2stl) { ({ default: svg2stl } = await import('svg-to-stl')); }

const argv = yargs(hideBin(process.argv))
  .option('svg',       { type: 'string', demandOption: true,  desc: 'ABS path to input SVG' })
  .option('out',       { type: 'string', demandOption: true,  desc: 'ABS path to output STL' })
  .option('thickness', { type: 'number', default: 0.12,       desc: 'Extrusion depth (arbitrary units)' })
  .option('scale',     { type: 'number', default: 1.0,        desc: 'Uniform scale before extrude' })
  .option('flipY',     { type: 'boolean', default: true,      desc: 'Flip Y (SVG Y+ is down)' })
  .strict().help().argv;

const mustAbs = (p, name) => {
  if (!path.isAbsolute(p)) throw new Error(`${name} must be absolute`);
  return p;
};

const svgPath = mustAbs(argv.svg, ' --svg');
const outPath = mustAbs(argv.out, ' --out');

const svgText = await fs.readFile(svgPath, 'utf8');

// Many svg→stl libs expose very similar options. These names work with
// `svg2stl` and most `svg-to-stl` forks: extrusion, scale, and flipY.
const stlText = svg2stl(svgText, {
  extrusion: argv.thickness,
  scale: argv.scale,
  flipY: argv.flipY,
  optimize: true,
});

await fs.writeFile(outPath, stlText);
console.log('Wrote STL →', outPath);
