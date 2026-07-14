const fs = require('fs');

// Fix EventFormModal.tsx
let em = fs.readFileSync('src/components/EventFormModal.tsx', 'utf8');
em = em.replace("useState(');", "useState('');");
em = em.replace("eventToEdit.bannerUrl || ');", "eventToEdit.bannerUrl || '');");
em = em.replace("setBannerUrl(');", "setBannerUrl('');");
fs.writeFileSync('src/components/EventFormModal.tsx', em, 'utf8');
console.log('Fixed EventFormModal.tsx syntax');

// Fix WeeklyProgramModal.tsx
let wm = fs.readFileSync('src/components/WeeklyProgramModal.tsx', 'utf8');
wm = wm.replace(/  const \[icon,\n\s+bannerUrl: bannerUrl \|\| undefined, setIcon\] = useState<WeeklyProgramItem\['icon'\]>\('church'\);/g, "  const [icon, setIcon] = useState<WeeklyProgramItem['icon']>('church');");
wm = wm.replace("useState(');", "useState('');");
wm = wm.replace("itemToEdit.bannerUrl || ');", "itemToEdit.bannerUrl || '');");
wm = wm.replace("setBannerUrl(');", "setBannerUrl('');");
fs.writeFileSync('src/components/WeeklyProgramModal.tsx', wm, 'utf8');
console.log('Fixed WeeklyProgramModal.tsx syntax');
