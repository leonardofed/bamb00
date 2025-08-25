/* -------------------------------------------------------
   bamb00.js  (local-friendly)
   - provides fallback config (countX/Y/Z, partsVis, etc.)
   - uses RELATIVE asset paths (assets/..., not /assets/...)
   - safely skips grid parts if not available
-------------------------------------------------------- */

var canvas;
var projectLoaded = false;

var W, H, D;
var size;
var pxDensity;
var strokeWght;

/* ---------- Fallback config (so it runs without external config files) ---------- */
var countX = window.countX ?? 3;
var countY = window.countY ?? 3;
var countZ = window.countZ ?? 3;

var cropX = window.cropX ?? 1;
var cropY = window.cropY ?? 1;
var cropZ = window.cropZ ?? 1;

var partSizeX = window.partSizeX ?? (1 / countX);
var partSizeY = window.partSizeY ?? (1 / countY);
var partSizeZ = window.partSizeZ ?? (1 / countZ);

var partsVis =
  window.partsVis ??
  Array.from({ length: countX }, () =>
    Array.from({ length: countY }, () => Array(countZ).fill(true))
  );

// Set to true only if you actually have /assets/stl/<...>/<x>-<y>-<z>.stl files.
var LOAD_GRID_PARTS = true;

/* dynamic */
var dynamic;
var improveFpsLags = true;
var speed = 1.0;
var fps = 60;
var ff;
var lastMillis;
var destMs = 1000 / fps;

/* story */
var STAGE = 0;
var stageTimer = 0;
var showAnimation = true;
var showEnding = false;

/* sound input */
var sound;
var soundTimer = 0;

/* shapes */
var baseShape;
var parts = [];
var partsSet;
var depth;

/* transitions */
var maxX = 2, maxY = 1, maxZ = 2;
var spaceX = 0, spaceY = 0, spaceZ = 0;
var spaceXEased = 0, spaceYEased = 0, spaceZEased = 0;
var scaleX = 1, scaleY = 1, scaleZ = 1;
var scaleXEased = 1, scaleYEased = 1, scaleZEased = 1;
var partSX, partSY, partSZ;
var partW, partH, partZ;
var rotX = 0, rotY = 0, rotXEased = 0, rotYEased = 0;
var protX = 0, protY = 0, protXEased = 0, protYEased = 0;
var rotYspd = 0, protYspd = 0;
var totalBoxW, totalBoxH, totalBoxD;
var worldTranslateY = -15, worldTranslateYEased = worldTranslateY;

/* rules */
var changeViewChance;
var changeRandomRotY;
var changeRandomProtY;
var changeScales;
var maxRescale = 1.0;
var changeSpaces;
var changeTransforms;
var changeFlips;
var changePartsSet;

/* preview */
var showTotalBox;
var showPartBox;
var showGroundBox;
var showVertices;
var randomizeGrid;
var glitchGrids;

/* ------------------------------ PRELOAD ------------------------------ */
function preload() {
  // base head (RELATIVE path)
  baseShape = loadModel('assets/head.stl', false);

  // optional sliced parts
  if (LOAD_GRID_PARTS) {
    console.log(countX + '-' + countY + '-' + countZ + '-' + cropX + '-' + cropY + '-' + cropZ);
    for (let x = 0; x < countX; x++) {
      parts[x] = [];
      for (let y = 0; y < countY; y++) {
        parts[x][y] = [];
        for (let z = 0; z < countZ; z++) {
          if (partsVis[x][y][z]) {
            parts[x][y][z] = loadModel(
              `assets/stl/${countX}-${countY}-${countZ}-${cropX}-${cropY}-${cropZ}/${x}-${y}-${z}.stl`
            );
          }
        }
      }
    }
  }
}

