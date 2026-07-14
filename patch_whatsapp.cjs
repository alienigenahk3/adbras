const fs = require('fs');

// Patch Dashboard.tsx
let dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Remove WhatsApp button in "Visitar-nos" section
const whatsappButtonRegex = /<a\s+href=\{getWhatsAppLink\(`Olá! Vi a agenda no site da \$\{churchSettings\.name\} e gostaria de saber mais informações sobre os cultos\.`\)\}[\s\S]*?Contato via WhatsApp\s*<\/a>/;
if (whatsappButtonRegex.test(dashboard)) {
  dashboard = dashboard.replace(whatsappButtonRegex, "");
} else {
  console.log("Could not find WhatsApp button in Dashboard.tsx");
}

fs.writeFileSync('src/components/Dashboard.tsx', dashboard);

// Patch ChurchSettingsModal.tsx
let modal = fs.readFileSync('src/components/ChurchSettingsModal.tsx', 'utf8');

const whatsappInputRegex = /<div>\s*<label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp da Igreja<\/label>[\s\S]*?<\/div>/;
if (whatsappInputRegex.test(modal)) {
  modal = modal.replace(whatsappInputRegex, "");
} else {
  console.log("Could not find WhatsApp input in ChurchSettingsModal.tsx");
}

fs.writeFileSync('src/components/ChurchSettingsModal.tsx', modal);
