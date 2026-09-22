/*
 * Generative art for the "Bright Modern Learning" design: course covers,
 * mosaic tiles, category swatches, expert monograms and small avatars.
 *
 * Ported from the public website's src/lib/art.ts, so a course drawn here is
 * the same drawing a visitor sees on trainings.aztu.edu.az. Keep the two in
 * step. Dashboard-only additions: the neutral `brand` family (M.brand, the
 * shield/spark/compass tiles, brandVariant, tileMotif) and the `term*` classes on the terminal
 * cover, which only re-map at night.
 *
 * Pure functions that return SVG markup, with no dependencies. Shapes paint
 * only with role classes (f100, s700, fg…) defined in src/index.css, which
 * resolve through the category hue engine — so one drawing re-themes for every
 * category and for night mode. Render the markup with
 * <Svg> from @shared/components/bright.
 *
 * Deterministic: the seed is an FNV-1a hash of the course id or slug, so a
 * course looks the same on every page and on every visit. The only
 * caller-supplied text that reaches the markup is a person's initials, and it
 * is escaped.
 */

/**
 * The eight subject families the art (and the hue engine) knows about, plus
 * `brand`: the dashboard-only neutral family for a category that matches none
 * of them (and for no category at all). It draws AzTU's own shapes — shield,
 * rings, a spark — so an unknown subject never borrows another discipline's
 * glyph (the website falls back to the IT drawing; every SMOKE category here
 * then read as "Information Technology").
 */
export type ArtKind = "it" | "data" | "eng" | "biz" | "res" | "build" | "trans" | "energy" | "brand";

type Motif = (r: () => number, label: string) => string;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/* deterministic PRNG from a numeric seed */
function rng(seed: number): () => number {
  let t = (seed >>> 0) + 0x9e3779b9;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
/* FNV-1a: course id / slug -> seed */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];

function gridPath(w: number, h: number, step: number): string {
  let d = '';
  for (let x = step; x < w; x += step) d += `M${x} 0V${h}`;
  for (let y = step; y < h; y += step) d += `M0 ${y}H${w}`;
  return `<path class="grid" d="${d}"/>`;
}
/* engineering-drawing dimension line with end ticks and a mono label */
function dimH(x1: number, x2: number, y: number, label: string): string {
  const mid = (x1 + x2) / 2;
  return `<path class="dimline" d="M${x1} ${y}H${x2}M${x1} ${y - 5}V${y + 5}M${x2} ${y - 5}V${y + 5}"/>` +
    `<text class="dim" x="${mid}" y="${y - 8}" text-anchor="middle">${label}</text>`;
}
function dimV(x: number, y1: number, y2: number, label: string): string {
  const mid = (y1 + y2) / 2, left = x > 240;
  return `<path class="dimline" d="M${x} ${y1}V${y2}M${x - 5} ${y1}H${x + 5}M${x - 5} ${y2}H${x + 5}"/>` +
    `<text class="dim" x="${left ? x - 9 : x + 9}" y="${mid + 4}" text-anchor="${left ? 'end' : 'start'}">${label}</text>`;
}
const cross = (x: number, y: number, s = 7) => `<path class="dimline" d="M${x - s} ${y}H${x + s}M${x} ${y - s}V${y + s}"/>`;

const LABELS: Record<ArtKind, string[]> = {
  it: ['&lt;/&gt;', '0x2F', 'λ → ƒ'],
  data: ['σ = 0.82', 'n = 128', 'R² 0.94'],
  eng: ['Ø 112', 'R 56', '45°'],
  biz: ['Q1 → Q4', '+12%', 'ROI'],
  res: ['p &lt; 0.05', '[1] [2]', 'H₀'],
  build: ['1:50', '±0.00', 'R 40'],
  trans: ['A → B', '12 km', 'ETA'],
  energy: ['220 V', 'kWh', '50 Hz'],
  brand: ['№ 01', '1 : 1', 'Ø 64'],
};

/* ---------- cover motifs: 320 x 200 ---------- */
const M: Partial<Record<ArtKind, Motif[]>> = {};