/* ------------------------------- SETUP ------------------------------- */
function setup() {
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.parent('video');

  // optimizing pixel density
  let maxPixels = 2436 * 1125; // 2436x1125 is iPhone
  pxDensity =
    (windowWidth * window.devicePixelRatio * windowHeight * window.devicePixelRatio) > maxPixels
      ? 1
      : window.devicePixelRatio;

  setupSets();
  noFill();

  document.body.classList.add('projectLoaded');
  projectLoaded = true;
}

function setupSets() {
  pixelDensity(pxDensity);
  ortho(-width / 2, width / 2, -height / 2, height / 2, -height * 3, height * 3);
  lastMillis = millis();
  size = windowWidth > windowHeight ? windowHeight * 1.1 : windowWidth * 1.2;
  strokeWght = 0.0055 * size * pxDensity;
  strokeWeight(strokeWght / 2);
  setDefaults();
  changeStageSettings();
  randomSet();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setupSets();
}

function keyPressed() {
  key = key.toLowerCase();
  if (key == 'q') nextPartsSet();
  if (key == 'w') showRandomGrid();
  if (key == 'e') randomRotY();
  if (key == 'r') randomPRotY();
  if (key == 'a') setRandomView();
  if (key == 's') randomSpacing();
  if (key == 'd') randomScaling();
  if (key == 'f') boom();
  if (key == ' ') togglePlay();
  // if (key == 'p') printRecords();
}

/* ---------------------------- UTILITIES ----------------------------- */
function printRecords() {
  let notesHtml = '';
  let keys = Object.keys(midiRecorder);
  for (let i = 0; i < keys.length; i++) {
    let notes = [];
    for (let j = 0; j < midiRecorder[keys[i]].length; j++)
      notes.push('[' + midiRecorder[keys[i]][j].toString() + ']');
    notesHtml += keys[i] + ': [ ' + join(notes, ', ') + ' ],<br>';
  }
  document.querySelector('body').innerHTML = `const midiRecorder = {<br> ${notesHtml} }`;
}

function randomSet() {
  let c = Math.floor(random(8));
  switch (c) {
    case 0: nextPartsSet(); break;
    case 1: showRandomGrid(); break;
    case 2: randomRotY(); break;
    case 3: randomPRotY(); break;
    case 4: setRandomView(); break;
    case 5: randomSpacing(); break;
    case 6: randomScaling(); break;
    case 7: boom(); break;
  }
}

function setDefaults() {
  resetTranslates();
  resetFlips();
  resetSpace();
  resetScale();

  dynamic = 0.45;
  depth = 5;

  rotYspd = 0;
  protYspd = 0;

  changeViewChance = 0;
  changeRandomRotY = false;
  changeRandomProtY = false;
  changeScales = false;
  changeSpaces = false;
  changeTransforms = false;
  changeFlips = false;
  changePartsSet = false;

  glitchGrids = false;

  showTotalBox = false;
  showPartBox = false;
  showGroundBox = true;
  showVertices = false;
  randomizeGrid = false;
  changePartsSet = false;
}

