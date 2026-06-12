/* Deterministic match events generator — seeded per (matchId, seed) */

import { Match } from './engine';
import { Squad, Player } from './players';

export interface MatchEvent {
  type: 'goal' | 'yellow' | 'red' | 'sub' | 'pso';
  team: 'home' | 'away';
  min: string;
  sort: number;
  no: number;
  player: string;
  assist?: string;
  assistNo?: number;
  onNo?: number;
  offNo?: number;
  on?: string;
  off?: string;
}

export interface Referee {
  f: string;
  role: string;
  n: string;
  c: string;
}

function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickFrom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const REFEREES: Omit<Referee, 'role'>[] = [
  { f: '🇩🇪', n: 'Felix Brych', c: 'Germany' },
  { f: '🇧🇷', n: 'Wilton Sampaio', c: 'Brazil' },
  { f: '🇦🇷', n: 'Facundo Tello', c: 'Argentina' },
  { f: '🇫🇷', n: 'Clément Turpin', c: 'France' },
  { f: '🇬🇧', n: 'Michael Oliver', c: 'England' },
  { f: '🇮🇹', n: 'Daniele Orsato', c: 'Italy' },
  { f: '🇺🇾', n: 'Andrés Matonte', c: 'Uruguay' },
  { f: '🇯🇵', n: 'Ryuji Sato', c: 'Japan' },
  { f: '🇸🇪', n: 'Andreas Ekberg', c: 'Sweden' },
  { f: '🇲🇽', n: 'César Ramos', c: 'Mexico' },
  { f: '🇺🇸', n: 'Armando Villarreal', c: 'United States' },
  { f: '🇰🇷', n: 'Kim Dae-yong', c: 'South Korea' },
  { f: '🇦🇺', n: 'Chris Beath', c: 'Australia' },
  { f: '🇵🇹', n: 'Hugo Miguel', c: 'Portugal' },
  { f: '🇿🇦', n: 'Victor Gomes', c: 'South Africa' },
  { f: '🇳🇱', n: 'Danny Makkelie', c: 'Netherlands' },
  { f: '🇹🇷', n: 'Halil Umut Meler', c: 'Türkiye' },
  { f: '🇸🇦', n: 'Abdulrahman Al-Jassim', c: 'Saudi Arabia' },
];

const AR_POOL: Omit<Referee, 'role'>[] = [
  { f: '🇩🇪', n: 'Mark Borsch', c: 'Germany' },
  { f: '🇧🇷', n: 'Bruno Boschilia', c: 'Brazil' },
  { f: '🇫🇷', n: 'Nicolas Danos', c: 'France' },
  { f: '🇬🇧', n: 'Stuart Burt', c: 'England' },
  { f: '🇮🇹', n: 'Ciro Carbone', c: 'Italy' },
  { f: '🇺🇾', n: 'Richard Trinidad', c: 'Uruguay' },
  { f: '🇯🇵', n: 'Hiroshi Yamauchi', c: 'Japan' },
  { f: '🇦🇷', n: 'Diego Bonfa', c: 'Argentina' },
  { f: '🇲🇽', n: 'Juan Carlos Osorio', c: 'Mexico' },
  { f: '🇺🇸', n: 'Kyle Atkins', c: 'United States' },
  { f: '🇰🇷', n: 'Park Jeong-su', c: 'South Korea' },
  { f: '🇵🇹', n: 'Rui Licínio', c: 'Portugal' },
];

const VAR_POOL: Omit<Referee, 'role'>[] = [
  { f: '🇩🇪', n: 'Bastian Dankert', c: 'Germany' },
  { f: '🇧🇷', n: 'Rodrigo Guarizo', c: 'Brazil' },
  { f: '🇫🇷', n: 'Willy Delajod', c: 'France' },
  { f: '🇬🇧', n: 'David Coote', c: 'England' },
  { f: '🇮🇹', n: 'Massimiliano Irrati', c: 'Italy' },
  { f: '🇳🇱', n: 'Kevin Blom', c: 'Netherlands' },
  { f: '🇦🇷', n: 'Mauro Vigliano', c: 'Argentina' },
  { f: '🇺🇸', n: 'Ismail Elfath', c: 'United States' },
  { f: '🇸🇦', n: 'Mohammed Al-Hoaish', c: 'Saudi Arabia' },
  { f: '🇯🇵', n: 'Makoto Bizen', c: 'Japan' },
];

function genMin(rng: () => number, half: 1 | 2 | 3 | 4): { min: string; sort: number } {
  if (half === 1) {
    const base = 1 + Math.floor(rng() * 44);
    if (base >= 43 && rng() < 0.15) {
      const add = 1 + Math.floor(rng() * 5);
      return { min: '45+' + add, sort: 45 + add * 0.1 };
    }
    return { min: String(base), sort: base };
  }
  if (half === 2) {
    const base = 46 + Math.floor(rng() * 44);
    if (base >= 88 && rng() < 0.15) {
      const add = 1 + Math.floor(rng() * 6);
      return { min: '90+' + add, sort: 90 + add * 0.1 };
    }
    return { min: String(base), sort: base };
  }
  if (half === 3) {
    const base = 91 + Math.floor(rng() * 15);
    return { min: String(base), sort: base };
  }
  const base = 106 + Math.floor(rng() * 14);
  return { min: String(base), sort: base };
}