M.it = [
  function window(_r: () => number, L: string): string {
    return `<g class="pa"><circle cx="92" cy="104" r="66" class="f300"/></g>
    <g class="pb">
      <rect x="132" y="38" width="160" height="120" rx="18" class="f0"/>
      <circle cx="152" cy="58" r="4.5" class="f300"/><circle cx="166" cy="58" r="4.5" class="f300"/><circle cx="180" cy="58" r="4.5" class="fg"/>
      <rect x="152" y="82" width="62" height="9" rx="4.5" class="f500"/><rect x="222" y="82" width="48" height="9" rx="4.5" class="f200"/>
      <rect x="168" y="100" width="90" height="9" rx="4.5" class="f300"/>
      <rect x="168" y="118" width="50" height="9" rx="4.5" class="f700"/><rect x="226" y="118" width="22" height="9" rx="4.5" class="f200"/>
      <rect x="152" y="136" width="96" height="9" rx="4.5" class="f200"/>
    </g>
    <path d="M80 76 L52 104 L80 132" class="s900 rnd" stroke-width="12" fill="none"/>
    ${dimH(26, 158, 184, L)}`;
  },
  function stairs(_r: () => number, L: string): string {
    let sq = '';
    const fills = ['f500', 'f300', 'f700', 'f0', 'f500', 'f200'];
    for (let i = 0; i < 5; i++) for (let j = 0; j <= i; j++) {
      const cls = (i === 4 && j === 4) ? 'fg' : fills[(i + j * 2) % fills.length];
      sq += `<rect x="${34 + i * 30}" y="${146 - j * 30}" width="24" height="24" rx="6" class="${cls}"/>`;
    }
    return `<g class="pa"><circle cx="236" cy="78" r="70" class="f200"/></g>
    <g class="pb">${sq}</g>
    <path d="M226 74 L262 100 L226 126" class="s900 rnd" stroke-width="12" fill="none"/>
    <rect x="270" y="118" width="28" height="9" rx="4.5" class="fg"/>
    ${dimV(300, 30, 96, L)}`;
  },
  function terminal(_r: () => number, L: string): string {
    return `<g class="pa"><path d="M320 0V96A96 96 0 0 1 224 0Z" class="f300"/><circle cx="268" cy="156" r="34" class="f200"/></g>
    <g class="pb">
      <rect x="34" y="40" width="206" height="124" rx="18" class="f900 term"/>
      <path d="M54 72 L66 80 L54 88" class="s300 term-s rnd" stroke-width="4" fill="none"/>
      <rect x="76" y="76" width="70" height="8" rx="4" class="f300 term-f"/>
      <rect x="54" y="98" width="120" height="8" rx="4" class="f500"/>
      <rect x="54" y="116" width="84" height="8" rx="4" class="f300 term-f" opacity=".7"/>
      <path d="M54 136 L66 144 L54 152" class="s300 term-s rnd" stroke-width="4" fill="none"/>
      <rect x="74" y="138" width="16" height="12" rx="3" class="fg"/>
    </g>
    ${cross(268, 156)}
    <text class="dim" x="248" y="36">${L}</text>`;
  },
];

M.data = [
  function scatter(r: () => number, L: string): string {
    let pts = '';
    for (let i = 0; i < 17; i++) {
      const x = 56 + i * 14 + (r() - .5) * 10;
      const y = 150 - (x - 50) * 0.38 + (r() - .5) * 46;
      const rad = 4 + r() * 5;
      const cls = i === 12 ? 'fg' : (r() > .55 ? 'f700' : (r() > .4 ? 'f0' : 'f500'));
      pts += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" class="${cls}"/>`;
    }
    return `<g class="pa"><circle cx="206" cy="92" r="82" class="f200"/></g>
    <path d="M40 166H292M40 166V34" class="s700" stroke-width="2" fill="none" opacity=".7"/>
    <g class="pb">${pts}</g>
    <path d="M50 160 L294 54" class="s900 rnd" stroke-width="3.5" fill="none"/>
    <text class="dim" x="250" y="186">${L}</text>`;
  },
  function network(_r: () => number, L: string): string {
    const cols: [number, number][] = [[70, 3], [160, 4], [250, 2]];
    const nodes = cols.map(([x, n]) => Array.from({ length: n }, (_, i) => [x, 100 + (i - (n - 1) / 2) * 38]));
    let lines = '';
    for (let c = 0; c < 2; c++) for (const a of nodes[c]) for (const b of nodes[c + 1])
      lines += `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
    let dots = '', k = 0;
    nodes.flat().forEach(([x, y]) => {
      const cls = k === 5 ? 'fg' : (k % 3 === 0 ? 'f500' : 'f0');
      dots += `<circle cx="${x}" cy="${y}" r="13" class="${cls} s700" stroke-width="3"/>`; k++;
    });
    return `<g class="pa"><path d="M0 200V70A130 130 0 0 1 130 200Z" class="f200"/></g>
    <path d="${lines}" class="s300" stroke-width="2.5" fill="none"/>
    <g class="pb">${dots}</g>
    ${dimH(222, 296, 34, L)}`;
  },
  function radial(_r: () => number, L: string): string {
    const cx = 108, cy = 108;
    const arc = (rad: number, frac: number) => {
      const a = frac * Math.PI * 2 - Math.PI / 2;
      const x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a);
      return `M${cx} ${cy - rad}A${rad} ${rad} 0 ${frac > .5 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
    };
    let bars = '';
    [44, 70, 58, 96, 80].forEach((h, i) => bars += `<rect x="${206 + i * 20}" y="${166 - h}" width="12" height="${h}" rx="6" class="${i === 3 ? 'f700' : 'f300'}"/>`);
    return `<g class="pa"><circle cx="${cx}" cy="${cy}" r="92" class="f50" opacity=".7"/></g>
    <g class="pc" style="--ox:${cx}px;--oy:${cy}px">
      <circle cx="${cx}" cy="${cy}" r="72" class="s200 fnone" stroke-width="14"/>
      <circle cx="${cx}" cy="${cy}" r="48" class="s200 fnone" stroke-width="14"/>
      <path d="${arc(72, .72)}" class="s500 rnd fnone" stroke-width="14"/>
      <path d="${arc(48, .46)}" class="s700 rnd fnone" stroke-width="14"/>
      <circle cx="${cx}" cy="${cy}" r="18" class="fg"/>
    </g>
    <g class="pb">${bars}</g>
    ${dimH(202, 298, 186, L)}`;
  },
];

