'use client';

import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { useTournamentStore } from '@/store/tournamentStore';
import { useTournamentSync } from '@/hooks/useTournamentSync';
import { Flag } from '@/lib/util';
import { getSquad, Player, Squad } from '@/lib/players';
import { buildMatchEvents, MatchEvent, Referee } from '@/lib/matchEvents';
import { supabase } from '@/lib/supabase';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

// Shapes stored in DB by sync route
interface DBLineupPlayer { no: number; name: string; pos: string; starting: boolean; }
interface DBLineupsPayload {
  home: { formation: string | null; coach: string | null; players: DBLineupPlayer[] };
  away: { formation: string | null; coach: string | null; players: DBLineupPlayer[] };
}
interface DBStoredEvent {
  type: 'goal' | 'yellow' | 'red' | 'sub';
  team: 'home' | 'away';
  min: string;
  sort: number;
  player: string;
  assist?: string;
  on?: string;
  off?: string;
}

const POS_FULL: Record<string, string> = {
  GK:'GK', RB:'RB', LB:'LB', CB:'CB', DM:'DM', CM:'CM',
  AM:'AM', LW:'LW', RW:'RW', ST:'ST', CF:'CF', MF:'MF', FW:'FW',
};

const EV_ICON: Record<string, string> = {
  goal: '⚽', yellow: '🟨', red: '🟥', sub: '🔄', pso: '🏆',
};

