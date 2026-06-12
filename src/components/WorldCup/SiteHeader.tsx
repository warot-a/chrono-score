'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: [string, string][] = [
  ['/schedule', 'Schedule'],
  ['/standings', 'Standings'],
  ['/bracket', 'Bracket'],
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site">
      <div className="wrap hrow">
        <div className="logo">
          <div className="mark">
            <b>26</b>
          </div>
          <div className="wordmark">
            <span className="a">WORLD CUP</span>
            <span className="b">2026 · USA · CAN · MEX</span>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map(([href, lbl]) => (
            <Link key={href} href={href} className={pathname === href ? 'on' : ''}>
              {lbl}
            </Link>
          ))}
          <a href="/about" target="_blank" rel="noopener noreferrer">
            About
          </a>
        </nav>
      </div>
    </header>
  );
}