M.eng = [
  function gear(_r: () => number, L: string): string {
    const g = (cx: number, cy: number, R: number, n: number, tw: number, th: number, cls: string, hole: number) => {
      let t = '';
      for (let i = 0; i < n; i++) t += `<rect x="${-tw / 2}" y="${-R - th + 4}" width="${tw}" height="${th}" rx="4" transform="rotate(${(360 / n) * i})" class="${cls}"/>`;
      return `<g transform="translate(${cx} ${cy})">${t}<circle r="${R}" class="${cls}"/><circle r="${hole}" class="f100"/></g>`;
    };
    return `<circle cx="118" cy="102" r="86" class="s700 fnone" stroke-width="1.2" stroke-dasharray="3 6" opacity=".6"/>
    <g class="pc" style="--ox:118px;--oy:102px">${g(118, 102, 52, 10, 20, 20, 'f500', 20)}</g>
    <g class="pb">${g(236, 64, 26, 8, 12, 12, 'f300', 9)}<circle cx="236" cy="64" r="4" class="fg"/></g>
    ${cross(118, 102, 12)}
    ${dimV(292, 110, 190, L)}`;
  },
  function drafting(_r: () => number, L: string): string {
    return `<g class="pa"><polygon points="152,172 296,172 296,36" class="f300"/><polygon points="198,158 282,158 282,78" class="f100"/></g>
    <g class="pb">
      <circle cx="104" cy="92" r="58" class="f0"/>
      <circle cx="104" cy="92" r="38" class="s700 fnone" stroke-width="2.5"/>
      <circle cx="104" cy="92" r="9" class="f700"/>
      <circle cx="146" cy="52" r="7" class="fg"/>
    </g>
    <path class="dimline" d="M104 18V168M28 92H182" stroke-dasharray="6 5"/>
    ${dimH(46, 162, 186, L)}`;
  },
];

M.biz = [
  function bars(_r: () => number, L: string): string {
    const hs = [40, 64, 54, 94, 124];
    const fills = ['f300', 'f300', 'f500', 'f500', 'f700'];
    let b = '';
    const pts: number[][] = [];
    hs.forEach((h, i) => { const x = 48 + i * 46; b += `<rect x="${x}" y="${166 - h}" width="32" height="${h}" rx="9" class="${fills[i]}"/>`; pts.push([x + 16, 150 - h]); });
    const line = 'M' + pts.map(p => p.join(' ')).join('L');
    return `<g class="pa"><circle cx="252" cy="54" r="64" class="f200"/></g>
    <g class="pb">${b}</g>
    <path d="${line}" class="sg rnd fnone" stroke-width="4"/>
    ${pts.map((p, i) => i === pts.length - 1 ? `<circle cx="${p[0]}" cy="${p[1]}" r="7" class="fg"/>` : '').join('')}
    <path d="M30 166H300" class="s700" stroke-width="1.5" opacity=".7"/>
    <text class="dim" x="34" y="190">${L}</text>`;
  },
  function pie(_r: () => number, L: string): string {
    return `<g class="pa"><rect x="190" y="-30" width="160" height="160" rx="80" class="f200"/></g>
    <g class="pc" style="--ox:112px;--oy:104px">
      <circle cx="112" cy="104" r="66" class="f300"/>
      <path d="M112 104 L112 38 A66 66 0 0 1 174.8 124.4 Z" class="f500"/>
      <path d="M118 108 L181 128 A66 66 0 0 1 140 164 Z" class="f700"/>
      <circle cx="112" cy="104" r="24" class="f100"/>
    </g>
    <g class="pb">
      <rect x="214" y="92" width="14" height="14" rx="4" class="f500"/><rect x="236" y="95" width="62" height="8" rx="4" class="f0"/>
      <rect x="214" y="118" width="14" height="14" rx="4" class="f700"/><rect x="236" y="121" width="44" height="8" rx="4" class="f0"/>
      <rect x="214" y="144" width="14" height="14" rx="4" class="fg"/><rect x="236" y="147" width="54" height="8" rx="4" class="f0"/>
    </g>
    ${dimH(46, 178, 190, L)}`;
  },
];

