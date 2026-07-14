const fs = require('fs');

let dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// 1. Update the state initialization
dashboard = dashboard.replace(
  'const [showMembersArea, setShowMembersArea] = useState(false);',
  `const [showMembersArea, setShowMembersArea] = useState(() => typeof window !== 'undefined' && window.location.hash === '#membros');

  React.useEffect(() => {
    const handleHashChange = () => {
      setShowMembersArea(window.location.hash === '#membros');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const openMembersArea = () => {
    window.location.hash = 'membros';
  };

  const closeMembersArea = () => {
    if (window.location.hash === '#membros') {
      window.history.back(); // Use back so we don't build up history
    } else {
      setShowMembersArea(false);
    }
  };`
);

// 2. Replace all `setShowMembersArea(false)` inside Dashboard to `closeMembersArea()`
// Be careful with exact matches.
dashboard = dashboard.replace(
  'onClose={() => setShowMembersArea(false)}',
  'onClose={closeMembersArea}'
);
dashboard = dashboard.replace(
  'setShowMembersArea(false);',
  'closeMembersArea();'
);
dashboard = dashboard.replace(
  'setShowMembersArea(false);',
  'closeMembersArea();'
);
dashboard = dashboard.replace(
  'setShowMembersArea(false);',
  'closeMembersArea();'
);
dashboard = dashboard.replace(
  'setShowMembersArea(!showMembersArea)}',
  'showMembersArea ? closeMembersArea() : openMembersArea()}'
);
dashboard = dashboard.replace(
  'setShowMembersArea(!showMembersArea);',
  'showMembersArea ? closeMembersArea() : openMembersArea();'
);

// 3. Replace setShowMembersArea(true)
dashboard = dashboard.replace(
  'setShowMembersArea(true);',
  'if (user.isAdmin || user.isLeader) { openMembersArea(); }'
);

fs.writeFileSync('src/components/Dashboard.tsx', dashboard);
