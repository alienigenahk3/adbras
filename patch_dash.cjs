const fs = require('fs');
let dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

dashboard = dashboard.replace(
  '<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-blue-200">\n                {churchSettings.name}\n              </span>',
  '<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-blue-200">\n                {churchSettings.heroChurchName || churchSettings.name}\n              </span>'
);

fs.writeFileSync('src/components/Dashboard.tsx', dashboard);