M.res = [
  function book(_r: () => number, L: string): string {
    let lines = '';
    for (let i = 0; i < 4; i++) {
      lines += `<rect x="${80}" y="${76 + i * 16}" width="${60 - (i % 2) * 16}" height="6" rx="3" class="f200"/>`;
      lines += `<rect x="${176}" y="${76 + i * 16}" width="${56 - (i % 3) * 10}" height="6" rx="3" class="f200"/>`;
    }
    return `<g class="pa"><circle cx="70" cy="56" r="54" class="f300"/></g>
    <g class="pb">
      <path d="M160 58 C130 44 92 44 62 54 V160 C92 150 130 150 160 162 Z" class="f0"/>
      <path d="M160 58 C190 44 228 44 258 54 V160 C228 150 190 150 160 162 Z" class="f0"/>
      <path d="M160 58V162" class="s300" stroke-width="2"/>
      ${lines}
    </g>
    <g class="pc" style="--ox:246px;--oy:128px">
      <circle cx="246" cy="128" r="30" class="f200 s900" stroke-width="9" fill-opacity=".55"/>
      <path d="M268 150 L292 174" class="s900 rnd" stroke-width="12"/>
    </g>
    <text class="dim" x="30" y="186">${L}</text>`;
  },
  function ripples(_r: () => number, L: string): string {
    let papers = '';
    ([[196, 44, -6], [212, 64, 4], [206, 86, -2]] as const).forEach(([x, y, a], i) => {
      papers += `<g transform="rotate(${a} ${x + 44} ${y + 34})"><rect x="${x}" y="${y}" width="88" height="68" rx="10" class="${i === 2 ? 'f0' : 'f200'}"/>` +
        (i === 2 ? `<rect x="${x + 12}" y="${y + 14}" width="50" height="6" rx="3" class="f500"/><rect x="${x + 12}" y="${y + 28}" width="62" height="6" rx="3" class="f200"/><rect x="${x + 12}" y="${y + 42}" width="40" height="6" rx="3" class="f200"/><circle cx="${x + 74}" cy="${y + 52}" r="5" class="fg"/>` : '') + `</g>`;
    });
    return `<circle cx="104" cy="112" r="86" class="s200 fnone" stroke-width="3"/>
    <circle cx="104" cy="112" r="64" class="s300 fnone" stroke-width="3"/>
    <g class="pa"><circle cx="104" cy="112" r="42" class="s500 fnone" stroke-width="3.5"/></g>
    <circle cx="104" cy="112" r="20" class="f700"/>
    <g class="pb">${papers}</g>
    <text class="dim" x="212" y="186">${L}</text>`;
  },
];

M.build = [
  function arches(_r: () => number, L: string): string {
    return `<g class="pa"><circle cx="156" cy="66" r="74" class="f200"/></g>
    <g class="pb">
      <path d="M36 170V104A32 32 0 0 1 100 104V170Z" class="f500"/>
      <path d="M114 170V90A42 42 0 0 1 198 90V170Z" class="f0"/>
      <path d="M136 170V108A20 20 0 0 1 176 108V170Z" class="f300"/>
      <path d="M212 170V116A30 30 0 0 1 272 116V170Z" class="f700"/>
    </g>
    <circle cx="284" cy="46" r="12" class="fg"/>
    <path d="M20 170H300" class="s700" stroke-width="2"/>
    ${dimH(114, 198, 188, L)}`;
  },
  function skyline(_r: () => number, L: string): string {
    let win = '';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) win += `<rect x="${112 + i * 14}" y="${74 + j * 18}" width="8" height="10" rx="2" class="${i === 2 && j === 1 ? 'fg' : 'f0'}"/>`;
    return `<g class="pa"><circle cx="96" cy="70" r="62" class="f200"/></g>
    <g class="pb">
      <rect x="36" y="100" width="56" height="70" rx="6" class="f300"/>
      <rect x="100" y="58" width="62" height="112" rx="6" class="f500"/>${win}
      <rect x="170" y="112" width="42" height="58" rx="6" class="f700"/>
      <path d="M170 112 L191 94 L212 112Z" class="f700"/>
      <rect x="220" y="88" width="36" height="82" rx="6" class="f0"/>
    </g>
    <path d="M278 170V34M244 34H310M292 34V64M252 34V48" class="s900 rnd fnone" stroke-width="4"/>
    <rect x="286" y="64" width="12" height="10" rx="2" class="fg"/>
    <path d="M20 170H300" class="s700" stroke-width="2"/>
    ${dimH(36, 162, 188, L)}`;
  },
];

M.trans = [
  function route(_r: () => number, L: string): string {
    return `<g class="pa"><circle cx="72" cy="160" r="84" class="f200"/></g>
    <path d="M40 150 C 96 150, 92 62, 150 62 S 214 150, 272 74" class="s500 rnd fnone" stroke-width="16"/>
    <path d="M40 150 C 96 150, 92 62, 150 62 S 214 150, 272 74" class="s0 fnone" stroke-width="2.5" stroke-dasharray="7 9"/>
    <g class="pb">
      <circle cx="40" cy="150" r="12" class="f0 s900" stroke-width="4"/>
      <circle cx="150" cy="62" r="9" class="f900"/>
      <path d="M272 78 C260 64 254 56 254 46 A18 18 0 0 1 290 46 C290 56 284 64 272 78Z" class="fg"/>
      <circle cx="272" cy="46" r="6.5" class="f0"/>
    </g>
    ${dimH(170, 300, 186, L)}`;
  },
  function tram(_r: () => number, L: string): string {
    return `<g class="pa"><circle cx="258" cy="46" r="56" class="f200"/></g>
    <path d="M150 58 L136 34 L166 18" class="s900 rnd fnone" stroke-width="3"/>
    <g class="pb">
      <rect x="44" y="58" width="220" height="90" rx="24" class="f500"/>
      <rect x="64" y="76" width="46" height="34" rx="9" class="f0"/><rect x="120" y="76" width="46" height="34" rx="9" class="f0"/><rect x="176" y="76" width="46" height="34" rx="9" class="f0"/>
      <rect x="232" y="76" width="18" height="50" rx="7" class="f300"/>
      <rect x="64" y="122" width="158" height="6" rx="3" class="f700"/>
    </g>
    <circle cx="98" cy="156" r="16" class="f900"/><circle cx="98" cy="156" r="5" class="f0"/>
    <circle cx="210" cy="156" r="16" class="f900"/><circle cx="210" cy="156" r="5" class="f0"/>
    <path d="M16 174H304" class="s700" stroke-width="3"/>
    <path d="M40 174v8M80 174v8M120 174v8M160 174v8M200 174v8M240 174v8M280 174v8" class="s700" stroke-width="2" opacity=".6"/>
    <circle cx="44" cy="40" r="8" class="fg"/>
    <text class="dim" x="232" y="194">${L}</text>`;
  },
];

