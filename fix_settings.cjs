const fs = require('fs');

let modal = fs.readFileSync('src/components/ChurchSettingsModal.tsx', 'utf8');

// Fix the corrupted useState
modal = modal.replace(
  `const [whatsapp,
      heroSubtitle,
      heroWelcomeText,
      heroDescription,
      heroBackgroundImageUrl, setWhatsapp] = useState(settings.whatsapp || '');`,
  `const [whatsapp, setWhatsapp] = useState(settings.whatsapp || '');`
);

fs.writeFileSync('src/components/ChurchSettingsModal.tsx', modal);
