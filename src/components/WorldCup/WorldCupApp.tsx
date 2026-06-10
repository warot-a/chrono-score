'use client';

import React from 'react';
import { phaseForDay, matchView } from '@/lib/util';
import { useTournament } from '@/hooks/useTournament';
import { ScheduleView } from './ScheduleView';
import { StandingsView } from './StandingsView';
import { BracketView } from './BracketView';
import { SiteFooter } from './SiteFooter';
import { HeroSection } from './HeroSection';
import { SiteHeader } from './SiteHeader';

function fmtNow(t: number): string {
  return new Date(t).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}


export function WorldCupApp() {
  const { tour, isLive } = useTournament();

  const [tab, setTab] = React.useState(() => {
    if (typeof window === 'undefined') { return 'schedule'; }
    return localStorage.getItem('wc_tab') || 'schedule';
  });
  const [nowDay, setNowDay] = React.useState(() => {
    if (typeof window === 'undefined') { return 0; }
    const saved = parseFloat(localStorage.getItem('wc_now') || '');
    return !isNaN(saved) ? saved : Math.min(39, Math.max(0, (Date.now() - tour.DAY0) / tour.DAYMS));
  });
  const [playing, setPlaying] = React.useState(false);

  // When live data loads, snap the clock to real time (setState in effect is intentional here)
  React.useEffect(() => {
    if (isLive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNowDay(Math.min(39, Math.max(0, (Date.now() - tour.DAY0) / tour.DAYMS)));
    }
  }, [isLive, tour.DAY0, tour.DAYMS]);

  // Advance real-time clock every 30 s when in live mode (no slider interaction)
  React.useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      setNowDay(Math.min(39, (Date.now() - tour.DAY0) / tour.DAYMS));
    }, 30_000);
    return () => clearInterval(id);
  }, [isLive, tour.DAY0, tour.DAYMS]);

  const nowTs = tour.DAY0 + nowDay * tour.DAYMS;

  React.useEffect(() => { localStorage.setItem("wc_tab", tab); }, [tab]);
  React.useEffect(() => { localStorage.setItem("wc_now", String(nowDay)); }, [nowDay]);

  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setNowDay(d => {
        const nd = d + 0.3;
        if (nd >= 39) { setPlaying(false); return 39; }
        return nd;
      });
    }, 80);
    return () => clearInterval(id);
  }, [playing]);

  const phase = phaseForDay(nowDay);
  const liveCount = tour.matches.filter(m => { const v = matchView(tour, m, nowTs); return v.live; }).length;
  const playedCount = tour.matches.filter(m => matchView(tour, m, nowTs).played).length;

  const JUMPS: [string, number][] = [
    ["Opening", 0.4], ["Groups", 8], ["R32", 17.4], ["R16", 23.4],
    ["Quarters", 28.4], ["Semis", 33.4], ["Final", 38.4], ["Done", 39]
  ];
  const sliderPct = Math.round((nowDay / 39) * 100);
  return (
    <>
      {/* ---------- Header ---------- */}
      <SiteHeader tab={tab} setTab={setTab} />

      {/* ---------- Clock bar ---------- */}
      <div className="clock">
        <div className="wrap clockrow">
          <div className="now">
            <span
              className="dot"
              style={liveCount ? undefined : { background: "var(--gold)", animation: "none" }}
            />
            <div>
              <div className="lbl">
                {liveCount ? liveCount + " match" + (liveCount > 1 ? "es" : "") + " live" : phase[0]}
                {isLive && <span style={{ marginLeft: 6, fontSize: "0.7em", color: "var(--gold)", letterSpacing: 1 }}>LIVE DATA</span>}
              </div>
              <div className="date">{fmtNow(nowTs)}</div>
            </div>
          </div>
          <button className="playbtn" onClick={() => setPlaying(p => !p)} title="Play / pause the tournament clock">
            {playing ? "❚❚" : "▶"}
          </button>
          <div className="slider">
            <input
              type="range" min={0} max={39} step={0.25} value={nowDay}
              style={{ "--p": sliderPct + "%" } as React.CSSProperties}
              onChange={e => { setPlaying(false); setNowDay(parseFloat(e.target.value)); }}
            />
          </div>
          <div className="jumps">
            {JUMPS.map(([lbl, d]) => (
              <button
                key={lbl}
                className={Math.abs(nowDay - d) < 0.3 ? "on" : ""}
                onClick={() => { setPlaying(false); setNowDay(d); }}
              >{lbl}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Hero (schedule tab only) ---------- */}
      {tab === "schedule" && <HeroSection tour={tour} nowTs={nowTs} phase={phase} playedCount={playedCount} />}

      {/* ---------- Main ---------- */}
      <main>
        <div className="wrap">
          {tab === "schedule" && <ScheduleView tour={tour} now={nowTs} />}
          {tab === "standings" && <StandingsView tour={tour} now={nowTs} />}
          {tab === "bracket" && <BracketView tour={tour} now={nowTs} />}
        </div>
      </main>

      {/* ---------- Footer ---------- */}
      <SiteFooter />
    </>
  );
}
