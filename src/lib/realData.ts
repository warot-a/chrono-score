/**
 * Transforms Supabase DB rows into the Tournament object shape that the
 * existing UI components and util functions expect.
 *
 * The match scoring / bracket logic in util.tsx is reused unchanged —
 * only the data source changes from the seeded simulation to real DB rows.
 */

import { Tournament, Match, Team, Venue, StandingRow } from '@/lib/engine';
import { DBMatch, DBTeam, DBVenue, DBTournamentTeam } from '@/lib/supabase';

const DAY0  = Date.UTC(2026, 5, 11, 0, 0, 0);  // 2026-06-11 00:00 UTC
const DAYMS = 86_400_000;

function dstr(t: number): string {
  return new Date(t).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function tstr(t: number): string {
  const d = new Date(t);
  let h = d.getUTCHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' ' + ap;
}

function ts(day: number, hourLocal = 0): number {
  return DAY0 + day * DAYMS + hourLocal * 3_600_000;
}

// ── Country flag from country string ────────────────────────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  'Mexico': '🇲🇽', 'Canada': '🇨🇦', 'United States': '🇺🇸',
};
function countryFlag(country: string): string {
  return COUNTRY_FLAG[country] ?? '🏟️';
}

// ── Standings sort (same as engine.ts cmpTeam) ──────────────────────────────
function cmpRow(teams: Record<string, Team>, a: StandingRow, b: StandingRow): number {
  if (b.Pts !== a.Pts) return b.Pts - a.Pts;
  if (b.GD  !== a.GD)  return b.GD  - a.GD;
  if (b.GF  !== a.GF)  return b.GF  - a.GF;
  const sa = teams[a.code]?.s ?? 70, sb = teams[b.code]?.s ?? 70;
  if (sb !== sa) return sb - sa;
  return a.code < b.code ? -1 : 1;
}

// ── Slot assignment (identical to engine.ts matchSlots) ─────────────────────
const SLOT_ALLOWED: Record<string, string[]> = {
  sE: ['A','B','C','D','F'], sI: ['C','D','F','G','H'],
  sA: ['C','E','F','H','I'], sL: ['E','H','I','J','K'],
  sD: ['B','E','F','I','J'], sG: ['A','E','H','I','J'],
  sB: ['E','F','G','I','J'], sK: ['D','E','I','J','L'],
};

function matchSlots(qualGroups: string[]): Record<string, string> {
  const slots = Object.keys(SLOT_ALLOWED);
  const res: Record<string, string> = {};
  const used: Record<string, boolean> = {};
  function avail(s: string) {
    return SLOT_ALLOWED[s].filter(g => qualGroups.includes(g) && !used[g]);
  }
  function solve(): boolean {
    const rem = slots.filter(s => !res[s]);
    if (rem.length === 0) return Object.keys(used).length === qualGroups.length;
    rem.sort((x, y) => avail(x).length - avail(y).length);
    const s = rem[0];
    for (const g of avail(s)) {
      res[s] = g; used[g] = true;
      if (solve()) return true;
      delete res[s]; delete used[g];
    }
    return false;
  }
  solve();
  return res;
}

// ── Main builder ─────────────────────────────────────────────────────────────

