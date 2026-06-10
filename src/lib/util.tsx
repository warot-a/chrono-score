import { Tournament, Match, StandingRow } from '@/lib/engine';

const LIVE_MS = 2 * 3600 * 1000;

export function phaseForDay(d: number): [string, string] {
  if (d < 7) return ["Group Stage", "Matchday 1"];
  if (d < 13) return ["Group Stage", "Matchday 2"];
  if (d < 17) return ["Group Stage", "Matchday 3"];
  if (d < 23) return ["Knockout", "Round of 32"];
  if (d < 28) return ["Knockout", "Round of 16"];
  if (d < 33) return ["Knockout", "Quarter-finals"];
  if (d < 37) return ["Knockout", "Semi-finals"];
  if (d < 38) return ["Knockout", "Third-place play-off"];
  return ["Knockout", "The Final"];
}

export const SLOT_LABEL: Record<string, string> = {
  sE: "3rd A/B/C/D/F", sI: "3rd C/D/F/G/H", sA: "3rd C/E/F/H/I",
  sL: "3rd E/H/I/J/K", sD: "3rd B/E/F/I/J", sG: "3rd A/E/H/I/J",
  sB: "3rd E/F/G/I/J", sK: "3rd D/E/I/J/L"
};

export function groupComplete(tour: Tournament, g: string, now: number): boolean {
  return tour.matches.every(m =>
    !(m.stage === "group" && m.group === g) || m.t <= now);
}
export function allGroupsComplete(tour: Tournament, now: number): boolean {
  return tour.GROUP_LETTERS.every(g => groupComplete(tour, g, now));
}

function koShort(tour: Tournament, no: number): string {
  const m = tour.ko[no];
  const idx: Record<string, string> = { "Round of 32": "R32", "Round of 16": "R16", "Quarter-final": "QF", "Semi-final": "SF", "Third place": "3rd", "Final": "Final" };
  return (idx[m.round] || m.round) + " " + no;
}

export function koFT(tour: Tournament, no: number, now: number): boolean {
  const m = tour.ko[no]; if (!m) return false;
  const { h, a } = koTeams(tour, m, now);
  return !!(h.code && a.code && m.t <= now);
}

export function resolveRef(tour: Tournament, ref: string, now: number): { code: string | null; label: string } {
  const [k, v] = ref.split(":");
  if (k === "W") return { code: groupComplete(tour, v, now) ? tour.winner[v] : null, label: "Winners Group " + v };
  if (k === "R") return { code: groupComplete(tour, v, now) ? tour.runner[v] : null, label: "Runners-up Group " + v };
  if (k === "3") return { code: allGroupsComplete(tour, now) ? tour.thirdGroupToCode[tour.slotAssign[v]] : null, label: SLOT_LABEL[v] || "3rd place" };
  if (k === "M") { const m = tour.ko[Number(v)]; return { code: koFT(tour, Number(v), now) ? m.winnerCode || null : null, label: "Winner of " + koShort(tour, Number(v)) }; }
  if (k === "L") { const m = tour.ko[Number(v)]; return { code: koFT(tour, Number(v), now) ? m.loserCode || null : null, label: "Loser of " + koShort(tour, Number(v)) }; }
  return { code: null, label: "TBD" };
}

export function koTeams(tour: Tournament, m: Match, now: number) {
  return { h: resolveRef(tour, m.refs![0], now), a: resolveRef(tour, m.refs![1], now) };
}

export interface MatchView {
  hCode: string | null; aCode: string | null;
  hLabel: string; aLabel: string;
  played: boolean; live: boolean;
  hs: number; as: number;
  decided: string;
  winnerCode?: string;
  penWinner?: string | null;
}

export function matchView(tour: Tournament, m: Match, now: number): MatchView {
  if (m.stage === "group") {
    const played = m.t <= now;
    const live = played && (now < m.t + LIVE_MS);
    return {
      hCode: m.home, aCode: m.away,
      hLabel: tour.teams[m.home]?.n ?? m.home, aLabel: tour.teams[m.away]?.n ?? m.away,
      played, live, hs: m.hs, as: m.as, decided: ""
    };
  }
  const { h, a } = koTeams(tour, m, now);
  const bothKnown = !!(h.code && a.code);
  const played = bothKnown && m.t <= now;
  const live = played && (now < m.t + LIVE_MS);
  return {
    hCode: h.code, aCode: a.code,
    hLabel: h.code ? tour.teams[h.code].n : h.label,
    aLabel: a.code ? tour.teams[a.code].n : a.label,
    played, live, hs: m.hs, as: m.as, decided: m.decided || "",
    winnerCode: m.winnerCode,
    penWinner: m.decided === "pens" ? m.winnerCode : null
  };
}

export function liveStandings(tour: Tournament, g: string, now: number): StandingRow[] {
  const rows: Record<string, StandingRow> = {};
  tour.GROUPS[g].forEach(k => rows[k] = { code: k, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 });
  tour.matches.filter(m => m.stage === "group" && m.group === g && m.t <= now).forEach(m => {
    const h = rows[m.home], a = rows[m.away];
    h.P++; a.P++; h.GF += m.hs; h.GA += m.as; a.GF += m.as; a.GA += m.hs;
    if (m.hs > m.as) { h.W++; h.Pts += 3; a.L++; }
    else if (m.hs < m.as) { a.W++; a.Pts += 3; h.L++; }
    else { h.D++; a.D++; h.Pts++; a.Pts++; }
  });
  Object.values(rows).forEach(r => r.GD = r.GF - r.GA);
  return Object.values(rows).sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    if (b.GD !== a.GD) return b.GD - a.GD;
    if (b.GF !== a.GF) return b.GF - a.GF;
    const sa = tour.teams[a.code].s, sb = tour.teams[b.code].s;
    if (sb !== sa) return sb - sa; return a.code < b.code ? -1 : 1;
  });
}

export function liveThirds(tour: Tournament, now: number): StandingRow[] {
  const arr: StandingRow[] = tour.GROUP_LETTERS.map(g => {
    const st = liveStandings(tour, g, now);
    return Object.assign({ g, complete: groupComplete(tour, g, now) }, st[2]);
  });
  arr.sort((a, b) => {
    if (b.Pts !== a.Pts) return b.Pts - a.Pts;
    if (b.GD !== a.GD) return b.GD - a.GD;
    if (b.GF !== a.GF) return b.GF - a.GF;
    const sa = tour.teams[a.code].s, sb = tour.teams[b.code].s;
    if (sb !== sa) return sb - sa; return (a.g || "") < (b.g || "") ? -1 : 1;
  });
  arr.forEach((x, i) => x.rank = i + 1);
  return arr;
}

export function groupColor(g: string): string {
  const i = "ABCDEFGHIJKL".indexOf(g);
  const hue = Math.round(20 + i * (340 / 12));
  return `oklch(0.74 0.15 ${hue})`;
}

export function Flag({ code, tour, size }: { code: string; tour: Tournament; size?: string }) {
  const team = tour.teams[code];
  const iso = team?.iso?.toLowerCase();
  const px = size ? parseInt(size, 10) : 20;
  if (iso) {
    return (
      <img
        src={`https://flagcdn.com/w40/${iso}.png`}
        alt={team.n}
        width={px * 1.5}
        height={px}
        className="flag-img"
        style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'cover' }}
      />
    );
  }
  return <span className="flag" style={size ? { fontSize: size } : undefined}>{team?.f ?? "🏳️"}</span>;
}
