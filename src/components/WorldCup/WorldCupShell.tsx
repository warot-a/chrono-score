'use client';

import { CSSProperties } from 'react';
import { phaseForDay, matchView } from '@/lib/util';
import { useTournamentStore, selectNowTs } from '@/store/tournamentStore';
import { useTournamentSync } from '@/hooks/useTournamentSync';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import type { MatchData } from '@/app/(worldcup)/layout';

function fmtNow(t: number): string {
  return new Date(t).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const JUMPS: [string, number][] = [
  ['Opening', 0.4],
  ['Groups', 8],
  ['R32', 17.4],
  ['R16', 23.4],
  ['Quarters', 28.4],
  ['Semis', 33.4],
  ['Final', 38.4],
  ['Done', 39],
];

export function WorldCupShell({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: MatchData | null;
}) {
  useTournamentSync(initialData);

  const tour = useTournamentStore((s) => s.tour);
  const isLive = useTournamentStore((s) => s.isLive);
  const nowDay = useTournamentStore((s) => s.nowDay);
  const playing = useTournamentStore((s) => s.playing);
  const setNowDay = useTournamentStore((s) => s.setNowDay);
  const setPlaying = useTournamentStore((s) => s.setPlaying);
  const nowTs = useTournamentStore(selectNowTs);

  const phase = phaseForDay(nowDay);
  const liveCount = tour.matches.filter((m) => matchView(tour, m, nowTs).live).length;
  const sliderPct = Math.round((nowDay / 39) * 100);

  return (
    <>
      <SiteHeader />

      {/* ---------- Clock bar ---------- */}
      <div className="clock">
        <div className="wrap clockrow">
          <div className="now">
            <span className="dot" style={liveCount ? undefined : { background: 'var(--gold)', animation: 'none' }} />
            <div>
              <div className="lbl">
                {liveCount ? liveCount + ' match' + (liveCount > 1 ? 'es' : '') + ' live' : phase[0]}
                {isLive && (
                  <span style={{ marginLeft: 6, fontSize: '0.7em', color: 'var(--gold)', letterSpacing: 1 }}>
                    LIVE DATA
                  </span>
                )}
              </div>
              <div className="date">{fmtNow(nowTs)}</div>
            </div>
          </div>
          <button className="playbtn" onClick={() => setPlaying((p) => !p)} title="Play / pause the tournament clock">
            {playing ? '❚❚' : '▶'}
          </button>
          <div className="slider">
            <input
              type="range"
              min={0}
              max={39}
              step={0.25}
              value={nowDay}
              style={{ '--p': sliderPct + '%' } as CSSProperties}
              onChange={(e) => {
                setPlaying(false);
                setNowDay(parseFloat(e.target.value));
              }}
            />
          </div>
          <div className="jumps">
            {JUMPS.map(([lbl, d]) => (
              <button
                key={lbl}
                className={Math.abs(nowDay - d) < 0.3 ? 'on' : ''}
                onClick={() => {
                  setPlaying(false);
                  setNowDay(d);
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {children}

      <SiteFooter />
    </>
  );
}
