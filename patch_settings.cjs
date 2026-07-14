const fs = require('fs');

let modal = fs.readFileSync('src/components/ChurchSettingsModal.tsx', 'utf8');

// 1. Add state for the new fields
modal = modal.replace(
  'const [address, setAddress] = useState(settings.address);',
  `const [address, setAddress] = useState(settings.address);
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle || '');
  const [heroWelcomeText, setHeroWelcomeText] = useState(settings.heroWelcomeText || '');
  const [heroDescription, setHeroDescription] = useState(settings.heroDescription || '');
  const [heroBackgroundImageUrl, setHeroBackgroundImageUrl] = useState(settings.heroBackgroundImageUrl || '');
  
  const heroFileInputRef = useRef<HTMLInputElement>(null);`
);

// 2. Add handleHeroFileChange
modal = modal.replace(
  'const handleFileChange =',
  `const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        if (result) {
          await uploadImage(result, 'hero_bg.jpg');
          setHeroBackgroundImageUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange =`
);

// 3. Add to handleSubmit
modal = modal.replace(
  'whatsapp',
  `whatsapp,
      heroSubtitle,
      heroWelcomeText,
      heroDescription,
      heroBackgroundImageUrl`
);

// 4. Add the inputs in the form
const inputs = `
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Seção Inicial (Capa)</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subtítulo</label>
                    <input
                      type="text"
                      value={heroSubtitle}
                      onChange={(e) => setHeroSubtitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ex: Portas Abertas, Corações Acolhedores"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Texto de Boas-vindas</label>
                    <input
                      type="text"
                      value={heroWelcomeText}
                      onChange={(e) => setHeroWelcomeText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ex: Seja Bem-vindo à"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <textarea
                      value={heroDescription}
                      onChange={(e) => setHeroDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      placeholder="Ex: Um espaço de comunhão..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Imagem de Fundo (Plano de Fundo)</label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-24 h-16 rounded-md border border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={() => heroFileInputRef.current?.click()}
                      >
                        {heroBackgroundImageUrl ? (
                          <img src={heroBackgroundImageUrl} alt="Bg" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-500">Sem imagem</span>
                        )}
                      </div>
                      <input 
                         type="file" 
                         ref={heroFileInputRef} 
                         onChange={handleHeroFileChange} 
                         accept="image/*" 
                         className="hidden" 
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => heroFileInputRef.current?.click()}
                          className="text-xs text-blue-600 hover:underline text-left font-medium"
                        >
                          Alterar imagem
                        </button>
                        {heroBackgroundImageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              if (heroBackgroundImageUrl) deleteImage(heroBackgroundImageUrl);
                              setHeroBackgroundImageUrl('');
                            }}
                            className="text-xs text-red-500 hover:underline text-left"
                          >
                            Remover imagem
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
`;

modal = modal.replace(
  '              <button\n                type="submit"',
  inputs + '\n              <button\n                type="submit"'
);

fs.writeFileSync('src/components/ChurchSettingsModal.tsx', modal);