const ROUND_LABEL: Record<string, string> = {
  'Round of 32': 'R32',
  'Round of 16': 'R16',
  'Quarter-final': 'QF',
  'Semi-final': 'SF',
  'Third place': '3RD',
  Final: 'FIN',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function dateLabel(t: number): string {
  return new Date(t).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function timeLabel(t: number): string {
  const d = new Date(t);
  let h = d.getUTCHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' ' + ap + ' UTC';
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerRow({ p, events, team }: { p: Player; events: MatchEvent[]; team: 'home' | 'away' }) {
  const goals   = events.filter((e) => e.type === 'goal'   && e.team === team && e.no === p.no);
  const yellows = events.filter((e) => e.type === 'yellow' && e.team === team && e.no === p.no);
  const reds    = events.filter((e) => e.type === 'red'    && e.team === team && e.no === p.no);
  const subOn   = events.find((e) => e.type === 'sub' && e.team === team && e.onNo  === p.no);
  const subOff  = events.find((e) => e.type === 'sub' && e.team === team && e.offNo === p.no);

  const cls = 'md-prow' + (subOn ? ' is-sub-on' : subOff ? ' is-sub-off' : '');

  return (
    <div className={cls}>
      <span className="md-pno">{p.no}</span>
      <span className="md-pos-tag">{POS_FULL[p.pos] || p.pos}</span>
      <span className="md-pname">{p.name}</span>
      {p.captain && <span className="md-pcap">C</span>}
      {(goals.length || yellows.length || reds.length || subOn || subOff) ? (
        <div className="md-pev">
          {goals.map((_, i) => <span key={'g' + i}>⚽</span>)}
          {yellows.map((_, i) => <span key={'y' + i}>🟨</span>)}
          {reds.map((_, i) => <span key={'r' + i}>🟥</span>)}
          {subOn  && <span title="Came on">🔼</span>}
          {subOff && <span title="Came off">🔽</span>}
        </div>
      ) : null}
    </div>
  );
}

// ── Lineup column ─────────────────────────────────────────────────────────────

function LineupCol({
  squad, events, team, tour,
}: {
  squad: Squad | null;
  events: MatchEvent[];
  team: 'home' | 'away';
  tour: ReturnType<typeof useTournamentStore.getState>['tour'];
}) {
  if (!squad) {
    return (
      <div className="md-lineup-col">
        <div className="md-state-msg">Line-up not available</div>
      </div>
    );
  }

  const tm = tour.teams[squad.code];
  const starters = squad.players.filter((p) => p.starting);
  const subs = squad.players.filter((p) => !p.starting);

  return (
    <div className="md-lineup-col">
      <div className="md-lc-head">
        <span className="md-lc-flag">{tm ? tm.f : '🏳️'}</span>
        <span className="md-lc-name">{tm ? tm.n : squad.code}</span>
        <span className="md-lc-coach">Coach: {squad.coach}</span>
      </div>
      <div className="md-lc-section">
        <div className="md-lc-label">Starting XI</div>
        {starters.map((p) => (
          <PlayerRow key={p.no} p={p} events={events} team={team} />
        ))}
      </div>
      <div className="md-lc-section">
        <div className="md-lc-label">Substitutes</div>
        {subs.map((p) => (
          <PlayerRow key={p.no} p={p} events={events} team={team} />
        ))}
      </div>
    </div>
  );
}

// ── Events center column ──────────────────────────────────────────────────────

function EventsCol({
  events,
  match,
  tour,
}: {
  events: MatchEvent[];
  match: ReturnType<typeof useTournamentStore.getState>['tour']['matches'][number];
  tour: ReturnType<typeof useTournamentStore.getState>['tour'];
}) {
  const played = match.hs != null;

  if (!played) {
    return (
      <div className="md-events-col">
        <div className="md-ev-head">Match Events</div>
        <div className="md-no-events">Match not yet played</div>
      </div>
    );
  }

  const htEvents = events.filter((e) => {
    const m = parseInt(e.min) || 0;
    return m <= 45 || e.min.startsWith('45+');
  });
  const ftEvents = events.filter((e) => {
    const m = parseInt(e.min) || 0;
    return !e.min.startsWith('45+') && m > 45 && (m <= 90 || e.min.startsWith('90+'));
  });
  const etEvents = events.filter((e) => {
    const m = parseInt(e.min) || 0;
    return m > 90 && !e.min.startsWith('90+') && e.min !== 'PSO';
  });
  const psoEvents = events.filter((e) => e.type === 'pso');

  function renderEvent(e: MatchEvent) {
    const isHome = e.team === 'home';

    if (e.type === 'sub') {
      const teamName = isHome
        ? (tour.teams[match.home]?.n || 'Home')
        : (tour.teams[match.away]?.n || 'Away');
      return (
        <div key={e.sort + 'sub' + e.onNo} className="md-ev-item md-ev-center">
          <span className="md-ev-min">{e.min}&apos;</span>
          <span className="md-ev-icon">🔄</span>
          <div className="md-ev-body">
            <span className="md-ev-sub-on">▲ {e.on} ({e.onNo})</span>
            <span className="md-ev-sub-off"> ▼ {e.off} ({e.offNo})</span>
            <span className="md-ev-team-label">{teamName}</span>
          </div>
        </div>
      );
    }

    const dir = isHome ? 'md-ev-home' : 'md-ev-away';
    const icon = EV_ICON[e.type] || '•';

    return (
      <div key={e.sort + e.type + e.no} className={`md-ev-item ${dir}`}>
        <span className="md-ev-min">{e.min}&apos;</span>
        <span className="md-ev-icon">{icon}</span>
        <div className="md-ev-body">
          <span>{e.player}{e.no ? ` (${e.no})` : ''}</span>
          {e.type === 'goal' && e.assist && (
            <span className="md-ev-assist">🅰 {e.assist} ({e.assistNo})</span>
          )}
        </div>
      </div>
    );
  }

  const penWinner = psoEvents[0]
    ? (psoEvents[0].team === 'home' ? tour.teams[match.home]?.n : tour.teams[match.away]?.n) || ''
    : '';

  return (
    <div className="md-events-col">
      <div className="md-ev-head">Match Events</div>
      {htEvents.length > 0 && <div className="md-ev-line">{htEvents.map(renderEvent)}</div>}
      <div className="md-ev-divider" />
      <div className="md-ev-ht">Half Time</div>
      <div className="md-ev-divider" />
      {ftEvents.length > 0 && <div className="md-ev-line">{ftEvents.map(renderEvent)}</div>}
      {etEvents.length > 0 && (
        <>
          <div className="md-ev-divider" />
          <div className="md-ev-ht">Extra Time</div>
          <div className="md-ev-divider" />
          <div className="md-ev-line">{etEvents.map(renderEvent)}</div>
        </>
      )}
      {psoEvents.length > 0 && (
        <div className="md-ev-pso">🏆 Penalty shootout — <b>{penWinner}</b> win</div>
      )}
      {events.length === 0 && <div className="md-no-events">No events recorded</div>}
    </div>
  );
}

// ── Officials ─────────────────────────────────────────────────────────────────

function Officials({ referees }: { referees: Referee[] }) {
  return (
    <div className="md-officials">
      <div className="md-off-head">Match Officials</div>
      <div className="md-off-grid">
        {referees.map((r, i) => (
          <div key={i} className="md-off-card">
            <span className="md-off-flag">{r.f}</span>
            <div className="md-off-info">
              <div className="md-off-role">{r.role}</div>
              <div className="md-off-name">{r.n}</div>
              <div className="md-off-country">{r.c}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function parseDbId(matchId: string): { type: 'id'; value: number } | { type: 'ko'; value: number } | null {
  if (matchId.startsWith('M')) {
    const n = parseInt(matchId.slice(1));
    return isNaN(n) ? null : { type: 'id', value: n };
  }
  if (matchId.startsWith('K')) {
    const n = parseInt(matchId.slice(1));
    return isNaN(n) ? null : { type: 'ko', value: n };
  }
  return null;
}

function dbLineupsToSquads(
  payload: DBLineupsPayload,
  homeCode: string,
  awayCode: string,
): { homeSquad: Squad; awaySquad: Squad } {
  const toSquad = (side: DBLineupsPayload['home'], code: string): Squad => ({
    code,
    coach: side.coach ?? 'Unknown',
    players: side.players.map((p) => ({ no: p.no, name: p.name, pos: p.pos, starting: p.starting })),
  });
  return { homeSquad: toSquad(payload.home, homeCode), awaySquad: toSquad(payload.away, awayCode) };
}

function dbEventsToMatchEvents(stored: DBStoredEvent[]): MatchEvent[] {
  return stored.map((e) => ({
    type: e.type,
    team: e.team,
    min: e.min,
    sort: e.sort,
    no: 0,
    player: e.player,
    ...(e.assist ? { assist: e.assist } : {}),
    ...(e.type === 'sub' ? { on: e.on, off: e.off, onNo: 0, offNo: 0 } : {}),
  }));
}

export function MatchDetailView({ matchId }: { matchId: string }) {
  useTournamentSync();

  const tour = useTournamentStore((s) => s.tour);

  const [realLineups, setRealLineups] = useState<DBLineupsPayload | null>(null);
  const [realEvents, setRealEvents] = useState<DBStoredEvent[] | null>(null);

  const match = useMemo(
    () => tour.matches.find((m) => m.id === matchId) ?? null,
    [tour, matchId],
  );

  // Fetch real data from DB if available
  useEffect(() => {
    const ref = parseDbId(matchId);
    if (!ref) return;

    async function fetchDetails() {
      let query = supabase.from('matches').select('lineups, match_events');
      if (ref!.type === 'id') {
        query = query.eq('id', ref!.value);
      } else {
        query = query.eq('ko_number', ref!.value);
      }
      const { data } = await query.maybeSingle();
      if (data?.lineups) setRealLineups(data.lineups as DBLineupsPayload);
      if (data?.match_events) setRealEvents(data.match_events as DBStoredEvent[]);
    }

    fetchDetails();
  }, [matchId]);

  const generatedHomeSquad = useMemo(
    () => (match ? getSquad(match.home, tour.seed) : null),
    [match, tour.seed],
  );
  const generatedAwaySquad = useMemo(
    () => (match ? getSquad(match.away, tour.seed) : null),
    [match, tour.seed],
  );

  const { homeSquad, awaySquad } = useMemo(() => {
    if (realLineups && match) {
      return dbLineupsToSquads(realLineups, match.home, match.away);
    }
    return { homeSquad: generatedHomeSquad, awaySquad: generatedAwaySquad };
  }, [realLineups, match, generatedHomeSquad, generatedAwaySquad]);

  const { events, referees } = useMemo(() => {
    if (realEvents) {
      return { events: dbEventsToMatchEvents(realEvents), referees: [] as Referee[] };
    }
    if (!match || !homeSquad || !awaySquad) return { events: [] as MatchEvent[], referees: [] as Referee[] };
    return buildMatchEvents(match, homeSquad, awaySquad, tour.seed);
  }, [realEvents, match, homeSquad, awaySquad, tour.seed]);

  if (!match) {
    return (
      <>
        <SiteHeader />
        <div className="md-state-msg" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-anton)', fontSize: 32, textTransform: 'uppercase', marginBottom: 12, color: 'var(--muted)' }}>
            Match not found
          </h2>
          <p style={{ color: 'var(--faint)' }}>ID: {matchId}</p>
          <Link href="/schedule" style={{ color: 'var(--violet-2)', marginTop: 16, display: 'inline-block' }}>
            ← Back to Schedule
          </Link>
        </div>
        <SiteFooter />
      </>
    );
  }

  const hm = tour.teams[match.home] || {};
  const am = tour.teams[match.away] || {};
  const played = match.hs != null;

  const decided = match.decided || '';
  let pillClass = 'md-pill ft';
  let pillText = 'Full Time';
  if (!played) { pillClass = 'md-pill up'; pillText = 'Upcoming'; }
  else if (decided === 'a.e.t.') { pillClass = 'md-pill aet'; pillText = 'After Extra Time'; }
  else if (decided === 'pens')  { pillClass = 'md-pill pens'; pillText = 'Penalty Shootout'; }

  const roundLabel =
    match.stage === 'group'
      ? 'Group ' + match.group + ' · ' + match.round
      : match.round;

  return (
    <>
      <SiteHeader />

      {/* ── topbar ── */}
      <div className="md-topbar">
        <div className="wrap md-toprow">
          <Link href="/schedule" className="md-back">
            <span>←</span> Schedule
          </Link>
          <div className="md-breadcrumb">
            <span>World Cup 2026</span>
            <span className="md-bc-sep">›</span>
            <b>{roundLabel}</b>
          </div>
          <div className="md-mark">26</div>
        </div>
      </div>

      {/* ── hero ── */}
      <div className="md-hero">
        <div className="wrap">
          <div className="md-hero-top">
            <span className="md-hero-label">{roundLabel}</span>
          </div>
          <div className="md-scoreline">
            <div className="md-team-side">
              <div className="md-team-flag">{hm.f || '🏳️'}</div>
              <div className="md-team-name">{hm.n || match.home || 'TBD'}</div>
            </div>
            <div className="md-score-box">
              {played ? (
                <>
                  <span className="md-score-num">{match.hs}</span>
                  <span className="md-score-sep">–</span>
                  <span className="md-score-num">{match.as}</span>
                </>
              ) : (
                <span className="md-score-sep">vs</span>
              )}
            </div>
            <div className="md-team-side">
              <div className="md-team-flag">{am.f || '🏳️'}</div>
              <div className="md-team-name">{am.n || match.away || 'TBD'}</div>
            </div>
          </div>
          <div className="md-score-decided">
            <span className={pillClass}>{pillText}</span>
          </div>
          <div className="md-hero-meta">
            <span>{match.cc} {match.city}</span>
            <span className="md-meta-sep">·</span>
            <span>{match.venue}</span>
            <span className="md-meta-sep">·</span>
            <span>{dateLabel(match.t)}</span>
            <span className="md-meta-sep">·</span>
            <span>{timeLabel(match.t)}</span>
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div className="wrap">
        <div className="md-body">
          <LineupCol squad={homeSquad} events={events} team="home" tour={tour} />
          <EventsCol events={events} match={match} tour={tour} />
          <LineupCol squad={awaySquad} events={events} team="away" tour={tour} />
        </div>
        <Officials referees={referees} />
        <div style={{ height: 60 }} />
      </div>

      <SiteFooter />
    </>
  );
}
