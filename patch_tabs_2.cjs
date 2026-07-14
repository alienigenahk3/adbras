const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const regex = /\{!isAdmin && \[\s*\{\s*id: 'todos', label: 'Todos os Dias'\s*\},\s*\{\s*id: 'Domingos', label: 'Domingos'\s*\},\s*\{\s*id: 'Quartas-feiras', label: 'Quartas'\s*\},\s*\{\s*id: 'Sábados', label: 'Sábados'\s*\},\s*\]\.map\(\(tab\) => \([\s\S]*?<\/button>\s*\)\)\}/;
code = code.replace(regex, "");

fs.writeFileSync('src/components/Dashboard.tsx', code);
