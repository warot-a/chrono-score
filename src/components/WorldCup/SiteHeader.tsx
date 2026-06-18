'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const TABS: [string, string][] = [
  ['/schedule', 'Schedule'],
  ['/standings', 'Standings'],
  ['/bracket', 'Bracket'],
];

export function SiteHeader() {
  const pathname = usePathname();
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
  });

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('wc_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('wc_theme', 'light');
    }
  }

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
        <button
          className="playbtn theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
