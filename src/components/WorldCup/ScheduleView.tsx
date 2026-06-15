'use client';

import { useState } from 'react';
import { Tournament, Match } from '@/lib/engine';
import { Flag, matchView, groupColor } from '@/lib/util';
import { useTournamentStore, selectNowTs } from '@/store/tournamentStore';

const ROUND_ABBR: Record<string, string> = {
  'Round of 32': 'R32',
  'Round of 16': 'R16',
  'Quarter-final': 'QF',
  'Semi-final': 'SF',
  'Third place': '3RD',
  Final: 'FIN',
};

function Score({ v }: { v: ReturnType<typeof matchView> }) {
  if (!v.hCode || !v.aCode) {
    return <div className="mscore vs">vs</div>;
  }
  if (!v.played) return <div className="mscore vs">vs</div>;
  const hw = v.winnerCode ? v.winnerCode === v.hCode : v.hs > v.as;
  const aw = v.winnerCode ? v.winnerCode === v.aCode : v.as > v.hs;
  return (
    <div className={'mscore' + (v.live ? ' live' : '')}>
      <b className={hw ? 'w' : ''}>{v.hs}</b>
      <span className="dash">–</span>
      <b className={aw ? 'w' : ''}>{v.as}</b>
    </div>
  );
}

export function MatchRow({ tour, m, now, showDate }: { tour: Tournament; m: Match; now: number; showDate?: boolean }) {
  const v = matchView(tour, m, now);
  const tag =
    m.stage === 'group' ? (
      <span className="gbadge" style={{ background: groupColor(m.group!) }}>
        {m.group}
      </span>
    ) : (
      <span className="rtag">{ROUND_ABBR[m.round] || 'KO'}</span>
    );
  const d = new Date(m.t);
  const time = (() => {
    let h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
  })();
  const dateShort = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const status = v.live ? (
    <span className="stat live">● LIVE</span>
  ) : v.played ? (
    <span className="stat ft">FULL TIME</span>
  ) : (
    <span className="stat up">UPCOMING</span>
  );

  const decided =
    v.played && v.decided ? (
      <span className="decided">
        {v.decided === 'pens' ? tour.teams[v.penWinner!]?.n + ' win on penalties' : 'after extra time'}
      </span>
    ) : null;

  const hWin = v.played && v.winnerCode === v.hCode;
  const aWin = v.played && v.winnerCode === v.aCode;

  return (
    <div className={'mrow ' + (v.live ? 'is-live' : v.played ? 'is-ft' : 'is-up')}>
      <div className="mtime">
        <span className="t">{time}</span>
        {showDate ? <span className="d">{dateShort}</span> : null}
      </div>
      <div className="mtag">{tag}</div>
      <div className={'mteam home' + (hWin ? ' win' : '')}>
        <span className="nm">{v.hLabel}</span>
        {v.hCode ? <Flag code={v.hCode} tour={tour} /> : <span className="flag ph">?</span>}
      </div>
      <Score v={v} />
      <div className={'mteam away' + (aWin ? ' win' : '')}>
        {v.aCode ? <Flag code={v.aCode} tour={tour} /> : <span className="flag ph">?</span>}
        <span className="nm">{v.aLabel}</span>
      </div>
      <div className="mvenue">
        <div className="vrow">
          <span>{m.cc + ' ' + m.city}</span>
          {status}
        </div>
        <div className="vstad">
          {m.venue}
          {decided}
        </div>
      </div>
    </div>
  );
}

