const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('setShowMembersArea')) {
    console.log(`${i+1}: ${l}`);
  }
});
