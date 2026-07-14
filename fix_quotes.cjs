const fs = require('fs');

let em = fs.readFileSync('src/components/EventFormModal.tsx', 'utf8');
em = em.replace("setBannerUrl(')", "setBannerUrl('')");
fs.writeFileSync('src/components/EventFormModal.tsx', em, 'utf8');

let wm = fs.readFileSync('src/components/WeeklyProgramModal.tsx', 'utf8');
wm = wm.replace("setBannerUrl(')", "setBannerUrl('')");
fs.writeFileSync('src/components/WeeklyProgramModal.tsx', wm, 'utf8');

console.log('Fixed quotes in modals');
