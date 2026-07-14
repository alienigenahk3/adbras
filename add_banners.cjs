const fs = require('fs');

// 1. EventFormModal.tsx
let em = fs.readFileSync('src/components/EventFormModal.tsx', 'utf8');
if (!em.includes('bannerUrl')) {
  // add bannerUrl state & ref
  em = em.replace(
    '  const [membersOnly, setMembersOnly] = useState(false);',
    '  const [membersOnly, setMembersOnly] = useState(false);\n  const [bannerUrl, setBannerUrl] = useState(\'\);\n  const [imageToCrop, setImageToCrop] = useState<string | null>(null);\n  const fileInputRef = React.useRef<HTMLInputElement>(null);'
  );
  
  // add handlers
  em = em.replace(
    '  const handleSubmit = (e: React.FormEvent) => {',
    '  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (file) {\n      const reader = new FileReader();\n      reader.onloadend = () => {\n        if (typeof reader.result === \'string\') {\n          setImageToCrop(reader.result);\n        }\n      };\n      reader.readAsDataURL(file);\n    }\n  };\n\n  const handleCropSave = (croppedImage: string) => {\n    setBannerUrl(croppedImage);\n    setImageToCrop(null);\n  };\n\n  const handleSubmit = (e: React.FormEvent) => {'
  );

  // in useEffect
  em = em.replace(
    'setMembersOnly(eventToEdit.membersOnly || false);',
    'setMembersOnly(eventToEdit.membersOnly || false);\n        setBannerUrl(eventToEdit.bannerUrl || \'\);'
  );
  em = em.replace(
    'setMembersOnly(false);',
    'setMembersOnly(false);\n        setBannerUrl(\'\);'
  );

  // in onSave
  em = em.replace(
    'groupId: eventToEdit?.groupId,',
    'groupId: eventToEdit?.groupId,\n      bannerUrl: bannerUrl || undefined,'
  );

  // add banner upload UI before description
  const targetDesc = '<div>\n                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>';
  const bannerUi = `<div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Banner do Evento (Opcional - Compacto)</label>
                    <div 
                      className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center justify-center bg-slate-50/50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {bannerUrl ? (
                        <div className="relative w-full h-32 rounded-md overflow-hidden group">
                          <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                            Trocar Banner
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-2 text-slate-500">
                          <Upload className="w-6 h-6 mb-1 text-slate-400" />
                          <span className="text-xs font-semibold">Clique para enviar imagem do banner</span>
                          <span className="text-[10px] text-slate-400">Armazenado diretamente no evento sem consumir servidor</span>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    {bannerUrl && (
                      <button 
                        type="button" 
                        onClick={() => setBannerUrl(\'\)} 
                        className="mt-1 text-xs text-red-500 hover:underline cursor-pointer"
                      >
                        Remover banner
                      </button>
                    )}
                  </div>\n\n                  <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>`;
  em = em.replace(targetDesc, bannerUi);

  // add cropper modal at the bottom inside AnimatePresence
  em = em.replace(
    '    </AnimatePresence>\n  );\n}',
    '      {imageToCrop && (\n        <ImageCropperModal\n          isOpen={!!imageToCrop}\n          onClose={() => setImageToCrop(null)}\n          image={imageToCrop}\n          onSave={handleCropSave}\n          aspect={16 / 9}\n        />\n      )}\n    </AnimatePresence>\n  );\n}'
  );

  fs.writeFileSync('src/components/EventFormModal.tsx', em, 'utf8');
  console.log('Updated EventFormModal.tsx with banner support');
}

