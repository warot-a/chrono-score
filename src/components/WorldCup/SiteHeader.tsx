'use client';

const TABS: [string, string][] = [
  ['schedule', 'Schedule'],
  ['standings', 'Standings'],
  ['bracket', 'Bracket'],
];

export function SiteHeader({ tab, setTab }: {
  tab: string;
  setTab: (tab: string) => void;
}) {
  return (
    <header className="site">
      <div className="wrap hrow">
        <div className="logo">
          <div className="mark"><b>26</b></div>
          <div className="wordmark">
            <span className="a">WORLD CUP</span>
            <span className="b">2026 · USA · CAN · MEX</span>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(([k, lbl]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{lbl}</button>
          ))}
        </nav>
      </div>
    </header>
  );
}
