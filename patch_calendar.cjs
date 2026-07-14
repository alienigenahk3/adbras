const fs = require('fs');

// Patch WeeklyView.tsx
let weekly = fs.readFileSync('src/components/WeeklyView.tsx', 'utf8');

weekly = weekly.replace(
  '<h3 className="font-bold text-slate-900 break-words leading-tight">{event.title}</h3>',
  '<h3 className="font-bold text-slate-900 break-words break-all leading-tight flex-1 min-w-0">{event.title}</h3>'
);

weekly = weekly.replace(
  '<p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl break-words whitespace-pre-line">',
  '<p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-2xl break-words break-all whitespace-pre-line">'
);

weekly = weekly.replace(
  '<div className="flex flex-row lg:flex-col gap-4 lg:gap-2 min-w-[140px] text-xs font-semibold text-slate-600 bg-slate-50 lg:bg-transparent p-2.5 lg:p-0 rounded-xl">',
  '<div className="flex flex-col sm:flex-row lg:flex-col gap-2 sm:gap-4 lg:gap-2 min-w-[140px] max-w-full text-xs font-semibold text-slate-600 bg-slate-50 lg:bg-transparent p-2.5 lg:p-0 rounded-xl">'
);

weekly = weekly.replace(
  /<div className="flex items-center gap-2">\s*<MapPin className="w-4 h-4 text-slate-400 shrink-0" \/>/g,
  '<div className="flex items-center gap-2 min-w-0">\n                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />'
);

fs.writeFileSync('src/components/WeeklyView.tsx', weekly);

// Patch DayEventsModal.tsx
let modal = fs.readFileSync('src/components/DayEventsModal.tsx', 'utf8');

modal = modal.replace(
  '<h4 className="font-bold text-slate-900 break-words leading-tight">{event.title}</h4>',
  '<h4 className="font-bold text-slate-900 break-words break-all leading-tight flex-1 min-w-0">{event.title}</h4>'
);

modal = modal.replace(
  '<p className="text-sm text-slate-600 mb-3 break-words whitespace-pre-line">{event.description}</p>',
  '<p className="text-sm text-slate-600 mb-3 break-words break-all whitespace-pre-line">{event.description}</p>'
);

modal = modal.replace(
  /<div className="flex items-center gap-2">\s*<MapPin className="w-4 h-4 text-slate-400" \/>/g,
  '<div className="flex items-center gap-2 min-w-0">\n                          <MapPin className="w-4 h-4 text-slate-400" />'
);

modal = modal.replace(
  /<span>\{event\.location\}<\/span>/g,
  '<span className="truncate">{event.location}</span>'
);

fs.writeFileSync('src/components/DayEventsModal.tsx', modal);