M.energy = [
  function sun(_r: () => number, L: string): string {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x1 = 108 + Math.cos(a) * 54, y1 = 88 + Math.sin(a) * 54, x2 = 108 + Math.cos(a) * 68, y2 = 88 + Math.sin(a) * 68;
      rays += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    const wave = (y: number, amp: number, ph: number) => { let d = `M0 ${y}`; for (let x = 0; x <= 320; x += 10) d += `L${x} ${(y + Math.sin(x / 26 + ph) * amp).toFixed(1)}`; return d; };
    return `<g class="pc" style="--ox:108px;--oy:88px"><path d="${rays}" class="s500 rnd" stroke-width="7"/></g>
    <circle cx="108" cy="88" r="40" class="f500"/>
    <circle cx="96" cy="76" r="12" class="f300"/>
    <g class="pb"><path d="${wave(152, 8, 0)}" class="s300 rnd fnone" stroke-width="7"/><path d="${wave(174, 8, 1.4)}" class="s700 rnd fnone" stroke-width="7"/></g>
    <circle cx="266" cy="56" r="10" class="fg"/>
    ${dimH(196, 300, 104, L)}`;
  },
  function panel(_r: () => number, L: string): string {
    let g = '';
    for (let i = 1; i < 4; i++) { const t = i / 4; g += `M${70 + 160 * t} 150L${110 + 160 * t} 70`; }
    for (let j = 1; j < 3; j++) { const t = j / 3; g += `M${70 + 40 * t} ${150 - 80 * t}L${230 + 40 * t} ${150 - 80 * t}`; }
    return `<g class="pa"><circle cx="262" cy="46" r="30" class="fg"/><circle cx="262" cy="46" r="48" class="s200 fnone" stroke-width="6"/></g>
    <g class="pb">
      <polygon points="70,150 230,150 270,70 110,70" class="f700"/>
      <path d="${g}" class="s300" stroke-width="3"/>
      <path d="M150 150V176M120 176H180" class="s900 rnd" stroke-width="6"/>
    </g>
    <path d="M40 66 l14 -22 h-10 l8 -18" class="s500 rnd fnone" stroke-width="5"/>
    ${dimH(70, 230, 190, L)}`;
  },
];

/* The neutral family (dashboard only): AzTU's own geometry — a shield, rings
   around a hub, a four-point spark, a compass, a half disc — never a
   discipline's glyph. One drawing per BRAND_TILES entry, in the same order:
   a course's cover and its square thumbnail show the same shape (see
   brandVariant). */
M.brand = [
  function shield(_r: () => number, L: string): string {
    return `<g class="pa"><circle cx="96" cy="100" r="74" class="f200"/></g>
    <circle cx="96" cy="100" r="58" class="s500 fnone" stroke-width="1.5" stroke-dasharray="4 6"/>
    <g class="pb">
      <path d="M96 44 L136 58 V96 C136 124 118 142 96 152 C74 142 56 124 56 96 V58Z" class="f0"/>
      <path d="M96 62 L122 71 V96 C122 114 111 126 96 133 C81 126 70 114 70 96 V71Z" class="f500"/>
      <circle cx="96" cy="98" r="8" class="fg"/>
    </g>
    <path d="M186 64H292M186 92H268M186 120H284" class="s300 rnd" stroke-width="9"/>
    ${dimH(186, 292, 162, L)}`;
  },
  function orbit(_r: () => number, L: string): string {
    let dots = '';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) dots += `<circle cx="${44 + i * 20}" cy="${58 + j * 20}" r="4.5" class="${i === 3 && j === 0 ? 'fg' : ((i + j) % 2 ? 'f500' : 'f300')}"/>`;
    return `<g class="pa"><circle cx="226" cy="100" r="80" class="f200"/></g>
    <g class="pc" style="--ox:226px;--oy:100px">
      <circle cx="226" cy="100" r="56" class="s500 fnone" stroke-width="10" stroke-dasharray="62 24"/>
      <circle cx="226" cy="100" r="30" class="s300 fnone" stroke-width="10"/>
      <circle cx="226" cy="100" r="11" class="f700"/>
    </g>
    <g class="pb">${dots}</g>
    ${dimH(36, 132, 176, L)}`;
  },
  function spark(_r: () => number, L: string): string {
    return `<g class="pa"><path d="M320 0V120A120 120 0 0 1 200 0Z" class="f200"/></g>
    <g class="pb">
      <path d="M112 30 C118 80 132 94 182 100 C132 106 118 120 112 170 C106 120 92 106 42 100 C92 94 106 80 112 30Z" class="f700"/>
      <circle cx="112" cy="100" r="14" class="f0"/>
      <rect x="214" y="118" width="30" height="30" rx="9" class="f300"/><rect x="252" y="118" width="30" height="30" rx="9" class="f0"/>
      <rect x="252" y="80" width="30" height="30" rx="9" class="f500"/>
    </g>
    <circle cx="274" cy="42" r="9" class="fg"/>
    ${dimV(300, 118, 186, L)}`;
  },
  function compass(_r: () => number, L: string): string {
    return `<g class="pa"><circle cx="226" cy="100" r="80" class="f200"/></g>
    <g class="pb">
      <circle cx="226" cy="100" r="56" class="f0 s300" stroke-width="8"/>
      <g transform="rotate(35 226 100)"><path d="M226 52 L240 100 L226 148 L212 100Z" class="f500"/><path d="M226 52 L240 100 L212 100Z" class="f700"/></g>
      <circle cx="226" cy="100" r="8" class="fg"/>
    </g>
    <path d="M36 64H122M36 92H104M36 120H114" class="s300 rnd" stroke-width="9"/>
    ${dimH(36, 132, 162, L)}`;
  },
  function half(_r: () => number, L: string): string {
    return `<g class="pa"><circle cx="72" cy="62" r="50" class="f200"/></g>
    <g class="pb">
      <path d="M120 134A90 90 0 0 1 300 134Z" class="f300"/>
      <rect x="120" y="146" width="180" height="20" rx="10" class="f700"/>
      <circle cx="210" cy="134" r="15" class="fg"/>
    </g>
    <rect x="30" y="128" width="30" height="30" rx="9" class="f0"/><rect x="68" y="128" width="30" height="30" rx="9" class="f500"/>
    ${dimH(120, 300, 190, L)}`;
  },
];