/* ------------------------------- DRAW -------------------------------- */
function draw() {
  midiSynchronizer.update();

  background(0);

  // reading sound amplitude
  sound = fmap(soundIn / 128, 0.15, 0.32);
  soundTimer += sound * 0.05;

  // calculating proper fps increase
  let diff = millis() - lastMillis;
  lastMillis = millis();
  ff = improveFpsLags ? (diff / destMs) : 1;
  ff *= speed;
  stageTimer += ff;

  if (!showAnimation) return;

  stroke(0, 255, 0);

  push();

  worldTranslateYEased = eased(worldTranslateYEased, worldTranslateY, 0.2);
  translate(0, worldTranslateYEased, -height * 0.1);

  rotY += ff * rotYspd;
  protY += ff * protYspd;
  rotXEased = eased(rotXEased, rotX, 0.25);
  rotYEased = eased(rotYEased, rotY, 0.25);
  protXEased = eased(protXEased, protX, 0.3);
  protYEased = eased(protYEased, protY, 0.3);
  spaceXEased = eased(spaceXEased, spaceX, 0.4);
  spaceYEased = eased(spaceYEased, spaceY, 0.4);
  spaceZEased = eased(spaceZEased, spaceZ, 0.4);
  scaleXEased = eased(scaleXEased, scaleX, 0.4);
  scaleYEased = eased(scaleYEased, scaleY, 0.4);
  scaleZEased = eased(scaleZEased, scaleZ, 0.4);

  partSX = scaleXEased * size;
  partSY = scaleYEased * size;
  partSZ = scaleZEased * size;
  partW = partSX * partSizeX;
  partH = partSY * partSizeY;
  partZ = partSZ * partSizeZ;

  totalBoxW = (spaceXEased * size + partW) * countX;
  totalBoxH = (spaceYEased * size + partH) * countY;
  totalBoxD = (spaceZEased * size + partZ) * countZ;

  if (partsSet > 1) {
    partW *= cropX;
    partH *= cropY;
    partZ *= cropZ;
  }

  rotateX(rotXEased);
  rotateY(rotYEased);

  if (showGroundBox || (glitchGrids && chance(sound * 0.08))) {
    push();
    let dx = totalBoxW / countX;
    let dz = totalBoxD / countZ;
    translate(-totalBoxW / 2 - dx, totalBoxH / 2, -totalBoxD / 2 - dz);
    for (let x = 0; x <= countX + 2; x++) line(x * dx, 0, 0, x * dx, 0, dz * (countZ + 2));
    for (let z = 0; z <= countZ + 2; z++) line(0, 0, z * dz, dx * (countX + 2), 0, z * dz);
    pop();
  }

  if (showTotalBox || (glitchGrids && chance(sound * 0.08))) {
    push();
    box(totalBoxW, totalBoxH, totalBoxD);
    pop();
  }

  if (showVertices) {
    let lng = 450;
    line(-lng, 0, 0, lng, 0, 0);
    line(0, -lng * 0.5, 0, 0, lng * 0.5, 0);
    line(0, 0, -lng, 0, 0, lng);
  }

  var mrotY = 0;
  let px, py, pz;

  for (let x = 0; x < countX; x++) {
    for (let y = 0; y < countY; y++) {
      for (let z = 0; z < countZ; z++) {

        let trX = x + translateX[y][z];
        let trY = y + translateY[x][z];
        let trZ = z + translateZ[x][y];
        let tx = (spaceXEased + partSizeX * scaleXEased) * size * (countX / 2.0 - trX - 0.5);
        let ty = (spaceYEased + partSizeY * scaleYEased) * size * (countY / 2.0 - trY - 0.5);
        var tz = (spaceZEased + partSizeZ * scaleXEased) * size * (countZ / 2.0 - trZ - 0.5);

        positions[x][y][z][0] = eased(positions[x][y][z][0], tx, 0.85);
        positions[x][y][z][1] = eased(positions[x][y][z][1], ty, 0.85);
        positions[x][y][z][2] = eased(positions[x][y][z][2], tz, 0.85);

        pprotXEased[x][y][z] = eased(pprotXEased[x][y][z], (flipsX[x][y][z] ? PI : 0), 0.65);
        pprotYEased[x][y][z] = eased(pprotYEased[x][y][z], (flipsY[x][y][z] ? PI : 0), 0.65);
        pprotZEased[x][y][z] = eased(pprotZEased[x][y][z], (flipsZ[x][y][z] ? PI : 0), 0.65);

        // constrain to 3x3 parts when partsSet is 1 (optimizing)
        if (
          partsSet != 1 ||
          (x >= ((countX - 1) / 2 - 1) && x <= ((countX - 1) / 2 + 1) &&
           y >= ((countY - 1) / 2 - 1) && y <= ((countY - 1) / 2 + 1) &&
           z >= ((countZ - 1) / 2 - 1) && z <= ((countZ - 1) / 2 + 1))
        ) {

          if (partsSet == 2) {
            px = Math.floor(noise(0, x + stageTimer * 0.01) * countX);
            py = Math.floor(noise(1, y + stageTimer * 0.01) * countY);
            pz = Math.floor(noise(2, z + stageTimer * 0.01) * countZ);
          } else if (partsSet == 3) {
            let dens = 0.45;
            px = Math.floor(noise(x * dens, y * dens, z * dens + stageTimer * 0.001 + soundTimer * 1.1) * countX);
            py = Math.floor(noise(x * dens + 5, y * dens, z * dens + stageTimer * 0.001 + soundTimer * 1.1) * countY);
            pz = Math.floor(noise(x * dens + 10, y * dens, z * dens + stageTimer * 0.001 + soundTimer * 1.1) * countZ);
          } else {
            px = x; py = y; pz = z;
          }

          if (partsSet == 1 || partsVis[px][py][pz]) {

            if (STAGE == 4) mrotY = sin(stageTimer * 0.003) * (1 + sin(PI + y * 0.2 + stageTimer * 0.028)) * 2 * PI;
            if (showEnding) mrotY = sin(y * 0.01) * ((stageTimer - 180) * 0.35);

            push();

            translate(positions[x][y][z][0], positions[x][y][z][1], positions[x][y][z][2]);

            rotateY(-rotYEased);
            rotateX(-rotXEased);

            // increasing distance between elements in Z axis - more lines
            if (!showGroundBox && !showTotalBox && !showVertices) {
              let increaseDepth = createVector(-tx, -ty, -tz);
              increaseDepth = vectRotY(increaseDepth, -rotYEased);
              increaseDepth = vectRotX(increaseDepth, -rotXEased);
              translate(0, 0, increaseDepth.y * 2);
            }

            showElement(true, px, py, pz, x, y, z, mrotY);

            // move fill object closer to camera to get an outline effect
            translate(0, 0, depth * strokeWght * 0.35 / pxDensity);
            showElement(false, px, py, pz, x, y, z, mrotY);

            pop();
          }
        }
      }
    }
  }

  pop();
}

