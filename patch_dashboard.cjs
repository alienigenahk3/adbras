const fs = require('fs');

let dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Replace background ambient atmospheric backdrop
const backdropSearch = `<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full blur-[120px] opacity-25 translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500 to-amber-600 rounded-full blur-[100px] opacity-15 -translate-x-1/4 translate-y-1/4"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]"></div>`;

const backdropReplace = `<div className="absolute inset-0 z-0">
          {churchSettings.heroBackgroundImageUrl ? (
            <>
              <img 
                src={churchSettings.heroBackgroundImageUrl} 
                alt="Background" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px]"></div>
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full blur-[120px] opacity-25 translate-x-1/3 -translate-y-1/3"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500 to-amber-600 rounded-full blur-[100px] opacity-15 -translate-x-1/4 translate-y-1/4"></div>
            </>
          )}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>`;

dashboard = dashboard.replace(backdropSearch, backdropReplace);

// Replace texts
dashboard = dashboard.replace(
  '<span>Portas Abertas, Corações Acolhedores</span>',
  '<span>{churchSettings.heroSubtitle || "Portas Abertas, Corações Acolhedores"}</span>'
);

dashboard = dashboard.replace(
  'Seja Bem-vindo à <br/>',
  '{churchSettings.heroWelcomeText || "Seja Bem-vindo à"} <br/>'
);

dashboard = dashboard.replace(
  'Um espaço de comunhão, crescimento na fé e adoração profunda. Acompanhe toda a nossa programação e participe dos nossos encontros. Juntos somos mais fortes!',
  '{churchSettings.heroDescription || "Um espaço de comunhão, crescimento na fé e adoração profunda. Acompanhe toda a nossa programação e participe dos nossos encontros. Juntos somos mais fortes!"}'
);

fs.writeFileSync('src/components/Dashboard.tsx', dashboard);