function pickScorer(starters: Player[], rng: () => number): Player {
  const fwd = starters.filter((p) => ['ST', 'CF', 'RW', 'LW', 'AM'].includes(p.pos));
  return rng() < 0.72 && fwd.length > 0 ? pickFrom(fwd, rng) : pickFrom(starters, rng);
}

function pickAssister(starters: Player[], scorer: Player, rng: () => number): Player | null {
  if (rng() < 0.22) return null;
  const mid = starters.filter((p) => p.no !== scorer.no && ['CM', 'DM', 'AM', 'MF', 'RW', 'LW'].includes(p.pos));
  const pool = mid.length > 0 ? mid : starters.filter((p) => p.no !== scorer.no);
  return pool.length > 0 ? pickFrom(pool, rng) : null;
}

export function buildMatchEvents(
  match: Match,
  homeSquad: Squad,
  awaySquad: Squad,
  seed: number,
): { events: MatchEvent[]; referees: Referee[] } {
  if (match.hs == null) return { events: [], referees: [] };

  const idHash = match.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = mkRng((seed * 99991 + idHash * 5003) >>> 0);

  const events: MatchEvent[] = [];
  const homeStarters = homeSquad.players.filter((p) => p.starting);
  const awayStarters = awaySquad.players.filter((p) => p.starting);
  const homeSubs = homeSquad.players.filter((p) => !p.starting && p.pos !== 'GK');
  const awaySubs = awaySquad.players.filter((p) => !p.starting && p.pos !== 'GK');
  const isET = match.decided === 'a.e.t.' || match.decided === 'pens';

  function addGoals(count: number, team: 'home' | 'away', starters: Player[]) {
    for (let i = 0; i < count; i++) {
      let half: 1 | 2 | 3 | 4;
      if (isET && rng() < 0.25) {
        half = rng() < 0.5 ? 3 : 4;
      } else {
        half = rng() < 0.52 ? 1 : 2;
      }
      const { min, sort } = genMin(rng, half);
      const scorer = pickScorer(starters, rng);
      const assister = pickAssister(starters, scorer, rng);
      const ev: MatchEvent = { type: 'goal', team, min, sort, no: scorer.no, player: scorer.name };
      if (assister) {
        ev.assist = assister.name;
        ev.assistNo = assister.no;
      }
      events.push(ev);
    }
  }

  addGoals(match.hs, 'home', homeStarters);
  addGoals(match.as, 'away', awayStarters);

  // Yellow cards (1–4 per game)
  const yellows = 1 + Math.floor(rng() * 4);
  for (let i = 0; i < yellows; i++) {
    const team: 'home' | 'away' = rng() < 0.5 ? 'home' : 'away';
    const starters = team === 'home' ? homeStarters : awayStarters;
    const p = pickFrom(starters, rng);
    const { min, sort } = genMin(rng, rng() < 0.4 ? 1 : 2);
    events.push({ type: 'yellow', team, min, sort, no: p.no, player: p.name });
  }

  // Substitutions (up to 3 per team)
  function addSubs(team: 'home' | 'away', starters: Player[], subs: Player[]) {
    const subOns = subs.slice(0, 3);
    const offPool = starters.filter((p) => p.pos !== 'GK').slice();
    const usedOff = new Set<number>();

    subOns.forEach((sub, idx) => {
      const available = offPool.filter((p) => !usedOff.has(p.no));
      if (!available.length) return;
      const off = pickFrom(available, rng);
      usedOff.add(off.no);
      // First sub can happen late first half; others in second half
      const baseMin = idx === 0 && rng() < 0.2 ? 40 + Math.floor(rng() * 5) : 55 + Math.floor(rng() * 30);
      const sort = baseMin;
      events.push({
        type: 'sub',
        team,
        min: String(baseMin),
        sort,
        no: sub.no,
        player: sub.name,
        onNo: sub.no,
        offNo: off.no,
        on: sub.name,
        off: off.name,
      });
    });
  }

  addSubs('home', homeStarters, homeSubs);
  addSubs('away', awayStarters, awaySubs);

  // PSO result event
  if (match.decided === 'pens' && match.penWinner) {
    const winTeam = match.penWinner === match.home ? 'home' : 'away';
    events.push({ type: 'pso', team: winTeam, min: 'PSO', sort: 9999, no: 0, player: '' });
  }

  events.sort((a, b) => a.sort - b.sort);

  // Referees
  const ref = { ...pickFrom(REFEREES, rng), role: 'Referee' };
  const ar1 = { ...pickFrom(AR_POOL, rng), role: 'Assistant Referee 1' };
  const ar2 = { ...pickFrom(AR_POOL, rng), role: 'Assistant Referee 2' };
  const varRef = { ...pickFrom(VAR_POOL, rng), role: 'VAR' };

  return { events, referees: [ref, ar1, ar2, varRef] };
}