/* --------------------------- RENDER HELPERS -------------------------- */
function hasPart(px, py, pz) {
  return parts[px] && parts[px][py] && parts[px][py][pz];
}

function showElement(isStroked, px, py, pz, x, y, z, mrotY) {
  push();
  rotateX(rotXEased);
  rotateY(rotYEased);
  rotateY(mrotY);
  rotateX(protXEased);
  rotateY(protYEased);
  rotateX(pprotXEased[x][y][z]);
  rotateY(pprotYEased[x][y][z]);

  if (isStroked && (showPartBox || (glitchGrids && chance(sound * 0.08)))) {
    box(partW, partH, partZ);
  }

  fill(0);
  scale(partSX, partSY, partSZ);
  if (isStroked) {
    stroke(255);
    strokeWeight(strokeWght);
  } else {
    noStroke();
  }

  // Fallback to base head if grid parts aren't loaded
  if (partsSet == 1) {
	scale(1 / countX, 1 / countY, 1 / countZ);
	scale(0.11, 0.13, 0.11);
	model(baseShape);
  } else {
	model(parts[px][py][pz]);
  }

  pop();
}

/* ------------------------------- MIDI -------------------------------- */
var midiRecorder = [];

function noteOn(pitch) {
  let FRAME = Math.floor(audioCtx.currentTime * 60);
  if (!midiRecorder[FRAME]) midiRecorder[FRAME] = [];
  midiRecorder[FRAME].push(pitch);

  if (pitch >= 12) { // changing stage
    STAGE = pitch - 12;
    changeStageSettings();
  } else { // react to note
    reactToMidi(pitch);
  }
}