/* seed -> {variant, label}; `variant` may be forced for previews */
function coverSvg(cat: ArtKind, seed: number, opts: { variant?: number } = {}): string {
  const r = rng(seed);
  const list = M[cat] ?? M.it!;
  const v = opts.variant != null ? opts.variant % list.length : Math.floor(r() * list.length);
  const L = pick(r, LABELS[cat] || LABELS.it);
  const body = list[v](r, L);
  return `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="320" height="200" class="f100"/>${gridPath(320, 200, 20)}${body}</svg>`;
}

/* ---------- mosaic tiles: 100 x 100, background comes from the tile ---------- */
const T: Record<string, () => string> = {
  quarter: () => `<path d="M0 100V8A92 92 0 0 1 92 100Z" class="f500"/><circle cx="72" cy="28" r="10" class="f0"/>`,
  half: () => `<path d="M8 56A42 42 0 0 1 92 56Z" class="f300"/><rect x="8" y="64" width="84" height="12" rx="6" class="f700"/><circle cx="50" cy="56" r="9" class="fg"/>`,
  rings: () => `<g class="spin"><circle cx="50" cy="50" r="38" class="s500 fnone" stroke-width="6" stroke-dasharray="44 16"/></g><circle cx="50" cy="50" r="22" class="s300 fnone" stroke-width="6"/><circle cx="50" cy="50" r="8" class="f700"/>`,
  dots: () => { let d = ''; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) d += `<circle cx="${20 + i * 20}" cy="${20 + j * 20}" r="${(i + j) % 3 === 0 ? 6 : 4.5}" class="${i === 2 && j === 1 ? 'fg' : ((i + j) % 2 ? 'f500' : 'f300')}"/>`; return d; },
  arch: () => `<path d="M22 100V52A28 28 0 0 1 78 52V100Z" class="f0"/><path d="M36 100V60A14 14 0 0 1 64 60V100Z" class="f500"/>`,
  stairs: () => `<path d="M0 100V76H24V52H48V28H72V4H100V100Z" class="f500"/><path d="M0 100V88H36V64H60V40H84V16H100V100Z" class="f300" opacity=".0"/><circle cx="24" cy="30" r="9" class="fg"/>`,
  cross: () => `<circle cx="50" cy="50" r="40" class="s700 fnone" stroke-width="1.5" stroke-dasharray="3 5"/><circle cx="50" cy="50" r="26" class="f0"/><path d="M50 8V92M8 50H92" class="s700" stroke-width="1.5"/><circle cx="50" cy="50" r="6" class="f700"/>`,
  wave: () => { const w = (y: number, ph: number) => { let d = `M0 ${y}`; for (let x = 0; x <= 100; x += 5) d += `L${x} ${(y + Math.sin(x / 9 + ph) * 7).toFixed(1)}`; return d; }; return `<g class="drift"><path d="${w(34, 0)}" class="s300 rnd fnone" stroke-width="6"/><path d="${w(54, 1)}" class="s500 rnd fnone" stroke-width="6"/><path d="${w(74, 2)}" class="s700 rnd fnone" stroke-width="6"/></g>`; },
  star: () => `<path d="M50 10 C54 38 62 46 90 50 C62 54 54 62 50 90 C46 62 38 54 10 50 C38 46 46 38 50 10Z" class="fn"/>`,
  route: () => `<path d="M16 80 C40 80 36 24 62 24 S84 60 84 60" class="s500 rnd fnone" stroke-width="9"/><circle cx="16" cy="80" r="8" class="f0 s900" stroke-width="3"/><circle cx="84" cy="62" r="8" class="fg"/>`,
  bars: () => `<rect x="16" y="54" width="16" height="30" rx="6" class="f300"/><rect x="42" y="38" width="16" height="46" rx="6" class="f500"/><rect x="68" y="18" width="16" height="66" rx="6" class="f700"/>`,
  window: () => `<rect x="12" y="20" width="76" height="60" rx="12" class="f0"/><circle cx="24" cy="31" r="3" class="f300"/><circle cx="33" cy="31" r="3" class="fg"/><path d="M36 48 L28 56 L36 64M64 48 L72 56 L64 64" class="s700 rnd fnone" stroke-width="5"/><path d="M54 45 L46 67" class="s500 rnd" stroke-width="5"/>`,
  book: () => `<path d="M50 30 C38 24 24 24 12 28 V76 C24 72 38 72 50 78Z" class="f0"/><path d="M50 30 C62 24 76 24 88 28 V76 C76 72 62 72 50 78Z" class="f300"/><path d="M50 30V78" class="s700" stroke-width="2"/>`,
  gear: () => { let t = ''; for (let i = 0; i < 8; i++) t += `<rect x="-6" y="-38" width="12" height="14" rx="3" transform="rotate(${i * 45})" class="f500"/>`; return `<g transform="translate(50 50)"><g class="spin">${t}<circle r="28" class="f500"/></g><circle r="11" class="f100"/></g>`; },
  play: () => `<circle cx="50" cy="50" r="34" class="f0"/><path d="M50 16 A34 34 0 1 1 18 62" class="s500 rnd fnone" stroke-width="6"/><path d="M43 37 L63 50 L43 63Z" class="f700"/>`,
  blocks: () => `<rect x="14" y="54" width="32" height="32" rx="8" class="f500"/><rect x="54" y="54" width="32" height="32" rx="8" class="f300"/><rect x="34" y="16" width="32" height="32" rx="8" class="f0"/>`,
  circle: () => `<circle cx="50" cy="50" r="30" class="f300"/><circle cx="50" cy="50" r="14" class="f0"/>`,
  /* dashboard-only tiles for the neutral family */
  shield: () => `<path d="M50 14 L78 24 V50 C78 70 66 82 50 88 C34 82 22 70 22 50 V24Z" class="f0"/><path d="M50 27 L67 33 V50 C67 62 60 70 50 75 C40 70 33 62 33 50 V33Z" class="f500"/><circle cx="50" cy="50" r="5.5" class="fg"/>`,
  spark: () => `<path d="M50 12 C54 40 60 46 88 50 C60 54 54 60 50 88 C46 60 40 54 12 50 C40 46 46 40 50 12Z" class="f700"/><circle cx="50" cy="50" r="7" class="f0"/><circle cx="80" cy="20" r="6" class="fg"/>`,
  compass: () => `<circle cx="50" cy="50" r="34" class="f0 s300" stroke-width="5"/><g transform="rotate(35 50 50)"><path d="M50 20 L59 50 L50 80 L41 50Z" class="f500"/><path d="M50 20 L59 50 L41 50Z" class="f700"/></g><circle cx="50" cy="50" r="5.5" class="fg"/>`,
};
export function tileSvg(kind: string): string {
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${(T[kind] || T.circle)()}</svg>`;
}

/* ---------- category swatch (square, used in mega menu / rails) ---------- */
const SWATCH: Record<ArtKind, string> = { it: 'window', data: 'dots', eng: 'gear', biz: 'bars', res: 'book', build: 'arch', trans: 'route', energy: 'wave', brand: 'shield' };
/**
 * The neutral family's tiles. Picked by seed, so two unmatched categories (or
 * two courses without one) differ from each other — none of these is any
 * discipline's motif. M.brand holds one cover drawing per tile, in this order.
 */
export const BRAND_TILES = ['shield', 'rings', 'spark', 'compass', 'half'] as const;
/**
 * Which neutral shape a seed gets — one choice for both the square tile
 * (tileMotif) and the 16:10 cover (coverArt), so a course without a category
 * shows the same shape as its list thumbnail and as its editor cover. They
 * used to pick separately and a compass thumbnail opened onto a shield cover.
 */
export function brandVariant(seed?: string | null): number {
  return seed ? hash(seed) % BRAND_TILES.length : 0;
}
/** The single motif a family shows on a square: its own, or for `brand` one of BRAND_TILES by seed. */
export function tileMotif(cat: ArtKind, seed?: string | null): string {
  if (cat === 'brand') return BRAND_TILES[brandVariant(seed)];
  return SWATCH[cat] ?? 'circle';
}
export function swatchSvg(cat: ArtKind, seed?: string | null): string { return tileSvg(tileMotif(cat, seed)); }

/* ---------- expert portrait (no photo) 200 x 240 ----------
   Typographic, not a fake silhouette: the initials are set large on the
   expert's primary-category field, with one drafted shape behind them. */
export function monogramSvg(initials: string, seed: number): string {
  initials = esc(initials);
  const r = rng(seed);
  const v = Math.floor(r() * 3);
  let shape;
  if (v === 0) shape = `<circle cx="150" cy="70" r="84" class="f200"/><circle cx="150" cy="70" r="40" class="f300"/>`;
  else if (v === 1) shape = `<path d="M200 0V168A112 112 0 0 1 88 56V0Z" class="f200"/><path d="M200 0V100A56 56 0 0 1 144 44V0Z" class="f300"/>`;
  else shape = `<rect x="96" y="-40" width="140" height="190" rx="70" class="f200"/><circle cx="166" cy="54" r="30" class="f300"/>`;
  const [gx, gy] = ([[150, 70], [36, 44], [166, 54]] as const)[v];
  return `<svg viewBox="0 0 200 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="200" height="240" class="f100"/>
    ${gridPath(200, 240, 20)}
    ${shape}
    <path class="dimline" d="M22 134H112M22 128V140M112 128V140"/>
    <text x="22" y="214" style="font:800 86px var(--f-display);letter-spacing:-.055em" class="f900">${initials}</text>
    <circle cx="${gx}" cy="${gy}" r="9" class="fg"/>
  </svg>`;
}
/* small round avatar version (header chips, reviews, enrol card) */
export function avatarSvg(initials: string): string {
  initials = esc(initials);
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect width="48" height="48" class="f200"/><circle cx="40" cy="6" r="16" class="f300"/>
    <text x="24" y="31" text-anchor="middle" style="font:800 18px var(--f-display);letter-spacing:-.04em" class="f900">${initials}</text></svg>`;
}

