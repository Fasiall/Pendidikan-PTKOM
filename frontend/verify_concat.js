const fs = require('fs');
const path = require('path');

const frontend = 'D:/Website/Pendidikan-PTKOM/frontend';

// Load manifest
const manifest = JSON.parse(fs.readFileSync(path.join(frontend, 'js', 'manifest.json'), 'utf8'));
const loadOrder = manifest.loadOrder;

// Read original script.js
const originalScript = fs.readFileSync(path.join(frontend, 'archive', 'original', 'script.js'), 'utf8');

// Concatenate loadOrder files (exact slices, no extra newlines)
let concat = '';
for (const rel of loadOrder) {
  const filePath = path.join(frontend, rel);
  const content = fs.readFileSync(filePath, 'utf8');
  concat += content;
}

// Normalize line endings (original may have CRLF)
const normOriginal = originalScript.replace(/\r\n/g, '\n');
const normConcat = concat.replace(/\r\n/g, '\n');

if (normOriginal === normConcat) {
  console.log('script.js concatenation: MATCH');
} else {
  console.log('script.js concatenation: MISMATCH');
  console.log('Original length:', normOriginal.length);
  console.log('Concat length:', normConcat.length);
  // Find first diff
  for (let i = 0; i < Math.min(normOriginal.length, normConcat.length); i++) {
    if (normOriginal[i] !== normConcat[i]) {
      console.log(`First diff at ${i}:`);
      console.log('Original:', normOriginal.slice(i, i+50));
      console.log('Concat  :', normConcat.slice(i, i+50));
      break;
    }
  }
  process.exit(1);
}

// Now verify materi
// Original materi.js (with declaration)
const originalMateri = fs.readFileSync(path.join(frontend, 'archive', 'original', 'materi.js'), 'utf8');
// Read materi-data.js (just the DUMMY_MATERIALS declaration)
const materiData = fs.readFileSync(path.join(frontend, 'js', 'materi-data.js'), 'utf8');

// We need to insert materiData back into currentMateri at the position where the declaration originally was.
// The original materi.js had the declaration at a specific location. We can find the insertion point by locating the line after the comment "/* ============================ DATA MATERI DUMMY =========================== */"
// In original, the declaration starts right after that comment line.
// Let's find in original the index of that comment end.
const marker = '/* ============================ DATA MATERI DUMMY =========================== */';
const markerIdx = originalMateri.indexOf(marker);
if (markerIdx === -1) {
  console.error('Marker not found in original materi.js');
  process.exit(1);
}
// The declaration starts after the marker and a newline.
const afterMarker = markerIdx + marker.length;
const declStart = originalMateri.indexOf('const DUMMY_MATERIALS = [', afterMarker);
if (declStart === -1) {
  console.error('Declaration not found after marker');
  process.exit(1);
}
// Find the end of declaration (we already have materiData which ends with semicolon)
const declEnd = declStart + materiData.trim().length; // assuming materiData matches exactly
// Extract prefix and suffix from original
const prefix = originalMateri.slice(0, declStart);
const suffix = originalMateri.slice(declEnd);
// Now reconstruct: prefix + materiData + suffix
const reconstructed = prefix + materiData.trim() + suffix;

// Compare with original
if (reconstructed.replace(/\r\n/g, '\n') === originalMateri.replace(/\r\n/g, '\n')) {
  console.log('materi.js reconstruction: MATCH');
} else {
  console.log('materi.js reconstruction: MISMATCH');
  console.log('Original length:', originalMateri.length);
  console.log('Recon length:', reconstructed.length);
  for (let i = 0; i < Math.min(originalMateri.length, reconstructed.length); i++) {
    if (originalMateri[i] !== reconstructed[i]) {
      console.log(`First diff at ${i}:`);
      console.log('Original:', originalMateri.slice(i, i+50));
      console.log('Recon   :', reconstructed.slice(i, i+50));
      break;
    }
  }
  process.exit(1);
}

console.log('All concatenation checks passed.');