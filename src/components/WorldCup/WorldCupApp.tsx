'use client';

import React from 'react';
import { Tournament } from '@/lib/engine';
import { phaseForDay, matchView, Flag } from '@/lib/util';
import { useTournament } from '@/hooks/useTournament';
import { ScheduleView } from './ScheduleView';
import { StandingsView } from './StandingsView';
import { BracketView } from './BracketView';
import { SiteFooter } from './SiteFooter';

function fmtNow(t: number): string {
  return new Date(t).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function PulseCard({ tour, nowTs, phase, playedCount }: {
  tour: Tournament; nowTs: number;
  phase: [string, string]; playedCount: number;
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
  const TABS: [string, string][] = [["schedule", "Schedule"], ["standings", "Standings"], ["bracket", "Bracket"]];

  return (
    <>
      {/* ---------- Header ---------- */}
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
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{lbl}</button>
            ))}
          </nav>
        </div>
      </header>

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
      {tab === "schedule" ? (
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="eyebrow">June 11 – July 19, 2026</span>
              <h1 className="display">The biggest <br />stage in <span className="o">football</span></h1>
              <p className="sub">48 nations. 16 cities. One trophy. Follow every fixture, live group standings, and the road to the final across the United States, Canada and Mexico.</p>
              <div className="hero-meta">
                {([["48", "Teams"], ["104", "Matches"], ["16", "Host Cities"], ["3", "Nations"]] as [string, string][]).map(([n, l]) => (
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
      ) : null}

      {/* ---------- Main ---------- */}
      <main>
        <div className="wrap">
          {tab === "schedule" ? <ScheduleView tour={tour} now={nowTs} />
            : tab === "standings" ? <StandingsView tour={tour} now={nowTs} />
              : <BracketView tour={tour} now={nowTs} />}
        </div>
      </main>

      {/* ---------- Footer ---------- */}
      <SiteFooter />
    </>
  );
}