/* ---------- location map for in-person courses 400 x 240 ----------
   A drafted city block plan, not a real map: blocks, one avenue, a route
   and the pin. Real address text sits next to it. */
export function mapSvg(seed: number): string {
  const r = rng(seed);
  let blocks = '';
  const xs = [0, 64, 128, 210, 274, 338], ys = [0, 58, 116, 178];
  for (let i = 0; i < xs.length; i++) for (let j = 0; j < ys.length; j++) {
    const w = (xs[i + 1] || 404) - xs[i] - 12, h = (ys[j + 1] || 244) - ys[j] - 12;
    if (w <= 0 || h <= 0) continue;
    const cls = (i === 2 && j === 1) ? 'f300' : (r() > .78 ? 'f200' : 'f0');
    blocks += `<rect x="${xs[i] + 6}" y="${ys[j] + 6}" width="${w}" height="${h}" rx="10" class="${cls}"/>`;
  }
  return `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="400" height="240" class="f100"/>${blocks}
    <path d="M-10 212 L410 150" class="s300" stroke-width="16" fill="none"/>
    <path d="M60 236 C 90 170, 150 170, 170 120" class="s700 rnd fnone" stroke-width="4" stroke-dasharray="2 9"/>
    <circle cx="60" cy="236" r="9" class="f0 s700" stroke-width="3"/>
    <g transform="translate(170 116)"><circle r="30" class="f500" opacity=".25"/><path d="M0 4 C-12 -10 -18 -18 -18 -28 A18 18 0 0 1 18 -28 C18 -18 12 -10 0 4Z" class="fn"/><circle cy="-28" r="6.5" class="fg"/></g>
  </svg>`;
}

