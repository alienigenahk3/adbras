const fs = require('fs');

let modal = fs.readFileSync('src/components/ChurchSettingsModal.tsx', 'utf8');

// Add state for heroChurchName
modal = modal.replace(
  'const [heroWelcomeText, setHeroWelcomeText] = useState(settings.heroWelcomeText || \'\');',
  'const [heroWelcomeText, setHeroWelcomeText] = useState(settings.heroWelcomeText || \'\');\n  const [heroChurchName, setHeroChurchName] = useState(settings.heroChurchName || \'\');'
);

// Add to handleSubmit
modal = modal.replace(
  'heroWelcomeText, heroDescription',
  'heroWelcomeText, heroChurchName, heroDescription'
);

// Add input in form
const input = `                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Igreja (Capa)</label>
                    <input
                      type="text"
                      value={heroChurchName}
                      onChange={(e) => setHeroChurchName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ex: Comunidade Cristã ICTUS"
                    />
                  </div>`;

modal = modal.replace(
  '                  <div>\n                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>',
  input + '\n                  <div>\n                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>'
);

fs.writeFileSync('src/components/ChurchSettingsModal.tsx', modal);
