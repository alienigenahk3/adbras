const fs = require('fs');
let dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

dashboard = dashboard.replace(
  '    } else {\n      closeMembersArea();\n    }',
  '    } else {\n      setShowMembersArea(false);\n    }'
);

// Also replace any other infinite recursion just in case
dashboard = dashboard.replace(/closeMembersArea\(\);\s*\/\/\s*Wait, this became closeMembersArea\(\);/g, 'setShowMembersArea(false);');

fs.writeFileSync('src/components/Dashboard.tsx', dashboard);
