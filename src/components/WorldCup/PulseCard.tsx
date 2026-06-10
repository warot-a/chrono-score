'use client';

import { Tournament } from '@/lib/engine';
import { matchView, Flag } from '@/lib/util';

export function PulseCard({ tour, nowTs, phase, playedCount }: {
  tour: Tournament;
  nowTs: number;
  phase: [string, string];
  playedCount: number;
}) {
  const fin = matchView(tour, tour.ko[104], nowTs);
  const champ = fin.played ? fin.winnerCode : null;
  const upcoming = tour.matches.find(m => {
    const v = matchView(tour, m, nowTs);
    return !v.played && v.hCode && v.aCode;
  });
  const pct = Math.round((playedCount / 104) * 100);

  return (
    <div className="hero-card">
      <div className="pc-top">
        <span className="pc-eye">Tournament pulse</span>
        <span className="pc-phase">{phase[1]}</span>
      </div>
      <div className="pc-bar">
        <div className="pc-fill" style={{ width: pct + "%" }} />
      </div>
      <div className="pc-prog">{playedCount} of 104 matches played</div>
      {champ ? (
        <div className="pc-champ">
          <div className="pc-troph">🏆</div>
          <div>
            <div className="pc-lbl">World Champions</div>
            <div className="pc-team"><Flag code={champ} tour={tour} /> {tour.teams[champ].n}</div>
          </div>
        </div>
      ) : upcoming ? (
        <div className="pc-next">
          <div className="pc-lbl">Coming up</div>
          <div className="pc-match">
            <Flag code={upcoming.home} tour={tour} />
            <span className="pc-vs">vs</span>
            <Flag code={upcoming.away} tour={tour} />
          </div>
          <div className="pc-mt">
            {(tour.teams[upcoming.home]?.n || "") + " · " + upcoming.city}
          </div>
        </div>
      ) : null}
    </div>
  );
}