export function ScheduleView() {
  const tour = useTournamentStore((s) => s.tour);
  const now = useTournamentStore(selectNowTs);
  const [stage, setStage] = useState('all');

  const nowDt = new Date(now);
  const localDateKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const todayMatches = tour.matches.filter(
    (m) => localDateKey(new Date(m.t)) === localDateKey(nowDt),
  );
  const [grp, setGrp] = useState('all');

  const stageTabs = [
    ['all', 'All'],
    ['group', 'Groups'],
    ['R32', 'Round of 32'],
    ['R16', 'Round of 16'],
    ['QF', 'Quarter'],
    ['SF', 'Semis'],
    ['FIN', 'Final'],
  ];

  let list = tour.matches.slice();
  if (stage === 'group') list = list.filter((m) => m.stage === 'group');
  else if (stage !== 'all')
    list = list.filter(
      (m) =>
        (m.stage === 'ko' && ROUND_ABBR[m.round] === stage) ||
        (stage === 'FIN' && (m.round === 'Final' || m.round === 'Third place')),
    );
  if (stage === 'group' && grp !== 'all') list = list.filter((m) => m.group === grp);

  const byDay: { key: string; t: number; items: Match[] }[] = [];
  const idx: Record<string, number> = {};
  list.forEach((m) => {
    const key = new Date(m.t).toISOString().slice(0, 10);
    if (idx[key] == null) {
      idx[key] = byDay.length;
      byDay.push({ key, t: m.t, items: [] });
    }
    byDay[idx[key]].items.push(m);
  });

  const played = list.filter((m) => matchView(tour, m, now).played).length;

  return (
    <div>
      <div className="sec-head">
        <div>
          <h2>Match Schedule</h2>
          <div className="sub">
            104 matches across 16 cities · <b style={{ color: 'var(--gold)' }}>{played} played</b> so far
          </div>
        </div>
      </div>
      <div className="filters">
        {stageTabs.map(([k, lbl]) => (
          <button key={k} className={'fbtn' + (stage === k ? ' on' : '')} onClick={() => setStage(k)}>
            {lbl}
          </button>
        ))}
      </div>
      {stage === 'group' ? (
        <div className="filters groups">
          {[['all', 'All groups']].concat(tour.GROUP_LETTERS.map((g) => [g, 'Group ' + g])).map(([g, lbl]) => (
            <button
              key={g}
              className={'gchip' + (grp === g ? ' on' : '')}
              style={
                grp === g && g !== 'all'
                  ? { background: groupColor(g), color: '#1a0b30', borderColor: groupColor(g) }
                  : undefined
              }
              onClick={() => setGrp(g)}
            >
              {lbl}
            </button>
          ))}
        </div>
      ) : null}
      {todayMatches.length > 0 && (
        <div className="today-block">
          <div className="dayhead">
            <div className="dleft">
              <span className="dw">Today</span>
              <span className="dnum">
                {new Date(now).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </span>
            </div>
            <span className="dphase today-badge">Today&apos;s Matches</span>
          </div>
          <div className="mlist">
            {todayMatches.map((m) => (
              <MatchRow key={m.id} tour={tour} m={m} now={now} />
            ))}
          </div>
        </div>
      )}
      {byDay.length === 0 ? (
        <div className="empty">No matches in this view.</div>
      ) : (
        byDay.map((day) => {
          const dd = new Date(day.t);
          const dn = dd.toLocaleDateString('en-US', { weekday: 'long' });
          const dl = dd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          const ph = (() => {
            const dayN = (day.t - tour.DAY0) / tour.DAYMS;
            if (dayN < 7) return 'Matchday 1';
            if (dayN < 13) return 'Matchday 2';
            if (dayN < 17) return 'Matchday 3';
            if (dayN < 23) return 'Round of 32';
            if (dayN < 28) return 'Round of 16';
            if (dayN < 33) return 'Quarter-finals';
            if (dayN < 37) return 'Semi-finals';
            if (dayN < 38) return 'Third-place play-off';
            return 'The Final';
          })();
          return (
            <section key={day.key} className="dayblock">
              <div className="dayhead">
                <div className="dleft">
                  <span className="dw">{dn}</span>
                  <span className="dnum">{dl}</span>
                </div>
                <span className="dphase">{ph}</span>
              </div>
              <div className="mlist">
                {day.items.map((m) => (
                  <MatchRow key={m.id} tour={tour} m={m} now={now} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