function reactToMidi(id) {
  if (id == 0) { // KICK
    if (chance(0.88)) resetParts();
    else if (changeTransforms) for (let i = 0; i < 7; i++) translateParticle();

    if (chance(changeViewChance)) setRandomView();
    if (changeSpaces) randomSpacing();
    if (changeScales) randomScaling();
    if (changeRandomRotY) { randomRotY(); randomRotY(); }
    if (changeRandomProtY) { randomPRotY(); randomPRotY(); }
    if (changePartsSet) randomPartsSet();
    if (randomizeGrid && STAGE < 8) showRandomGrid();

  } else if (id == 1 || id == 2) { // OTHER
    if (id == 1 && STAGE == 1) randomRotY();
    if (changeFlips) flipParticle();
    if (changeTransforms) for (let i = 0; i < 2; i++) translateParticle();
    if (changeTransforms && STAGE >= 8 && STAGE < 11) for (let i = 0; i < 4; i++) translateParticle();
    if (randomizeGrid && STAGE >= 8) showRandomGrid();
  }
}

/* ------------------------- SUPPORT FUNCTIONS ------------------------- */
function chance(p) { return random(1) < p; }

function fmap(p, min, max) { return constrain(map(p, min, max, 0, 1), 0, 1); }

function eased(b, n, e) {
  let ease = e * ff * dynamic * (0.7 + 0.4 * sound);
  if (ease > 1) ease = 1;
  return b + (n - b) * ease;
}

function vectRotX(vector, angle) {
  let temp = createVector(vector.y, vector.z);
  temp.rotate(angle);
  return createVector(vector.x, temp.x, temp.y);
}

function vectRotY(vector, angle) {
  let temp = createVector(vector.x, vector.z);
  temp.rotate(angle);
  return createVector(temp.x, vector.y, temp.y);
}

function createArray(firstDimension, ...dimensions) {
  let arr = [];
  for (let d = 0; d < firstDimension; d++) {
    arr[d] = dimensions.length ? createArray(...dimensions) : 0;
  }
  return arr;
}

function resetArray(arr) {
  if (Array.isArray(arr[0])) arr.forEach(resetArray);
  else arr.fill(0);
}

/* --------------------------- TRANSFORMATIONS ------------------------- */
var translateX = createArray(countY, countZ);
var translateY = createArray(countX, countZ);
var translateZ = createArray(countX, countY);

var flipsX = createArray(countX, countY, countZ);
var flipsY = createArray(countX, countY, countZ);
var flipsZ = createArray(countX, countY, countZ);

var positions = createArray(countX, countY, countZ, 3);

var pprotXEased = createArray(countX, countY, countZ);
var pprotYEased = createArray(countX, countY, countZ);
var pprotZEased = createArray(countX, countY, countZ);

function resetSpace() { spaceX = 0; spaceY = 0; spaceZ = 0; }
function resetScale() { scaleX = 1; scaleY = 1; scaleZ = 1; }

function resetRot() {
  rotX = 0; rotY = 0; protX = 0; protY = 0;
  rotXEased %= TWO_PI; rotYEased %= TWO_PI; protXEased %= TWO_PI; protYEased %= TWO_PI;
  if (rotXEased > PI) rotXEased -= TWO_PI;
  if (rotYEased > PI) rotYEased -= TWO_PI;
  if (protXEased > PI) protXEased -= TWO_PI;
  if (protYEased > PI) protYEased -= TWO_PI;
}

function resetParts() { resetTranslates(); resetFlips(); }
function resetScaleAndSpace() { resetSpace(); resetScale(); }

function setFrontView() { resetParts(); resetRot(); }

function setIsoView() {
  changeViewChance = 0;
  changeRandomRotY = false;
  changeRandomProtY = false;
  changeScales = false;
  changeSpaces = false;
  resetParts();
  resetScaleAndSpace();
  resetRot();
  scaleX = countX; scaleY = countY; scaleZ = countZ;
  spaceX = -partSizeX * scaleX;
  spaceY = -partSizeY * scaleY;
  spaceZ = -partSizeZ * scaleZ;
  rotYspd = 0; protYspd = 0;
  rotX = -PI / 12;
}