// 2. WeeklyProgramModal.tsx
let wm = fs.readFileSync('src/components/WeeklyProgramModal.tsx', 'utf8');
if (!wm.includes('bannerUrl')) {
  wm = wm.replace(
    '  const [membersOnly, setMembersOnly] = useState(false);',
    '  const [membersOnly, setMembersOnly] = useState(false);\n  const [bannerUrl, setBannerUrl] = useState(\'\);\n  const [imageToCrop, setImageToCrop] = useState<string | null>(null);\n  const fileInputRef = React.useRef<HTMLInputElement>(null);'
  );

  wm = wm.replace(
    '  const handleSubmit = (e: React.FormEvent) => {',
    '  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const file = e.target.files?.[0];\n    if (file) {\n      const reader = new FileReader();\n      reader.onloadend = () => {\n        if (typeof reader.result === \'string\') {\n          setImageToCrop(reader.result);\n        }\n      };\n      reader.readAsDataURL(file);\n    }\n  };\n\n  const handleCropSave = (croppedImage: string) => {\n    setBannerUrl(croppedImage);\n    setImageToCrop(null);\n  };\n\n  const handleSubmit = (e: React.FormEvent) => {'
  );

  wm = wm.replace(
    'setMembersOnly(itemToEdit.membersOnly || false);',
    'setMembersOnly(itemToEdit.membersOnly || false);\n      setBannerUrl(itemToEdit.bannerUrl || \'\);'
  );
  wm = wm.replace(
    'setMembersOnly(false);',
    'setMembersOnly(false);\n      setBannerUrl(\'\);'
  );

  wm = wm.replace(
    'icon,',
    'icon,\n      bannerUrl: bannerUrl || undefined,'
  );

  const targetDescW = '<div>\n            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">\n              Descrição\n            </label>';
  const bannerUiW = `<div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Banner da Atividade (Opcional)
            </label>
            <div 
              className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center justify-center bg-slate-50/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {bannerUrl ? (
                <div className="relative w-full h-28 rounded-md overflow-hidden group">
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                    Trocar Banner
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-1 text-slate-500">
                  <Upload className="w-5 h-5 mb-1 text-slate-400" />
                  <span className="text-xs font-semibold">Enviar imagem do banner</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            {bannerUrl && (
              <button 
                type="button" 
                onClick={() => setBannerUrl(\'\)} 
                className="mt-1 text-xs text-red-500 hover:underline cursor-pointer"
              >
                Remover banner
              </button>
            )}
          </div>\n\n          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descrição
            </label>`;
  wm = wm.replace(targetDescW, bannerUiW);

  // add imports and cropper
  wm = wm.replace(
    'import { ImageGalleryModal } from \'./ImageGalleryModal\';',
    'import { ImageCropperModal } from \'./ImageCropperModal\';'
  );

  wm = wm.replace(
    '        </form>\n      </div>\n    </div>\n  );',
    '        </form>\n      </div>\n      {imageToCrop && (\n        <ImageCropperModal\n          isOpen={!!imageToCrop}\n          onClose={() => setImageToCrop(null)}\n          image={imageToCrop}\n          onSave={handleCropSave}\n          aspect={16 / 9}\n        />\n      )}\n    </div>\n  );'
  );

  fs.writeFileSync('src/components/WeeklyProgramModal.tsx', wm, 'utf8');
  console.log('Updated WeeklyProgramModal.tsx with banner support');
}

// 3. Render banners in WeeklyView.tsx, DayEventsModal.tsx, TodayHighlight.tsx, Dashboard.tsx
// WeeklyView.tsx
let wv = fs.readFileSync('src/components/WeeklyView.tsx', 'utf8');
if (!wv.includes('event.bannerUrl')) {
  wv = wv.replace(
    '<div className="space-y-2 flex-1 min-w-0">',
    '<div className="space-y-2 flex-1 min-w-0">\n                          {event.bannerUrl && (\n                            <div className="w-full h-36 rounded-lg overflow-hidden mb-2 border border-slate-100 shadow-sm">\n                              <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />\n                            </div>\n                          )}'
  );
  fs.writeFileSync('src/components/WeeklyView.tsx', wv, 'utf8');
  console.log('Updated WeeklyView.tsx banner render');
}

// DayEventsModal.tsx
let dev = fs.readFileSync('src/components/DayEventsModal.tsx', 'utf8');
if (!dev.includes('event.bannerUrl')) {
  dev = dev.replace(
    '<div>\n                        <div className="flex items-center gap-2 flex-wrap">',
    '<div>\n                        {event.bannerUrl && (\n                          <div className="w-full h-36 rounded-lg overflow-hidden mb-3 border border-slate-100 shadow-sm">\n                            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />\n                          </div>\n                        )}\n                        <div className="flex items-center gap-2 flex-wrap">'
  );
  fs.writeFileSync('src/components/DayEventsModal.tsx', dev, 'utf8');
  console.log('Updated DayEventsModal.tsx banner render');
}

// TodayHighlight.tsx
let th = fs.readFileSync('src/components/TodayHighlight.tsx', 'utf8');
if (!th.includes('event.bannerUrl')) {
  th = th.replace(
    '<div>\n            <div className="flex items-center gap-2 mb-1">',
    '<div>\n            {event.bannerUrl && (\n              <div className="w-full h-40 rounded-lg overflow-hidden mb-3 border border-slate-100 shadow-sm">\n                <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />\n              </div>\n            )}\n            <div className="flex items-center gap-2 mb-1">'
  );
  fs.writeFileSync('src/components/TodayHighlight.tsx', th, 'utf8');
  console.log('Updated TodayHighlight.tsx banner render');
}

// Dashboard.tsx (weekly programs and events)
let db = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
if (!db.includes('program.bannerUrl')) {
  db = db.replace(
    '<h3 className="text-lg font-bold text-slate-800">{program.title}</h3>',
    '{program.bannerUrl && (\n                        <div className="w-full h-32 rounded-lg overflow-hidden mb-3 border border-slate-100 shadow-sm">\n                          <img src={program.bannerUrl} alt={program.title} className="w-full h-full object-cover" />\n                        </div>\n                      )}\n                      <h3 className="text-lg font-bold text-slate-800">{program.title}</h3>'
  );
}
if (!db.includes('{event.bannerUrl')) {
  db = db.replace(
    '<h4 className="font-bold text-slate-900">{event.title}</h4>',
    '{event.bannerUrl && (\n                        <div className="w-full h-32 rounded-lg overflow-hidden mb-2 border border-slate-100 shadow-sm">\n                          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />\n                        </div>\n                      )}\n                      <h4 className="font-bold text-slate-900">{event.title}</h4>'
  );
}
fs.writeFileSync('src/components/Dashboard.tsx', db, 'utf8');
console.log('Updated Dashboard.tsx banner renders');
