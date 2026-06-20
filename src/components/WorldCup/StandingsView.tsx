'use client';

import React from 'react';
import { Tournament } from '@/lib/engine';
import { Flag, liveStandings, liveThirds, groupColor, allGroupsComplete, groupComplete } from '@/lib/util';
import { useTournamentStore, selectNowTs } from '@/store/tournamentStore';

const LIVE_MS = 2 * 3600 * 1000;

interface LiveMatchInfo {
  homeScore: number;
  awayScore: number;
  opponentCode: string;
  isHome: boolean;
}

function GroupCard({
  tour,
  g,
  now,
  qualThirdGroups,
}: {
  tour: Tournament;
  g: string;
  now: number;
  qualThirdGroups: string[];
}) {
  const rows = liveStandings(tour, g, now);
  const total = 6;
  const playedN = tour.matches.filter((m) => m.stage === 'group' && m.group === g && m.timestamp <= now).length;
  const done = groupComplete(tour, g, now);
  const col = groupColor(g);

  const liveMatchMap = new Map<string, LiveMatchInfo>();
  tour.matches
    .filter((m) => m.stage === 'group' && m.group === g && m.timestamp <= now && now < m.timestamp + LIVE_MS)
    .forEach((m) => {
      liveMatchMap.set(m.home, { homeScore: m.homeScore, awayScore: m.awayScore, opponentCode: m.away, isHome: true });
      liveMatchMap.set(m.away, { homeScore: m.homeScore, awayScore: m.awayScore, opponentCode: m.home, isHome: false });
    });

  function rowClass(i: number): string {
    if (i < 2) return 'adv';
    if (i === 2) return qualThirdGroups.includes(g) ? 'q3' : 'p3';
    return 'out';
  }

  return (
    <div className="gcard">
      <div className="gcard-head">
        <span className="gbadge lg" style={{ background: col }}>
          {g}
        </span>
        <span className="gname">Group {g}</span>
        <span className={'gprog' + (done ? ' done' : '')}>{done ? 'Complete' : playedN + '/' + total}</span>
      </div>
      <table className="gtable">
        <thead>
          <tr>
            <th className="c-pos">#</th>
            <th className="c-team">Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th className="hide-s">GF</th>
            <th className="hide-s">GA</th>
            <th>GD</th>
            <th className="c-pts">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const lm = liveMatchMap.get(r.code);
            return (
              <tr key={r.code} className={rowClass(i) + (lm ? ' is-live' : '')}>
                <td className="c-pos">
                  <span className="posdot">{i + 1}</span>
                </td>
                <td className="c-team">
                  <Flag code={r.code} tour={tour} />
                  <span className="tn">{tour.teams[r.code].n}</span>
                  {tour.teams[r.code].h ? <span className="hosttag">H</span> : null}
                  {lm ? (
                    <span className="row-live-info">
                      <span className="row-live-dot" />
                      <span className="row-live-score">
                        {lm.isHome ? lm.homeScore : lm.awayScore}
                        {'-'}
                        {lm.isHome ? lm.awayScore : lm.homeScore}
                      </span>
                    </span>
                  ) : null}
                </td>
                <td>{r.P}</td>
                <td>{r.W}</td>
                <td>{r.D}</td>
                <td>{r.L}</td>
                <td className="hide-s">{r.GF}</td>
                <td className="hide-s">{r.GA}</td>
                <td className="gd">{(r.GD > 0 ? '+' : '') + r.GD}</td>
                <td className="c-pts">
                  <b>{r.Pts}</b>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ThirdRace({ tour, now }: { tour: Tournament; now: number }) {
  const arr = liveThirds(tour, now);
  const settled = allGroupsComplete(tour, now);
  return (
    <div className="third-panel">
      <div className="tp-head">
        <h3>Race for the Best Third-Placed Teams</h3>
        <span className="tp-note">{settled ? 'Final — top 8 qualify' : 'Provisional — top 8 qualify'}</span>
      </div>
      <div className="tp-list">
        {arr.map((r, i) => (
          <React.Fragment key={r.g}>
            {i === 8 ? (
              <div className="cutline">
                <span>qualification cut-off</span>
              </div>
            ) : null}
            <div className={'tp-row' + (i < 8 ? ' in' : ' gone')}>
              <span className="tp-rank">{i + 1}</span>
              <span className="gbadge sm" style={{ background: groupColor(r.g!) }}>
                {r.g}
              </span>
              <Flag code={r.code} tour={tour} />
              <span className="tp-name">{tour.teams[r.code].n}</span>
              <span className="tp-stat">{r.Pts} pts</span>
              <span className="tp-stat dim">{(r.GD > 0 ? '+' : '') + r.GD}</span>
              {i < 8 ? <span className="tp-ok">✓</span> : null}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function StandingsView() {
  const tour = useTournamentStore((s) => s.tour);
  const now = useTournamentStore(selectNowTs);
  const thirds = liveThirds(tour, now);
  const qualThirdGroups = thirds.slice(0, 8).map((x) => x.g!);
  const anyPlayed = tour.matches.some((m) => m.stage === 'group' && m.timestamp <= now);

  return (
    <div>
      <div className="sec-head">
        <div>
          <h2>Group Standings</h2>
          <div className="sub">Top 2 of each group + 8 best third-placed teams advance to the Round of 32</div>
        </div>
        <div className="legend">
          <span>
            <i className="lg adv" />
            Advance
          </span>
          <span>
            <i className="lg q3" />
            3rd — qualifying
          </span>
          <span>
            <i className="lg p3" />
            3rd — contention
          </span>
          <span>
            <i className="lg out" />
            Eliminated
          </span>
        </div>
      </div>
      {!anyPlayed ? (
        <div className="empty">The group stage has not kicked off yet. Move the tournament clock forward to begin.</div>
      ) : null}
      <div className="gcard-grid">
        {tour.GROUP_LETTERS.map((g) => (
          <GroupCard key={g} tour={tour} g={g} now={now} qualThirdGroups={qualThirdGroups} />
        ))}
      </div>
      {anyPlayed ? <ThirdRace tour={tour} now={now} /> : null}
    </div>
  );
}