function setRandomView() {
  setFrontView();
  rotY = -PI + TWO_PI / 12 * Math.floor(random(13));
  rotX = -PI / 24 * Math.floor(random(6));
  if (chance(0.2)) {
    rotYEased %= TWO_PI;
    rotY = rotYEased > PI ? TWO_PI : 0;
  }
  if (chance(0.2)) rotX = 0;
}

function randomPartsSet() {
  if (chance(0.66)) partsSet = 0;
  else if (chance(0.16)) partsSet = 1;
  else if (chance(0.5)) partsSet = 2;
  else partsSet = 3;
}
function nextPartsSet() { partsSet = (partsSet + 1) % 4; }

function randomRotY() { rotY += PI * 0.22; }

function randomPRotY() {
  protY += random(PI / 3);
  if (protY % TWO_PI > TWO_PI * 0.6) protY += TWO_PI - (protY % TWO_PI);
}

function randomSpacing() {
  spaceX = chance(0.3) ? 0 : random(-2, 1) * 0.25;
  spaceY = chance(0.3) ? 0 : random(-2, 1) * 0.06;
  spaceZ = chance(0.3) ? 0 : random(-2, 1) * 0.25;
}

function randomScaling() {
  scaleX = chance(0.15) ? 1 : random(0.5, maxRescale);
  scaleY = chance(0.15) ? 1 : random(0.5, maxRescale * 0.75);
  scaleZ = chance(0.15) ? 1 : random(0.5, maxRescale);
  if (rotX != 0) {
    if (chance(0.35)) scaleX = 0.13;
    else if (chance(0.35)) scaleY = 0.13;
    else if (chance(0.35)) scaleZ = 0.13;
  }
}

function resetTranslates() { resetArray(translateX); resetArray(translateY); resetArray(translateZ); }
function resetFlips() { resetArray(flipsX); resetArray(flipsY); resetArray(flipsZ); }

function translateParticle() {
  let c = Math.floor(random(3));
  let dir = chance(0.5) ? -1 : 1;
  if (c == 0) {
    let x = Math.floor(random(countY));
    let y = Math.floor(random(countZ));
    if ((translateX[x][y] + dir) < -maxX || (translateX[x][y] + dir) > maxX) dir *= -1;
    translateX[x][y] += dir;
    translateX[x][y] = constrain(translateX[x][y], -2, 2);
  } else if (c == 1) {
    let x = Math.floor(random(countX));
    let y = Math.floor(random(countZ));
    if ((translateY[x][y] + dir) < -maxY || (translateY[x][y] + dir) > maxY) dir *= -1;
    translateY[x][y] += dir;
    translateY[x][y] = constrain(translateY[x][y], -2, 2);
  } else if (c == 2) {
    let x = Math.floor(random(countX));
    let y = Math.floor(random(countY));
    if ((translateZ[x][y] + dir) < -maxZ || (translateZ[x][y] + dir) > maxZ) dir *= -1;
    translateZ[x][y] += dir;
    translateZ[x][y] = constrain(translateZ[x][y], -2, 2);
  }
}

function flipParticle() {
  let x = Math.floor(random(countX));
  let y = Math.floor(random(countY));
  let z = Math.floor(random(countZ));
  let c = Math.floor(random(3));
  if (c == 0) flipsX[x][y][z] = !flipsX[x][y][z];
  else if (c == 1) flipsY[x][y][z] = !flipsY[x][y][z];
  else if (c == 2) flipsZ[x][y][z] = !flipsZ[x][y][z];
}

function showRandomGrid() {
  showTotalBox = chance(0.4);
  showGroundBox = chance(0.4);
  showPartBox = chance(0.2);
  showVertices = chance(0.4);
}

