/* ============================================================================
   World Cup 2026 — deterministic tournament engine
   Ported from design/data/engine.js for Next.js
============================================================================ */

// --- Teams: name, flag emoji, 3-letter code, strength rating (~55..93) -----
const T: Record<string, { n: string; f: string; s: number; h?: boolean }> = {
  MEX:{n:"Mexico",f:"🇲🇽",s:76,h:true}, RSA:{n:"South Africa",f:"🇿🇦",s:66},
  KOR:{n:"South Korea",f:"🇰🇷",s:75}, CZE:{n:"Czechia",f:"🇨🇿",s:75},
  CAN:{n:"Canada",f:"🇨🇦",s:74,h:true}, BIH:{n:"Bosnia & Herz.",f:"🇧🇦",s:73},
  QAT:{n:"Qatar",f:"🇶🇦",s:67}, SUI:{n:"Switzerland",f:"🇨🇭",s:79},
  BRA:{n:"Brazil",f:"🇧🇷",s:88}, MAR:{n:"Morocco",f:"🇲🇦",s:82},
  HAI:{n:"Haiti",f:"🇭🇹",s:60}, SCO:{n:"Scotland",f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",s:73},
  USA:{n:"United States",f:"🇺🇸",s:78,h:true}, PAR:{n:"Paraguay",f:"🇵🇾",s:72},
  AUS:{n:"Australia",f:"🇦🇺",s:71}, TUR:{n:"Türkiye",f:"🇹🇷",s:77},
  GER:{n:"Germany",f:"🇩🇪",s:85}, CUW:{n:"Curaçao",f:"🇨🇼",s:59},
  CIV:{n:"Ivory Coast",f:"🇨🇮",s:75}, ECU:{n:"Ecuador",f:"🇪🇨",s:77},
  NED:{n:"Netherlands",f:"🇳🇱",s:85}, JPN:{n:"Japan",f:"🇯🇵",s:78},
  SWE:{n:"Sweden",f:"🇸🇪",s:76}, TUN:{n:"Tunisia",f:"🇹🇳",s:69},
  BEL:{n:"Belgium",f:"🇧🇪",s:83}, EGY:{n:"Egypt",f:"🇪🇬",s:74},
  IRN:{n:"Iran",f:"🇮🇷",s:72}, NZL:{n:"New Zealand",f:"🇳🇿",s:60},
  ESP:{n:"Spain",f:"🇪🇸",s:92}, CPV:{n:"Cape Verde",f:"🇨🇻",s:62},
  KSA:{n:"Saudi Arabia",f:"🇸🇦",s:66}, URU:{n:"Uruguay",f:"🇺🇾",s:82},
  FRA:{n:"France",f:"🇫🇷",s:90}, SEN:{n:"Senegal",f:"🇸🇳",s:80},
  IRQ:{n:"Iraq",f:"🇮🇶",s:65}, NOR:{n:"Norway",f:"🇳🇴",s:79},
  ARG:{n:"Argentina",f:"🇦🇷",s:91}, ALG:{n:"Algeria",f:"🇩🇿",s:73},
  AUT:{n:"Austria",f:"🇦🇹",s:76}, JOR:{n:"Jordan",f:"🇯🇴",s:64},
  POR:{n:"Portugal",f:"🇵🇹",s:86}, COD:{n:"DR Congo",f:"🇨🇩",s:70},
  UZB:{n:"Uzbekistan",f:"🇺🇿",s:67}, COL:{n:"Colombia",f:"🇨🇴",s:81},
  ENG:{n:"England",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",s:88}, CRO:{n:"Croatia",f:"🇭🇷",s:82},
  GHA:{n:"Ghana",f:"🇬🇭",s:72}, PAN:{n:"Panama",f:"🇵🇦",s:66}
};

const GROUPS: Record<string, string[]> = {
  A:["MEX","RSA","KOR","CZE"], B:["CAN","BIH","QAT","SUI"],
  C:["BRA","MAR","HAI","SCO"], D:["USA","PAR","AUS","TUR"],
  E:["GER","CUW","CIV","ECU"], F:["NED","JPN","SWE","TUN"],
  G:["BEL","EGY","IRN","NZL"], H:["ESP","CPV","KSA","URU"],
  I:["FRA","SEN","IRQ","NOR"], J:["ARG","ALG","AUT","JOR"],
  K:["POR","COD","UZB","COL"], L:["ENG","CRO","GHA","PAN"]
};
const GROUP_LETTERS = Object.keys(GROUPS);

const VENUES = [
  {city:"Mexico City",stad:"Estadio Azteca",cc:"🇲🇽"},
  {city:"Guadalajara",stad:"Estadio Guadalajara",cc:"🇲🇽"},
  {city:"Monterrey",stad:"Estadio Monterrey",cc:"🇲🇽"},
  {city:"Toronto",stad:"Toronto Stadium",cc:"🇨🇦"},
  {city:"Vancouver",stad:"BC Place Vancouver",cc:"🇨🇦"},
  {city:"Los Angeles",stad:"Los Angeles Stadium",cc:"🇺🇸"},
  {city:"San Francisco Bay",stad:"Bay Area Stadium",cc:"🇺🇸"},
  {city:"Seattle",stad:"Seattle Stadium",cc:"🇺🇸"},
  {city:"Kansas City",stad:"Kansas City Stadium",cc:"🇺🇸"},
  {city:"Dallas",stad:"Dallas Stadium",cc:"🇺🇸"},
  {city:"Houston",stad:"Houston Stadium",cc:"🇺🇸"},
  {city:"Atlanta",stad:"Atlanta Stadium",cc:"🇺🇸"},
  {city:"Miami",stad:"Miami Stadium",cc:"🇺🇸"},
  {city:"New York / NJ",stad:"New York New Jersey Stadium",cc:"🇺🇸"},
  {city:"Philadelphia",stad:"Philadelphia Stadium",cc:"🇺🇸"},
  {city:"Boston",stad:"Boston Stadium",cc:"🇺🇸"}
];

function rng(seed: number) {
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function poisson(lambda: number, rand: () => number){
  const L = Math.exp(-lambda); let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

const DAY0 = Date.UTC(2026,5,11,0,0,0);
const DAYMS = 86400000;
function ts(day: number, hourLocal?: number){ return DAY0 + day*DAYMS + (hourLocal||0)*3600000; }
function dstr(t: number){
  const d = new Date(t);
  return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
}
function tstr(t: number){
  const d = new Date(t);
  let h = d.getHours(); const ap = h>=12?"PM":"AM"; h = h%12||12;
  return h+":"+String(d.getMinutes()).padStart(2,"0")+" "+ap;
}

const MD_DAY: Record<number, Record<string, number>> = {
  1:{A:0,B:1,C:2,D:1,E:3,F:3,G:4,H:4,I:5,J:5,K:6,L:6},
  2:{A:7,B:7,C:8,D:8,E:9,F:9,G:10,H:10,I:11,J:11,K:12,L:12},
  3:{A:13,B:13,C:13,D:14,E:14,F:14,G:15,H:15,I:15,J:16,K:16,L:16}
};
const KICK = [12,15,18,21];

export interface Team {
  code: string; n: string; f: string; s: number; h?: boolean;
}
export interface Venue {
  city: string; stad: string; cc: string;
}
export interface Match {
  id: string; stage: "group"|"ko"; group?: string; round: string;
  home: string; away: string; hs: number; as: number;
  t: number; venue: string; city: string; cc: string;
  // ko-only
  no?: number; refs?: string[]; decided?: string;
  winnerCode?: string; loserCode?: string; penWinner?: string;
}
export interface StandingRow {
  code: string; P: number; W: number; D: number; L: number;
  GF: number; GA: number; GD: number; Pts: number;
  g?: string; rank?: number; complete?: boolean;
}
export interface Tournament {
  seed: number;
  teams: Record<string, Team>;
  GROUPS: Record<string, string[]>;
  GROUP_LETTERS: string[];
  VENUES: Venue[];
  matches: Match[];
  standings: Record<string, StandingRow[]>;
  winner: Record<string, string>;
  runner: Record<string, string>;
  thirdByGroup: Record<string, StandingRow>;
  thirdRanked: StandingRow[];
  qualThirds: StandingRow[];
  qualGroups: string[];
  slotAssign: Record<string, string>;
  thirdGroupToCode: Record<string, string>;
  ko: Record<number, Match>;
  champion: string|null;
  runnerUp: string|null;
  third: string|null;
  DAY0: number; DAYMS: number;
  ts: typeof ts; dstr: typeof dstr; tstr: typeof tstr;
  lastDay: number;
}

export function build(seed: number): Tournament {
  const rand = rng(seed||1);
  const teams: Record<string, Team> = {};
  Object.keys(T).forEach(k=>{ teams[k] = Object.assign({code:k}, T[k]); });

  const matches: Match[] = [];
  let venueI = 0, kickI = 0, mid = 1;
  const nextVenue = ()=>VENUES[(venueI++)%VENUES.length];

  function sim(hk: string, ak: string):[number,number]{
    const dh = teams[hk].s - teams[ak].s;
    const lh = Math.max(0.18, 1.38*Math.exp(dh/17) + 0.12);
    const la = Math.max(0.18, 1.38*Math.exp(-dh/17) - 0.02);
    return [poisson(lh,rand), poisson(la,rand)];
  }

  const pairings: Record<number, [number,number][]> = {
    1:[[0,1],[2,3]], 2:[[0,2],[3,1]], 3:[[3,0],[1,2]]
  };
  GROUP_LETTERS.forEach(g=>{
    const ts4 = GROUPS[g];
    for (let md=1; md<=3; md++){
      pairings[md].forEach((pr,idx)=>{
        const hk = ts4[pr[0]], ak = ts4[pr[1]];
        const [hs,as_] = sim(hk,ak);
        const day = MD_DAY[md][g] + (md===1 && idx===1 && (g==="B"||g==="D") ? 1 : 0);
        const v = nextVenue();
        matches.push({
          id:"M"+mid++, stage:"group", group:g, round:"Matchday "+md,
          home:hk, away:ak, hs, as:as_,
          t: ts(day, KICK[(kickI++)%KICK.length]),
          venue:v.stad, city:v.city, cc:v.cc
        });
      });
    }
  });

  function blankRow(k: string): StandingRow {return {code:k,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0};}
  const standings: Record<string, StandingRow[]> = {};
  GROUP_LETTERS.forEach(g=>{
    const rows: Record<string,StandingRow> = {};
    GROUPS[g].forEach(k=>rows[k]=blankRow(k));
    matches.filter(m=>m.stage==="group"&&m.group===g).forEach(m=>{
      const h=rows[m.home], a=rows[m.away];
      h.P++;a.P++; h.GF+=m.hs;h.GA+=m.as;a.GF+=m.as;a.GA+=m.hs;
      if(m.hs>m.as){h.W++;h.Pts+=3;a.L++;}
      else if(m.hs<m.as){a.W++;a.Pts+=3;h.L++;}
      else{h.D++;a.D++;h.Pts++;a.Pts++;}
    });
    Object.values(rows).forEach(r=>r.GD=r.GF-r.GA);
    const ord = Object.values(rows).sort(cmpTeam);
    standings[g] = ord;
  });
  function cmpTeam(a: StandingRow,b: StandingRow){
    if(b.Pts!==a.Pts)return b.Pts-a.Pts;
    if(b.GD!==a.GD)return b.GD-a.GD;
    if(b.GF!==a.GF)return b.GF-a.GF;
    const sa=teams[a.code].s, sb=teams[b.code].s;
    if(sb!==sa)return sb-sa;
    return a.code<b.code?-1:1;
  }

  const winner: Record<string,string> = {}, runner: Record<string,string> = {}, thirdByGroup: Record<string,StandingRow> = {};
  GROUP_LETTERS.forEach(g=>{
    winner[g]=standings[g][0].code;
    runner[g]=standings[g][1].code;
    thirdByGroup[g]=standings[g][2];
  });

  const thirdRanked: StandingRow[] = GROUP_LETTERS.map(g=>Object.assign({g},thirdByGroup[g]))
    .sort((a,b)=>{
      if(b.Pts!==a.Pts)return b.Pts-a.Pts;
      if(b.GD!==a.GD)return b.GD-a.GD;
      if(b.GF!==a.GF)return b.GF-a.GF;
      const sa=teams[a.code].s, sb=teams[b.code].s;
      if(sb!==sa)return sb-sa; return (a.g||"")<(b.g||"")?-1:1;
    });
  const qualThirds = thirdRanked.slice(0,8);
  qualThirds.forEach((x,i)=>x.rank=i+1);
  const qualGroups = qualThirds.map(x=>x.g!).sort();
  const thirdGroupToCode: Record<string,string> = {};
  qualThirds.forEach(x=>thirdGroupToCode[x.g!]=x.code);

  const slotAllowed: Record<string,string[]> = {
    sE:["A","B","C","D","F"],
    sI:["C","D","F","G","H"],
    sA:["C","E","F","H","I"],
    sL:["E","H","I","J","K"],
    sD:["B","E","F","I","J"],
    sG:["A","E","H","I","J"],
    sB:["E","F","G","I","J"],
    sK:["D","E","I","J","L"]
  };
  const slotAssign = matchSlots(slotAllowed, qualGroups);
  function matchSlots(allowed: Record<string,string[]>, groups: string[]){
    const slots = Object.keys(allowed);
    const res: Record<string,string> = {};
    const used: Record<string,boolean> = {};
    function avail(s: string){ return allowed[s].filter(g=>groups.includes(g) && !used[g]); }
    function solve(): boolean {
      const rem = slots.filter(s=>!res[s]);
      if(rem.length===0) return Object.keys(used).length===groups.length;
      rem.sort((x,y)=>avail(x).length-avail(y).length);
      const s = rem[0];
      for(const g of avail(s)){
        res[s]=g; used[g]=true;
        if(solve()) return true;
        delete res[s]; delete used[g];
      }
      return false;
    }
    solve();
    return res;
  }
  const thirdForSlot = (slotKey: string)=> thirdGroupToCode[slotAssign[slotKey]];

  const ko: Record<number, Match> = {};
  const R32: Record<number,[string,string]> = {
    73:["R:A","R:B"], 74:["W:E","3:sE"], 75:["W:F","R:C"], 76:["W:C","R:F"],
    77:["W:I","3:sI"], 78:["R:E","R:I"], 79:["W:A","3:sA"], 80:["W:L","3:sL"],
    81:["W:D","3:sD"], 82:["W:G","3:sG"], 83:["R:K","R:L"], 84:["W:H","R:J"],
    85:["W:B","3:sB"], 86:["W:J","R:H"], 87:["W:K","3:sK"], 88:["R:D","R:G"]
  };
  const R16: Record<number,[string,string]> = {
    89:["M:74","M:77"], 90:["M:73","M:75"], 91:["M:76","M:78"], 92:["M:79","M:80"],
    93:["M:83","M:84"], 94:["M:81","M:82"], 95:["M:86","M:88"], 96:["M:85","M:87"]
  };
  const QF: Record<number,[string,string]> = { 97:["M:89","M:90"], 98:["M:93","M:94"], 99:["M:91","M:92"], 100:["M:95","M:96"] };
  const SF: Record<number,[string,string]> = { 101:["M:97","M:98"], 102:["M:99","M:100"] };
  const TP: Record<number,[string,string]> = { 103:["L:101","L:102"] };
  const FN: Record<number,[string,string]> = { 104:["M:101","M:102"] };

  function resolve(ref: string): string|null {
    const [k,v]=ref.split(":");
    if(k==="W")return winner[v];
    if(k==="R")return runner[v];
    if(k==="3")return thirdForSlot(v);
    if(k==="M")return ko[Number(v)]?ko[Number(v)].winnerCode||null:null;
    if(k==="L")return ko[Number(v)]?ko[Number(v)].loserCode||null:null;
    return null;
  }

  function simKO(hk: string, ak: string){
    const dh=teams[hk].s-teams[ak].s;
    const lh=Math.max(0.2,1.18*Math.exp(dh/19));
    const la=Math.max(0.2,1.18*Math.exp(-dh/19));
    let hs=poisson(lh,rand), as_=poisson(la,rand), decided="";
    if(hs===as_){
      const eg = rand();
      if(eg<0.28){ if(rand()<(0.5+dh/120)) hs++; else as_++; decided="a.e.t."; }
      else {
        decided="pens";
        const pw = rand() < (0.5+dh/200);
        return {hs,as:as_,decided,penWinner: pw?hk:ak};
      }
    }
    return {hs,as:as_,decided};
  }

  const KO_DAYS: Record<string,{start?:number;end?:number;day?:number}> = {
    R32:{start:17,end:22}, R16:{start:23,end:26}, QF:{start:28,end:30},
    SF:{start:33,end:34}, TP:{day:37}, FN:{day:38}
  };
  function buildRound(defs: Record<number,[string,string]>, label: string, sched: {start?:number;end?:number;day?:number}){
    const nos = Object.keys(defs).map(Number).sort((a,b)=>a-b);
    nos.forEach((no,i)=>{
      const [r1,r2]=defs[no];
      const hk=resolve(r1), ak=resolve(r2);
      let day: number;
      if(sched.day!=null) day=sched.day;
      else day = sched.start! + Math.floor(i*( (sched.end!-sched.start!+1) / nos.length));
      const v=nextVenue();
      const m: Match={
        id:"K"+no, no, stage:"ko", round:label, refs:[r1,r2],
        home:hk||"", away:ak||"", hs:0, as:0,
        t:ts(day, KICK[(kickI++)%KICK.length]),
        venue:v.stad, city:v.city, cc:v.cc
      };
      if(hk&&ak){
        const r=simKO(hk,ak);
        m.hs=r.hs; m.as=r.as; m.decided=r.decided||"";
        let wk,lk;
        if(r.decided==="pens"){ wk=r.penWinner; lk=(wk===hk?ak:hk); }
        else { wk = r.hs>r.as?hk:ak; lk = r.hs>r.as?ak:hk; }
        m.winnerCode=wk; m.loserCode=lk;
      }
      ko[no]=m; matches.push(m);
    });
  }
  buildRound(R32,"Round of 32",KO_DAYS.R32);
  buildRound(R16,"Round of 16",KO_DAYS.R16);
  buildRound(QF,"Quarter-final",KO_DAYS.QF);
  buildRound(SF,"Semi-final",KO_DAYS.SF);
  buildRound(TP,"Third place",{day:KO_DAYS.TP.day});
  buildRound(FN,"Final",{day:KO_DAYS.FN.day});

  const champion = ko[104] ? ko[104].winnerCode||null : null;
  const runnerUp = ko[104] ? ko[104].loserCode||null : null;
  const third = ko[103] ? ko[103].winnerCode||null : null;

  matches.sort((a,b)=>a.t-b.t || a.id.localeCompare(b.id));

  return {
    seed: seed||1, teams, GROUPS, GROUP_LETTERS, VENUES,
    matches, standings, winner, runner, thirdByGroup,
    thirdRanked, qualThirds, qualGroups, slotAssign, thirdGroupToCode,
    ko, champion, runnerUp, third,
    DAY0, DAYMS, ts, dstr, tstr,
    lastDay: 38
  };
}
