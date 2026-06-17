'use client';

import { Tournament } from '@/lib/engine';
import { PulseCard } from './PulseCard';

const STATS: [string, string][] = [
  ['48', 'Teams'],
  ['104', 'Matches'],
  ['16', 'Host Cities'],
  ['3', 'Nations'],
];

export function HeroSection({
  tour,
  nowTs,
  phase,
  playedCount,
}: {
  tour: Tournament;
  nowTs: number;
  phase: [string, string];
  playedCount: number;
}) {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">June 11 - July 19, 2026</span>
          <h1 className="display">
            The biggest <br />
            stage in <span className="o">football</span>
          </h1>
          <p className="sub">
            48 nations. 16 cities. One trophy. Follow every fixture, live group standings, and the road to the final
            across the United States, Canada and Mexico.
          </p>
          <div className="hero-meta">
            {STATS.map(([n, l]) => (
              <div className="stat" key={l}>
                <div className="n display">{n}</div>
                <div className="t">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <PulseCard tour={tour} nowTs={nowTs} phase={phase} playedCount={playedCount} />
      </div>
    </section>
  );
}
