const fs = require('fs');
const path = require('path');

let totalFixed = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(tsx?|css)$/i.test(entry.name)) {
      const buf = fs.readFileSync(full);
      let content = buf.toString('utf8');
      // Strip BOM if present
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      
      const regex = /\/assets\//g;
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        const updated = content.replace(regex, '/Assets/');
        fs.writeFileSync(full, Buffer.from(updated, 'utf8'));
        totalFixed += matches.length;
        console.log('Fixed ' + matches.length + ' refs in: ' + path.relative('D:/Tanoah', full));
      }
    }
  }
}

walk('D:/Tanoah/src');
console.log('\nTotal references fixed: ' + totalFixed);