export function buildFromDB(
  dbTeams: DBTeam[],
  tournamentTeams: DBTournamentTeam[],
  dbMatches: DBMatch[],
  dbVenues: DBVenue[],
): Tournament {

  // 1. Teams record
  const teams: Record<string, Team> = {};
  dbTeams.forEach(t => {
    teams[t.code] = { code: t.code, n: t.name, f: t.flag, s: t.strength };
  });

  // 2. id → code maps
  const teamById: Record<number, string> = {};
  dbTeams.forEach(t => { teamById[t.id] = t.code; });

  const venueById: Record<number, DBVenue> = {};
  dbVenues.forEach(v => { venueById[v.id] = v; });

  // 3. GROUPS
  const GROUPS: Record<string, string[]> = {};
  tournamentTeams.forEach(tt => {
    if (!tt.group_letter) return;
    const g = tt.group_letter;
    if (!GROUPS[g]) GROUPS[g] = [];
    GROUPS[g].push(tt.teams.code);
  });
  const GROUP_LETTERS = Object.keys(GROUPS).sort();

  // 4. Build Match[]
  const matches: Match[] = dbMatches.map(dm => {
    const homeCode = dm.home_team_id ? teamById[dm.home_team_id] ?? '' : '';
    const awayCode = dm.away_team_id ? teamById[dm.away_team_id] ?? '' : '';
    const venue    = dm.venue_id ? venueById[dm.venue_id] : null;
    const t        = new Date(dm.scheduled_at).getTime();

    const base = {
      id:    dm.stage === 'ko' ? `K${dm.ko_number ?? dm.id}` : `M${dm.id}`,
      stage: dm.stage as 'group' | 'ko',
      group: dm.group_letter ?? undefined,
      round: dm.round_name,
      home:  homeCode,
      away:  awayCode,
      hs:    dm.home_score ?? 0,
      as:    dm.away_score ?? 0,
      t,
      venue: venue?.name  ?? '',
      city:  venue?.city  ?? '',
      cc:    venue ? countryFlag(venue.country) : '🏟️',
    };

    if (dm.stage === 'ko') {
      const decided = dm.decided ?? '';
      const hs = dm.home_score ?? 0;
      const as_ = dm.away_score ?? 0;
      const hPen = dm.home_penalties ?? 0;
      const aPen = dm.away_penalties ?? 0;

      let winnerCode: string | undefined;
      let loserCode:  string | undefined;
      let penWinner:  string | undefined;

      if (dm.status === 'FINISHED') {
        if (decided === 'pens') {
          winnerCode = hPen > aPen ? homeCode : awayCode;
          loserCode  = hPen > aPen ? awayCode : homeCode;
          penWinner  = winnerCode;
        } else if (hs !== as_) {
          winnerCode = hs > as_ ? homeCode : awayCode;
          loserCode  = hs > as_ ? awayCode : homeCode;
        }
      }

      return {
        ...base,
        no:   dm.ko_number ?? undefined,
        refs: [dm.home_slot ?? '', dm.away_slot ?? ''],
        decided,
        winnerCode,
        loserCode,
        penWinner,
      };
    }

    return base;
  });

  matches.sort((a, b) => a.t - b.t);

  // 5. Compute group standings from finished group matches
  const standingsMap: Record<string, Record<string, StandingRow>> = {};
  GROUP_LETTERS.forEach(g => {
    standingsMap[g] = {};
    (GROUPS[g] ?? []).forEach(k => {
      standingsMap[g][k] = { code: k, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
    });
  });

  matches.filter(m => m.stage === 'group' && m.group && dbMatches.find(
    dm => `M${dm.id}` === m.id && dm.status === 'FINISHED'
  )).forEach(m => {
    const rows = standingsMap[m.group!];
    if (!rows) return;
    const h = rows[m.home], a = rows[m.away];
    if (!h || !a) return;
    h.P++; a.P++;
    h.GF += m.hs; h.GA += m.as;
    a.GF += m.as; a.GA += m.hs;
    h.GD = h.GF - h.GA; a.GD = a.GF - a.GA;
    if (m.hs > m.as)      { h.W++; h.Pts += 3; a.L++; }
    else if (m.hs < m.as) { a.W++; a.Pts += 3; h.L++; }
    else                  { h.D++; a.D++; h.Pts++; a.Pts++; }
  });

  const standings: Record<string, StandingRow[]> = {};
  GROUP_LETTERS.forEach(g => {
    standings[g] = Object.values(standingsMap[g]).sort((a, b) => cmpRow(teams, a, b));
  });

  // 6. winner / runner / thirds
  const winner:       Record<string, string>    = {};
  const runner:       Record<string, string>    = {};
  const thirdByGroup: Record<string, StandingRow> = {};

  GROUP_LETTERS.forEach(g => {
    const rows = standings[g];
    if (rows[0]) winner[g]       = rows[0].code;
    if (rows[1]) runner[g]       = rows[1].code;
    if (rows[2]) thirdByGroup[g] = rows[2];
  });

  const thirdRanked: StandingRow[] = GROUP_LETTERS
    .filter(g => thirdByGroup[g])
    .map(g => ({ ...thirdByGroup[g], g }))
    .sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts;
      if (b.GD  !== a.GD)  return b.GD  - a.GD;
      if (b.GF  !== a.GF)  return b.GF  - a.GF;
      const sa = teams[a.code]?.s ?? 70, sb = teams[b.code]?.s ?? 70;
      if (sb !== sa) return sb - sa;
      return (a.g || '') < (b.g || '') ? -1 : 1;
    });

  thirdRanked.forEach((x, i) => { x.rank = i + 1; });
  const qualThirds  = thirdRanked.slice(0, 8);
  const qualGroups  = qualThirds.map(x => x.g!).sort();
  const slotAssign  = matchSlots(qualGroups);

  const thirdGroupToCode: Record<string, string> = {};
  qualThirds.forEach(x => { thirdGroupToCode[x.g!] = x.code; });

  // 7. ko record (indexed by ko_number 73–104)
  const ko: Record<number, Match> = {};
  matches.forEach(m => {
    if (m.stage === 'ko' && m.no != null) ko[m.no] = m;
  });

  // 8. Champion
  const finalMatch  = ko[104];
  const thirdMatch  = ko[103];
  const champion    = finalMatch?.winnerCode ?? null;
  const runnerUp    = finalMatch?.loserCode  ?? null;
  const third       = thirdMatch?.winnerCode ?? null;

  const VENUES_ARR: Venue[] = dbVenues.map(v => ({
    city: v.city, stad: v.name, cc: countryFlag(v.country),
  }));

  return {
    seed: 0,
    teams,
    GROUPS,
    GROUP_LETTERS,
    VENUES: VENUES_ARR,
    matches,
    standings,
    winner,
    runner,
    thirdByGroup,
    thirdRanked,
    qualThirds,
    qualGroups,
    slotAssign,
    thirdGroupToCode,
    ko,
    champion,
    runnerUp,
    third,
    DAY0,
    DAYMS,
    ts,
    dstr,
    tstr,
    lastDay: 38,
  };
}