function boom() {
  for (let i = 0; i < 20; i++) {
    translateParticle();
    flipParticle();
  }
}

/* -------------------------------- STORY ------------------------------ */
function changeStageSettings() {
  stageTimer = 0;
  setDefaults();

  // Start
  if (STAGE == 0) {
    worldTranslateY = -15;
    worldTranslateYEased = worldTranslateY;
    resetRot();
  }
  if (STAGE >= 0) {
    showAnimation = true;
    showEnding = false;
    changeTransforms = true;
    partsSet = 0;
  }

  // Part #1
  if (STAGE >= 1) {
    rotYspd = 0.003;
    changeFlips = true;
  }
  if (STAGE >= 2) {
    protYspd = 0.004;
    rotYspd = 0.009;
    changeFlips = false;
    changeRandomProtY = true;
  }
  if (STAGE >= 3) {
    changeRandomRotY = true;
  }

  // Slowdown
  if (STAGE == 4) setFrontView();
  if (STAGE >= 4) {
    worldTranslateY = -35;
    protY = 0;
    rotYspd = 0.004;
    changeTransforms = false;
    dynamic = 0.18;
    rotX = -PI / 12;
  }

  // Part #2
  if (STAGE >= 5) {
    changeTransforms = true;
    changeRandomProtY = false;
    protYspd = 0;
    worldTranslateY = -15;
    changeFlips = true;
    changeViewChance = 0.8;
    randomizeGrid = true;
    dynamic = 0.9;
  }

  // Heads 3x3
  if (STAGE == 6) {
    showPartBox = true;
    showTotalBox = false;
    showGroundBox = false;
    showVertices = false;
  }
  if (STAGE >= 6) {
    worldTranslateY = 0;
    dynamic = 0.95;
    depth = 11;
    resetTranslates();
    resetFlips();
    changeTransforms = false;
    changeFlips = false;
    maxRescale = 3.0;
    randomizeGrid = false;
    partsSet = 1;
    changeScales = true;
    changeSpaces = true;
  }

  // Slowdown
  if (STAGE == 7) {
    showPartBox = true;
    showTotalBox = false;
    showGroundBox = false;
    showVertices = false;
  }
  if (STAGE >= 7) {
    dynamic = 0.07;
    depth = 5;
    setIsoView();
  }

  // Part #3
  if (STAGE == 8) resetArray(positions);
  if (STAGE >= 8) {
    resetParts();
    resetScaleAndSpace();
    spaceXEased = 0; spaceYEased = 0; spaceZEased = 0;
    scaleXEased = 1; scaleYEased = 1; scaleZEased = 1;
    partsSet = 0;

    dynamic = 0.9;
    depth = 7;
    maxRescale = 1.4;

    showTotalBox = true;
    changeTransforms = true;
    changeFlips = false;
    showPartBox = false;
    showGroundBox = false;
    showVertices = false;

    glitchGrids = true;
    changePartsSet = true;
    changeViewChance = 0.9;
    changeRandomProtY = false;
    changeScales = true;
    changeSpaces = true;
    randomizeGrid = true;
    partsSet = 0;
  }
  if (STAGE >= 9) {
    changePartsSet = false;
    partsSet = 0;
  }

  // End
  if (STAGE == 10) setFrontView();
  if (STAGE >= 10) {
    changeTransforms = false;
    depth = 5;
    dynamic = 0.2;
  }

  // Extras
  if (STAGE >= 11) showAnimation = false;

  if (STAGE >= 12) {
    showTotalBox = false;
    rotX = 0;
    protY = 0;
    showAnimation = true;
    showEnding = true;
    changeTransforms = false;
    changeFlips = false;
    dynamic = 0.15;
    rotY = -1;
    rotYEased = rotY;
    showGroundBox = false;
    rotYspd = 0.002;
  }
}
