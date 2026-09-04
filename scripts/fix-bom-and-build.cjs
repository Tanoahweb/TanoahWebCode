// Strip BOM from package.json and immediately run vite build
const fs = require('fs');
const { execSync } = require('child_process');

const target = 'D:/Tanoah/package.json';

// Read raw bytes
const raw = fs.readFileSync(target);
console.log('Before: byte[0]=' + raw[0] + ' byte[1]=' + raw[1] + ' byte[2]=' + raw[2]);

// Strip BOM if present
let start = 0;
if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
  start = 3;
  console.log('BOM found, stripping...');
}

// Write clean bytes directly
const clean = raw.subarray(start);
fs.writeFileSync(target, clean);

// Verify
const after = fs.readFileSync(target);
console.log('After: byte[0]=' + after[0] + ' (should be 123 for "{")');

// Immediately run vite build
console.log('\n--- Running vite build ---\n');
try {
  const out = execSync('npx vite build', {
    cwd: 'D:/Tanoah',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30000
  });
  console.log(out);
  console.log('\n✅ BUILD SUCCEEDED');
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
  console.log('\n❌ BUILD FAILED');
}
