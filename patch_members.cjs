const fs = require('fs');
let code = fs.readFileSync('src/components/MembersArea.tsx', 'utf8');

code = code.replace(
  "const [memberBirthDate, setMemberBirthDate] = useState('');",
  "const [memberBirthDate, setMemberBirthDate] = useState('');\n  const [memberPhotoUrl, setMemberPhotoUrl] = useState('');"
);

code = code.replace(
  "setMemberBirthDate('');",
  "setMemberBirthDate('');\n    setMemberPhotoUrl('');"
);

code = code.replace(
  "setMemberBirthDate(member.birthDate || '');",
  "setMemberBirthDate(member.birthDate || '');\n    setMemberPhotoUrl(member.photoUrl || '');"
);

code = code.replace(
  "birthDate: memberBirthDate.trim(),",
  "birthDate: memberBirthDate.trim(),\n        photoUrl: memberPhotoUrl,"
);

const newFormContent = `
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {memberPhotoUrl ? (
                    <img src={memberPhotoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-[10px] font-bold text-center px-2">Alterar<br/>Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            alert('A foto deve ter no máximo 1MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => setMemberPhotoUrl(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(validateName(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                    placeholder="Ex: João da Silva"
                  />
                </div>
              </div>
`;

const oldFormContent = `<div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(validateName(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  placeholder="Ex: João da Silva"
                />
              </div>`;

code = code.replace(oldFormContent, newFormContent);

fs.writeFileSync('src/components/MembersArea.tsx', code);
