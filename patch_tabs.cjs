const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  "              {[\\n                { id: 'todos', label: 'Todos os Dias' },",
  "              {!isAdmin && [\\n                { id: 'todos', label: 'Todos os Dias' },"
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
