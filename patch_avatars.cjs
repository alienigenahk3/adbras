const fs = require('fs');
let code = fs.readFileSync('src/components/MembersArea.tsx', 'utf8');

const renderAvatar = (memberObjName, sizeClass) => `{${memberObjName}.photoUrl ? (
                              <img src={${memberObjName}.photoUrl} alt={${memberObjName}.name} className="${sizeClass} rounded-full object-cover" />
                            ) : (
                              ${memberObjName}.name.substring(0, 2)
                            )}`;

// Replace 1: Sidebar list
code = code.replace(
  `{member.name.substring(0, 2)}`,
  renderAvatar('member', 'w-full h-full')
);

// Replace 2: Mobile card
code = code.replace(
  `{m.name.substring(0, 2)}`,
  renderAvatar('m', 'w-full h-full')
);

// Replace 3: Desktop table
code = code.replace(
  `{m.name.substring(0, 2)}`,
  renderAvatar('m', 'w-full h-full')
);

// Replace 4: Viewing Modal
code = code.replace(
  `{viewingMember.name.substring(0, 2)}`,
  renderAvatar('viewingMember', 'w-full h-full')
);

fs.writeFileSync('src/components/MembersArea.tsx', code);