/* ---------- drafting protractor (closing call to action) 480 x 300 ---------- */
export function protractorSvg(): string {
  let ticks = '';
  for (let a = 0; a <= 180; a += 5) {
    const rad = Math.PI - (a * Math.PI) / 180, long = a % 30 === 0;
    const r1 = 196, r2 = long ? 176 : 186;
    ticks += `M${(240 + Math.cos(rad) * r1).toFixed(1)} ${(300 - Math.sin(rad) * r1).toFixed(1)}L${(240 + Math.cos(rad) * r2).toFixed(1)} ${(300 - Math.sin(rad) * r2).toFixed(1)}`;
  }
  const arm = (deg: number, len: number) => { const rad = Math.PI - deg * Math.PI / 180; return [240 + Math.cos(rad) * len, 300 - Math.sin(rad) * len]; };
  const [ax, ay] = arm(62, 232);
  return `<svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
    <path d="M20 300A220 220 0 0 1 460 300Z" class="f200"/>
    <path d="M64 300A176 176 0 0 1 416 300Z" class="f100"/>
    <path d="${ticks}" class="s700" stroke-width="2" opacity=".55"/>
    <path d="M112 300A128 128 0 0 1 368 300" class="s500 fnone" stroke-width="22"/>
    <path d="M112 300A128 128 0 0 1 ${arm(62, 128).map(n => n.toFixed(1)).join(' ')}" class="sn fnone" stroke-width="22"/>
    <path d="M240 300L${ax.toFixed(1)} ${ay.toFixed(1)}" class="s900" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="11" class="fg"/>
    <circle cx="240" cy="300" r="62" class="fn"/>
  </svg>`;
}

/**
 * A 320×200 course cover in the category's colours. The neutral family draws
 * the shape brandVariant picks for the seed (the same one its tile shows).
 */
export function coverArt(kind: ArtKind, seedSource: string, variant?: number): string {
  const v = variant ?? (kind === 'brand' ? brandVariant(seedSource) : undefined);
  return coverSvg(kind, hash(seedSource), v == null ? {} : { variant: v });
}
