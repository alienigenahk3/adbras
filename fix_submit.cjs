const fs = require('fs');
let modal = fs.readFileSync('src/components/ChurchSettingsModal.tsx', 'utf8');

modal = modal.replace(
  'onSave({ name, address, logoUrl, logoFit, whatsapp });',
  'onSave({ name, address, logoUrl, logoFit, whatsapp, heroSubtitle, heroWelcomeText, heroDescription, heroBackgroundImageUrl });'
);

fs.writeFileSync('src/components/ChurchSettingsModal.tsx', modal);
