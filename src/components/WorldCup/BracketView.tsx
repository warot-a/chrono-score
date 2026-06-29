'use client';

const KNOCKOUT_STAGE_URL = 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup#Knockout_stage';

export function BracketView() {
  return (
    <div>
      <div className="sec-head">
        <div>
          <h2>Knockout Bracket</h2>
          <div className="sub">The bracket view is temporarily unavailable while we repair live knockout data.</div>
        </div>
      </div>

      <section className="bracket-placeholder" aria-labelledby="bracket-placeholder-title">
        <div className="bracket-placeholder-kicker">Under construction</div>
        <h3 id="bracket-placeholder-title">Knockout bracket is being rebuilt</h3>
        <p>Please use the official knockout stage reference for now.</p>
        <a href={KNOCKOUT_STAGE_URL} target="_blank" rel="noopener noreferrer" className="bracket-placeholder-link">
          Open knockout stage on Wikipedia
        </a>
      </section>
    </div>
  );
}

/*
Temporarily disabled bracket implementation. Keep this here so the bracket can
be repaired without recovering the old component from git history.

'use client';

import { useState, useRef, useCallback, useLayoutEffect, MutableRefObject } from 'react';
import { Tournament } from '@/lib/engine';
import { Flag, matchView, koFT } from '@/lib/util';
import { useTournamentStore, selectNowTs } from '@/store/tournamentStore';

const L_R32 = [74, 77, 73, 75, 83, 84, 81, 82];
const L_R16 = [89, 90, 93, 94];
const L_QF = [97, 98];
const L_SF = [101];
const R_R32 = [76, 78, 79, 80, 86, 88, 85, 87];
const R_R16 = [91, 92, 95, 96];
const R_QF = [99, 100];
const R_SF = [102];
const FINAL = 104;

function fmtRange(t1: number, t2: number): string {
  const a = new Date(t1),
    b = new Date(t2);
  const ma = a.toLocaleDateString('en-US', { month: 'short' });
  const mb = b.toLocaleDateString('en-US', { month: 'short' });
  return ma === mb ? `${ma} ${a.getDate()}–${b.getDate()}` : `${ma} ${a.getDate()} – ${mb} ${b.getDate()}`;
}

function BracketCard({
  tour,
  no,
  now,
  cardRef,
  small,
}: {
  tour: Tournament;
  no: number;
  now: number;
  cardRef?: (el: HTMLDivElement | null) => void;
  small?: boolean;
}) {
  const m = tour.ko[no];
  const v = matchView(tour, m, now);
  const d = new Date(m.timestamp);
  const dlabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  function row(code: string | null, label: string, score: number, isWin: boolean) {
    return (
      <div className={'bm-row' + (isWin ? ' win' : '') + (code ? '' : ' tbd')}>
        {code ? <Flag code={code} tour={tour} /> : <span className="flag ph">·</span>}
        <span className="bm-name">{code ? tour.teams[code].n : label}</span>
        <span className="bm-sc">{v.played ? score : ''}</span>
      </div>
    );
  }
  const hWin = v.played && v.winnerCode === v.hCode;
  const aWin = v.played && v.winnerCode === v.aCode;

  return (
    <div className={'bmatch' + (v.live ? ' live' : v.played ? ' ft' : ' up') + (small ? ' small' : '')} ref={cardRef}>
      <div className="bm-tag">
        <span>#{no}</span>
        <span className={v.live ? 'bm-when live' : 'bm-when'}>{v.live ? 'LIVE' : dlabel}</span>
      </div>
      {row(v.hCode, v.hLabel, v.homeScore, hWin)}
      {row(v.aCode, v.aLabel, v.awayScore, aWin)}
      {v.played && v.decided ? <div className="bm-foot">{v.decided === 'pens' ? 'pens' : 'a.e.t.'}</div> : null}
    </div>
  );
}

function Column({
  tour,
  nos,
  now,
  label,
  range,
  cardRefs,
  treeH,
}: {
  tour: Tournament;
  nos: number[];
  now: number;
  label: string;
  range?: string;
  cardRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  treeH: number;
}) {
  return (
    <div className="bcol">
      <div className="bcol-head">
        <span className="bch-name">{label}</span>
        {range ? <span className="bch-date">{range}</span> : null}
      </div>
      <div className="bcol-body" style={{ height: treeH }}>
        {nos.map((no) => (
          <BracketCard
            key={no}
            tour={tour}
            no={no}
            now={now}
            cardRef={(el) => {
              cardRefs.current[no] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function BracketView() {
  const tour = useTournamentStore((s) => s.tour);
  const now = useTournamentStore(selectNowTs);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const innerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ paths: { d: string; on: boolean }[]; w: number; h: number }>({
    paths: [],
    w: 0,
    h: 0,
  });
  const treeH = 780;

  const recompute = useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const ir = inner.getBoundingClientRect();
    const paths: { d: string; on: boolean }[] = [];
    Object.values(tour.ko).forEach((m) => {
      if (!m.refs) return;
      m.refs.forEach((r) => {
        if (!r.startsWith('M:')) return;
        const cn = +r.split(':')[1];
        const childEl = cardRefs.current[cn],
          parentEl = cardRefs.current[m.no!];
        if (!childEl || !parentEl) return;
        const c = childEl.getBoundingClientRect(),
          p = parentEl.getBoundingClientRect();
        const ccx = c.left + c.width / 2 - ir.left,
          pcx = p.left + p.width / 2 - ir.left;
        let x1, x2;
        const y1 = c.top + c.height / 2 - ir.top,
          y2 = p.top + p.height / 2 - ir.top;
        if (ccx < pcx) {
          x1 = c.right - ir.left;
          x2 = p.left - ir.left;
        } else {
          x1 = c.left - ir.left;
          x2 = p.right - ir.left;
        }
        const midX = (x1 + x2) / 2;
        const fed = koFT(tour, cn, now);
        paths.push({ d: `M${x1} ${y1} H${midX} V${y2} H${x2}`, on: fed });
      });
    });
    setLines({ paths, w: inner.scrollWidth, h: inner.scrollHeight });
  }, [tour, now]);

  useLayoutEffect(() => {
    recompute();
    const t = setTimeout(recompute, 120);
    window.addEventListener('resize', recompute);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', recompute);
    };
  }, [recompute]);

  const r32range = fmtRange(tour.ko[73].timestamp, tour.ko[88].timestamp);
  const r16range = fmtRange(tour.ko[89].timestamp, tour.ko[96].timestamp);
  const qfrange = fmtRange(tour.ko[97].timestamp, tour.ko[100].timestamp);
  const sfrange = fmtRange(tour.ko[101].timestamp, tour.ko[102].timestamp);

  const fin = matchView(tour, tour.ko[FINAL], now);
  const champ = fin.played ? fin.winnerCode : null;

  return (
    <div>
      <div className="sec-head">
        <div>
          <h2>Knockout Bracket</h2>
          <div className="sub">32 teams, single elimination — winners advance automatically as results come in</div>
        </div>
      </div>

      <div className="bracket-scroll">
        <div className="bracket-inner" ref={innerRef}>
          <svg className="bracket-svg" width={lines.w} height={lines.h}>
            {lines.paths.map((p, i) => (
              <path key={i} d={p.d} className={'conn' + (p.on ? ' on' : '')} fill="none" />
            ))}
          </svg>
          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={L_R32}
            label="Round of 32"
            range={r32range}
          />
          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={L_R16}
            label="Round of 16"
            range={r16range}
          />
          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={L_QF}
            label="Quarter-finals"
            range={qfrange}
          />
          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={L_SF}
            label="Semi-finals"
            range={sfrange}
          />

          <div className="bcol final-col">
            <div className="bcol-head center">
              <span className="bch-name gold">Final</span>
              <span className="bch-date">Jul 19</span>
            </div>
            <div className="bcol-body center" style={{ height: treeH }}>
              <div className="trophy-wrap">
                <div className="trophy">🏆</div>
                <BracketCard
                  tour={tour}
                  no={FINAL}
                  now={now}
                  cardRef={(el) => {
                    cardRefs.current[FINAL] = el;
                  }}
                />
                <div className="champ-line">
                  {champ ? (
                    <>
                      <span className="cl-lbl">World Champions</span>
                      <span className="cl-team">
                        <Flag code={champ} tour={tour} /> {tour.teams[champ].n}
                      </span>
                    </>
                  ) : (
                    <span className="cl-tbd">Champions to be decided</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={R_SF}
            label="Semi-finals"
            range={sfrange}
          />
          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={R_QF}
            label="Quarter-finals"
            range={qfrange}
          />
          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={R_R16}
            label="Round of 16"
            range={r16range}
          />
          <Column
            tour={tour}
            now={now}
            cardRefs={cardRefs}
            treeH={treeH}
            nos={R_R32}
            label="Round of 32"
            range={r32range}
          />
        </div>
      </div>

      <div className="third-place-box">
        <div className="tpb-label">Third-Place Play-off · Jul 18</div>
        <div className="tpb-card">
          <BracketCard tour={tour} no={103} now={now} cardRef={() => {}} small />
        </div>
      </div>
    </div>
  );
}
*/
