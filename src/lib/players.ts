/* Deterministic squad generator — seeded per (teamCode, seed) */

export interface Player {
  no: number;
  name: string;
  pos: string;
  captain?: boolean;
  starting: boolean;
}

export interface Squad {
  code: string;
  coach: string;
  players: Player[];
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

// Region map
const REGION: Record<string, string> = {
  BRA:'SAM', ARG:'SAM', URU:'SAM', COL:'SAM', ECU:'SAM', PAR:'SAM',
  FRA:'EUW', ESP:'EUW', GER:'EUW', NED:'EUW', POR:'EUW', BEL:'EUW', ENG:'EUW',
  CZE:'EUE', SUI:'EUE', SWE:'EUE', SCO:'EUE', NOR:'EUE', AUT:'EUE',
  TUR:'EUE', CRO:'EUE', BIH:'EUE',
  MEX:'CAM', USA:'CAM', CAN:'CAM', PAN:'CAM', HAI:'CAM', CUW:'CAM',
  MAR:'AFN', EGY:'AFN', TUN:'AFN', ALG:'AFN',
  SEN:'AFW', CIV:'AFW', GHA:'AFW', CPV:'AFW',
  RSA:'AFS', COD:'AFC',
  JPN:'ASE', KOR:'ASE',
  AUS:'OCE', NZL:'OCE',
  IRN:'ASW', KSA:'ASW', QAT:'ASW', JOR:'ASW', IRQ:'ASW',
  UZB:'ASC',
};

// [firstNames[], lastNames[]]
const NAMES: Record<string, [string[], string[]]> = {
  SAM: [
    ['Gabriel','Lucas','Mateus','Bruno','João','Diego','Rodrigo','Thiago','Carlos','Felipe','Lionel','Ángel','Julián','Alexis','Facundo','Gonzalo','Emiliano','Exequiel','Nicolás','Nahuel'],
    ['Silva','Santos','Rodrigues','Oliveira','Fernández','Martínez','Gómez','López','González','Pérez','Álvarez','Torres','Suárez','Valverde','Arrascaeta','Núñez','Vidal','Sánchez','Rojas','Flores'],
  ],
  EUW: [
    ['Kylian','Antoine','Ousmane','Marcus','Bukayo','Phil','Jack','Declan','Pedri','Gavi','Ferran','Virgil','Frenkie','Bernardo','Diogo','Romelu','Kevin','Thibaut','Kingsley','Theo'],
    ['Mbappé','Griezmann','Dembélé','Rashford','Saka','Foden','Grealish','Rice','Torres','Olmo','Silva','van Dijk','de Jong','Fernandes','Jota','Lukaku','de Bruyne','Courtois','Coman','Hernández'],
  ],
  EUE: [
    ['Patrik','Tomáš','Granit','Alexander','Emil','Marcus','Erling','David','Marcel','Arda','Luka','Edin','Andreas','Konrad','Robin','Jonas','Lars','Ilkay','Leroy','Thomas'],
    ['Schick','Souček','Xhaka','Isak','Forsberg','Haaland','Alaba','Sabitzer','Güler','Modrić','Džeko','Kramarić','Laimer','Baumgartner','Quaison','Müller','Gnabry','Wirtz','Havertz','Kimmich'],
  ],
  CAM: [
    ['Hirving','Alexis','Raúl','Santiago','Christian','Tyler','Giovanni','Jesús','Alphonso','Jonathan','Cyle','Dru','Miles','Rubén','Rolando','André','Junior','Ricardo','Jorge','Brian'],
    ['Lozano','Vega','Jiménez','Giménez','Pulisic','Adams','Reyna','Sánchez','Davies','David','Larin','Robinson','Blackman','Baron','Blake','Galloway','Hoilett','Perez','Lewis','Wright'],
  ],
  AFN: [
    ['Hakim','Youssef','Noussair','Achraf','Mohamed','Ahmed','Omar','Mostafa','Tarek','Hamza','Ziyad','Nassim','Islam','Yassine','Ilies','Rayan','Ayoub','Sofiane','Hichem','Bilal'],
    ['Ziyech','En-Nesyri','Mazraoui','Hakimi','Salah','Hegazi','Marmoush','Hamed','Bennacer','Aouar','Bounou','Slimani','Bensebaini','Bedrane','Tougaï','Boudaoui','Brahimi','Atal','Mandi','Benrahma'],
  ],
  AFW: [
    ['Sadio','Ismaïla','Idrissa','Kalidou','Wilfried','Franck','Sébastien','Nicolas','André','Jordan','Thomas','Inaki','Osman','Moussa','Bamba','Cheikhou','Pape','Jeremie','Hassane','Ghislain'],
    ['Mané','Sarr','Gueye','Koulibaly','Zaha','Kessié','Haller','Pépé','Ayew','Ayew','Partey','Williams','Diallo','Konaté','Diallo','Kouyaté','Gueye','Bayo','Kamara','Konan'],
  ],
  AFS: [
    ['Percy','Bongani','Themba','Lebo','Thembinkosi','Evidence','Yusuf','Teboho','Lyle','Ronwen','Lebohang','Thulani','Keegan','Bradley','Wandile','Mduduzi','Sibusiso','Sphephelo','Sphelele','Grant'],
    ['Tau','Zungu','Zwane','Mothiba','Lorch','Makgopa','Maart','Mokoena','Foster','Williams','Manyama','Serero','Dolly','Grobler','Dlamini','Mkhize','Vilakazi','Sithole','Hlongwane','Kekana'],
  ],
  AFC: [
    ['Cédric','Silas','Chancel','Théo','Christian','Dieumerci','Yannick','Glody','Merveille','Fiston','Youssouf','Hérita','Neeskens','Meschak','Mavis','Ibrahima','Darly','Meschak','Ben','Gauthier'],
    ['Bakambu','Mbidi','Mbemba','Bongonda','Luyindama','Mbokani','Bolasie','Lilepo','Bokadi','Luvumbu','Ponce','Ilunga','Losongela','Imbula','Bope','Ngita','Moutoussamy','Kakuta','Lemina','Saïd'],
  ],
  ASE: [
    ['Takumi','Daichi','Wataru','Hiroki','Kaoru','Ko','Daizen','Ritsu','Hwang','Son','Lee','Kim','Cho','Jeong','Na','Moon','Park','Jae-sung','Heung-min','Kang-in'],
    ['Minamino','Ito','Endo','Sakai','Mitoma','Itakura','Maeda','Doan','In-beom','Heung-min','Kang-in','Min-jae','Gue-sung','Woo-yeong','Sang-ho','Seung-ho','Ji-su','Hee-chan','Hwang','Sung-jin'],
  ],
  ASW: [
    ['Ali','Mohammed','Saleh','Omar','Hassan','Firas','Salem','Abdullah','Tariq','Mehdi','Sardar','Alireza','Saman','Karim','Reza','Saad','Yousif','Ayman','Tarek','Ahmad'],
    ['Al-Bulayhi','Al-Qahtani','Al-Dawsari','Al-Otaibi','Al-Shehri','Al-Tamari','Al-Hassan','Al-Yami','Al-Malki','Al-Faraj','Taremi','Azmoun','Jahanbakhsh','Aghaei','Rezaeian','Hassan','Dhiya','Waleed','Ghanem','Nasser'],
  ],
  ASC: [
    ['Eldor','Jasur','Otabek','Bobur','Dostonbek','Abdukodir','Shamsiddin','Jaloliddin','Nodir','Mirzo','Ulugbek','Islom','Farrukh','Laziz','Ikrom','Sherzod','Temur','Ravshan','Akbar','Sanjar'],
    ['Shomurodov','Yakhshiboev','Sobirov','Mirzaev','Ergashev','Khusanov','Sultanov','Masharipov','Tursunov','Matchanov','Yunusov','Toshmatov','Tashmatov','Komilov','Hamidov','Egamberdiev','Rashidov','Karimov','Boltaev','Nishonov'],
  ],
  OCE: [
    ['Mathew','Aaron','Andrew','Martin','Jackson','Denis','Tom','Milos','Brandon','Ryan','Dane','Elijah','Dylan','Cameron','Chris','Alex','Bailey','Gianni','Jordan','Rhyan'],
    ['Leckie','Mooy','Nabbout','Boyle','Irvine','Genreau','Rogic','Degenek','Borello','Williams','Ingham','Costello','Ryan','Christie','Smith','Gersbach','Grant','Stensness','Surman','Grant'],
  ],
};

const FALLBACK_NAMES: [string[], string[]] = [
  ['Alex','Jordan','Sam','Chris','Jamie','Morgan','Taylor','Casey','Riley','Drew'],
  ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor'],
];

// 4-3-3, 4-2-3-1, 4-4-2, 5-3-2 starters (11 positions)
const FORMATIONS: string[][] = [
  ['GK','CB','CB','RB','LB','DM','CM','CM','LW','RW','ST'],
  ['GK','CB','CB','RB','LB','DM','DM','AM','LW','RW','CF'],
  ['GK','CB','CB','RB','LB','CM','CM','CM','LW','RW','ST'],
  ['GK','CB','CB','RB','LB','CM','CM','LW','RW','ST','ST'],
];

const SUB_POSITIONS = ['GK','CB','RB','LB','CM','DM','AM','LW','RW','ST','CF','MF'];

const COACHES = [
  'L. Enrique','J. Nagelsmann','D. Southgate','R. Martínez','T. Tuchel',
  'Z. Zidane','C. Ancelotti','A. Conte','M. Arteta','E. ten Hag',
  'N. Kovač','H. Flick','F. Conceição','R. Koeman','M. Blanc',
  'H. Renard','A. Beaumelle','W. Rooney','G. Neville','P. Scholes',
  'T. Henry','P. Vieira','B. Jacquet','O. Solskjær','M. Iniesta',
  'D. Beckham','F. Lampard','S. Gerrard','F. Maldini','A. Del Piero',
];

export function getSquad(teamCode: string, seed: number): Squad {
  const hash = teamCode.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = mkRng((seed * 31337 + hash * 127) >>> 0);

  const region = REGION[teamCode] || 'EUW';
  const [firstNames, lastNames] = NAMES[region] || FALLBACK_NAMES;

  const formation = FORMATIONS[Math.floor(rng() * FORMATIONS.length)];

  const usedNames = new Set<string>();
  function genName(): string {
    for (let attempt = 0; attempt < 40; attempt++) {
      const first = pickFrom(firstNames, rng);
      const last = pickFrom(lastNames, rng);
      const name = first[0] + '. ' + last;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
    // If we can't find a unique "initial" name, use full first name
    const first = pickFrom(firstNames, rng);
    const last = pickFrom(lastNames, rng);
    return first + ' ' + last;
  }

  const usedNos = new Set<number>();
  function assignNo(isGK: boolean): number {
    if (isGK && !usedNos.has(1)) {
      usedNos.add(1);
      return 1;
    }
    for (let attempt = 0; attempt < 50; attempt++) {
      const n = 2 + Math.floor(rng() * 22);
      if (!usedNos.has(n)) {
        usedNos.add(n);
        return n;
      }
    }
    for (let n = 2; n <= 99; n++) {
      if (!usedNos.has(n)) {
        usedNos.add(n);
        return n;
      }
    }
    return 99;
  }

  const players: Player[] = [];

  // Captain is typically a senior outfield player (index 1–4 = defenders)
  const captainIdx = 1 + Math.floor(rng() * 4);

  for (let i = 0; i < 11; i++) {
    const pos = formation[i];
    players.push({
      no: assignNo(pos === 'GK'),
      name: genName(),
      pos,
      captain: i === captainIdx ? true : undefined,
      starting: true,
    });
  }

  // 12 substitutes
  for (let i = 0; i < 12; i++) {
    const pos = SUB_POSITIONS[i % SUB_POSITIONS.length];
    players.push({
      no: assignNo(pos === 'GK'),
      name: genName(),
      pos,
      starting: false,
    });
  }

  const coach = COACHES[Math.floor(rng() * COACHES.length)];

  return { code: teamCode, coach, players };
}
