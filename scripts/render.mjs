// Draws every image the profile README shows, in a light and a dark cut.
// Reads the numbers from the GitHub GraphQL API. No dependencies: Node 20+.
//
//   GH_TOKEN=$(gh auth token) node scripts/render.mjs
//
// Colours, type and the mark's geometry come from the ilien brand kit
// (brand.config.ts). Change them there first, then here.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const asset = (name) => readFileSync(new URL(`assets/${name}`, here));
const b64 = (name) => asset(name).toString('base64');
const out = new URL('../assets/', here);

const LOGIN = process.env.PROFILE_LOGIN || 'ilien-dev';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

const OR = '#F76B15';
const INK = '#141414';
const THEMES = {
  dark: {
    card: '#141414', line: '#4E4E4D', fg: '#F4F4F3', q: '#ABABA9', well: '#232322', mid: '#8A8A88',
    stack: ['#2C2C2B', '#4E4E4D', '#8A8A88'], rest: '#2C2C2B',
    react: '#61DAFB', ts: '#3178C6', rust: '#DEA584', py: '#FFD43B', java: '#F89820',
  },
  light: {
    card: '#F4F4F3', line: '#C8C8C6', fg: '#141414', q: '#5E5E5E', well: '#E6E6E4', mid: '#ABABA9',
    stack: ['#DCDCDA', '#ABABA9', '#6A6A68'], rest: '#DCDCDA',
    react: '#087EA4', ts: '#3178C6', rust: '#B7410E', py: '#D9A400', java: '#E76F00',
  },
};

const MOTH = 'M120 70L192 58L188 100L160 108L168 122L142 120L120 104ZM80 70L8 58L12 100L40 108L32 122L58 120L80 104ZM120 120L156 131L163 159L143 152L136 172L120 150ZM80 120L44 131L37 159L57 152L64 172L80 150ZM100 54L115 70L113 104L107 158L100 172L93 158L87 104L85 70ZM104.47 50L123 28L142.5 20L146 28.5L128.5 35.5L111.04 57ZM95.53 50L77 28L57.5 20L54 28.5L71.5 35.5L88.96 57Z';
const WORDMARK = 'M11 72V160M57 22V160M103 72V160M140 116H216V92L196 72H160L140 92V140L160 160H196L216 140M242 72V160M242 96L262 72H298L318 96V160';
const TOOL_PATHS = JSON.parse(asset('tools.json'));

const ICON = {
  terminal: '<path d="M4 17l6-5-6-5M12 19h8"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
  pr: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v7M18 15.5V9a3 3 0 0 0-3-3h-3"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
};

const FONT = {
  sans: `@font-face{font-family:G;font-weight:100 900;src:url(data:font/woff2;base64,${b64('geist.woff2')}) format('woff2')}`,
  mono: `@font-face{font-family:GM;font-weight:100 900;src:url(data:font/woff2;base64,${b64('geist-mono.woff2')}) format('woff2')}`,
};
const PHOTO = `data:image/jpeg;base64,${b64('photo.jpg')}`;

const r1 = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const num = (n) => n.toLocaleString('en-US');
const MONO_W = 7.2; // Geist Mono advance at 12px

function icon(name, x, y, size, stroke) {
  return `<g transform="translate(${x} ${y}) scale(${r1((size / 24) * 1000) / 1000})" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</g>`;
}

function label(t, name, x, y, text) {
  return `${icon(name, x, y, 14, t.q)}<text class="l" x="${x + 22}" y="${y + 11}">${esc(text.toUpperCase())}</text>`;
}

function frame(w, h, alt, t, css, body, { card = true, fonts = ['sans', 'mono'], rx = 6 } = {}) {
  const base =
    `text{font-family:G,system-ui,sans-serif;fill:${t.fg}}` +
    `.m{font-family:GM,ui-monospace,monospace;font-size:12px;fill:${t.q}}` +
    `.l{font-size:11px;letter-spacing:.66px;fill:${t.q}}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}">` +
    `<style>${fonts.map((f) => FONT[f]).join('')}${base}${css}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>` +
    `<defs><clipPath id="c"><rect width="${w}" height="${h}" rx="${rx}"/></clipPath></defs>` +
    (card ? `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${rx - 0.5}" fill="${t.card}" stroke="${t.line}"/>` : '') +
    `<g clip-path="url(#c)">${body}</g></svg>`
  );
}

const EYES = '@keyframes e{0%,100%{opacity:1}50%{opacity:.25}}.e{animation:e 1.6s ease-in-out infinite}';

/* ------------------------------------------------------------------ banner */

function banner(t) {
  const W = 896, H = 324;
  const words = ['React', 'TypeScript', 'Rust', 'Python', 'Java', 'Building to find out'];
  const slot = (w) => r1(w.length * 8.4);
  const period = words.reduce((a, w) => a + slot(w) + 42, 0);
  let ticker = '';
  for (let k = 0, x = 0; k < Math.ceil(W / period) + 1; k++) {
    for (const w of words) {
      ticker += `<text x="${r1(x)}" y="306" font-size="12" textLength="${slot(w)}">${w.toUpperCase()}</text><circle cx="${r1(x + slot(w) + 21)}" cy="302" r="3" fill="${OR}"/>`;
      x += slot(w) + 42;
    }
  }
  const css =
    EYES +
    '@keyframes l1{0%,100%{transform:translateY(8px)}50%{transform:translateY(22px)}}' +
    '@keyframes l2{0%,100%{transform:translateY(16px)}50%{transform:translateY(44px)}}' +
    '@keyframes l3{0%,100%{transform:translateY(24px)}50%{transform:translateY(66px)}}' +
    '.l1{animation:l1 3.2s ease-in-out infinite}.l2{animation:l2 3.2s ease-in-out -.35s infinite}.l3{animation:l3 3.2s ease-in-out -.7s infinite}' +
    '@keyframes sp{to{transform:rotate(360deg)}}.sp{transform-origin:754px 140px;animation:sp 5s linear infinite}' +
    `@keyframes mq{to{transform:translateX(-${r1(period)}px)}}.mq{animation:mq 26s linear infinite}`;
  const body =
    `<g transform="translate(48 40) scale(.2436) translate(0 -16)"><path fill="none" stroke="${t.fg}" stroke-width="22" d="${WORDMARK}"/><circle class="e" cx="11" cy="40" r="12" fill="${OR}"/><circle class="e" style="animation-delay:-.8s" cx="103" cy="40" r="12" fill="${OR}"/></g>` +
    `<text x="46" y="142" font-size="52" font-weight="500" letter-spacing="-1.56">Building to</text>` +
    `<text x="46" y="197" font-size="52" font-weight="500" letter-spacing="-1.56">find out.</text>` +
    `${icon('terminal', 48, 226, 14, OR)}<text class="l" x="70" y="237">DEVELOPER TOOLS THAT RUN ON YOUR OWN MACHINE</text>` +
    `<g transform="translate(496 52) scale(.66)"><path class="l3" fill="${t.stack[0]}" d="${MOTH}"/><path class="l2" fill="${t.stack[1]}" d="${MOTH}"/><path class="l1" fill="${t.stack[2]}" d="${MOTH}"/><path fill="${t.fg}" d="${MOTH}"/><g class="e" fill="${OR}"><circle cx="52" cy="88" r="9"/><circle cx="148" cy="88" r="9"/></g></g>` +
    `<circle cx="754" cy="140" r="93.5" fill="none" stroke="${t.line}"/>` +
    `<clipPath id="p"><circle cx="754" cy="140" r="84"/></clipPath><image href="${PHOTO}" x="670" y="56" width="168" height="168" clip-path="url(#p)"/>` +
    `<circle class="sp" cx="754" cy="46" r="6" fill="${OR}"/>` +
    `<path d="M0 280.5H${W}" stroke="${t.line}"/><g class="mq">${ticker}</g>`;
  return frame(W, H, 'ilien. Building to find out. Developer tools that run on your own machine.', t, css, body, { fonts: ['sans'] });
}

/* ------------------------------------------------------------------- stack */

function stack(t, data) {
  const W = 896, H = 104, cw = W / 5;
  const tools = [
    { key: 'react', name: 'React', note: 'with TypeScript' },
    { key: 'ts', name: 'TypeScript', lang: 'TypeScript' },
    { key: 'rust', name: 'Rust', lang: 'Rust' },
    { key: 'py', name: 'Python', lang: 'Python' },
    { key: 'java', name: 'Java', lang: 'Java' },
  ];
  const css = '@keyframes h{0%{opacity:0}3%,20%{opacity:1}26%,100%{opacity:0}}.h{opacity:0;animation:h 5s linear infinite}';
  let body = '';
  tools.forEach((tool, i) => {
    const x = r1(i * cw);
    const pct = tool.lang ? data.langs.find((l) => l.name === tool.lang)?.pct ?? 0 : 0;
    const note = tool.note ?? (pct > 0 ? `${pct.toFixed(1)}% of public code` : 'no public repo yet');
    const delay = i === 0 ? 0 : -(5 - i);
    if (i) body += `<path d="M${x + 0.5} 0V${H}" stroke="${t.line}"/>`;
    body +=
      `<rect class="h" style="animation-delay:${delay}s" x="${x}" y="0" width="${r1(cw)}" height="4" fill="${t[tool.key]}"/>` +
      `<path transform="translate(${x + 24} 24) scale(.9167)" fill="${t[tool.key]}" d="${TOOL_PATHS[tool.key]}"/>` +
      `<text x="${x + 54}" y="43" font-size="22" font-weight="500" letter-spacing="-.33">${tool.name}</text>` +
      `<text class="m" x="${x + 24}" y="74">${note}</text>`;
  });
  return frame(W, H, 'Stack: React, TypeScript, Rust, Python and Java.', t, css, body);
}

/* ---------------------------------------------------------------- activity */

function activity(t, data) {
  const W = 896, H = 184, cw = W / 4;
  const cells = [
    ['pulse', 'Contributions, 12 months', data.contributions],
    ['commit', 'Commits', data.commits],
    ['pr', 'Pull requests', data.prs],
    ['star', 'Stars', data.stars],
  ];
  const short = { TypeScript: 'TS', JavaScript: 'JS' };
  const tone = { Rust: t.rust, TypeScript: t.ts, Python: t.py, Java: t.java };
  const top = data.langs.slice(0, 3);
  const legend = top.map((l) => `${short[l.name] ?? l.name} ${l.pct.toFixed(1)}`).join(' · ');
  const x0 = 144, x1 = r1(W - 24 - legend.length * MONO_W - 20), bw = x1 - x0;
  let bar = '', x = x0;
  top.forEach((l, i) => {
    const w = r1((bw * l.pct) / 100);
    bar += `<rect x="${r1(x)}" y="152" width="${Math.max(w - 2, 1)}" height="12" fill="${tone[l.name] ?? [t.fg, t.mid, t.q][i]}"/>`;
    x += w;
  });
  bar += `<rect x="${r1(x)}" y="152" width="${Math.max(r1(x1 - x), 0)}" height="12" fill="${t.rest}"/>`;
  const css =
    '@keyframes h{0%{opacity:0}3%,20%{opacity:1}26%,100%{opacity:0}}.h{opacity:0;animation:h 4s linear infinite}' +
    `@keyframes k{to{transform:translateX(${r1(bw - 2)}px)}}.k{animation:k 7s ease-in-out infinite alternate}`;
  let body = '';
  cells.forEach(([ic, text, value], i) => {
    const cx = i * cw;
    if (i) body += `<path d="M${cx + 0.5} 0V132" stroke="${t.line}"/>`;
    body +=
      `<rect class="h" style="animation-delay:${i === 0 ? 0 : -(4 - i)}s" x="${cx}" y="0" width="${cw}" height="4" fill="${OR}"/>` +
      label(t, ic, cx + 24, 24, text) +
      `<text x="${cx + 23}" y="94" font-size="44" font-weight="500" letter-spacing="-1.32">${num(value)}</text>`;
  });
  body +=
    `<path d="M0 132.5H${W}" stroke="${t.line}"/>` +
    label(t, 'code', 24, 151, 'Languages') +
    bar +
    `<rect class="k" x="${x0}" y="148" width="2" height="20" fill="${t.fg}"/>` +
    `<text class="m" x="${W - 24}" y="162" text-anchor="end">${esc(legend)}</text>`;
  const alt = `${num(data.contributions)} contributions in 12 months, ${num(data.commits)} commits, ${num(data.prs)} pull requests, ${num(data.stars)} stars.`;
  return frame(W, H, alt, t, css, body);
}

/* ------------------------------------------------------------------- weeks */

function weeks(t, data) {
  const W = 896, H = 232, n = data.weeks.length;
  const peak = Math.max(...data.weeks.map((w) => w.total), 1);
  const bw = (848 - (n - 1) * 10) / n;
  const peakText = `peak ${num(peak)}`;
  const cycle = 4.8;
  let css =
    `@keyframes b{0%,6%{fill:${OR}}30%,92%{fill:${t.fg}}100%{fill:${OR}}}.b{fill:${t.fg};animation:b ${cycle}s linear infinite}` +
    '@keyframes v{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.45);opacity:.5}}';
  const dotX = r1(W - 24 - peakText.length * MONO_W - 14);
  css += `.v{transform-origin:${dotX}px 31px;animation:v 1.4s ease-in-out infinite}`;
  let bars = '';
  data.weeks.forEach((w, i) => {
    const h = Math.max(Math.round((w.total / peak) * 120), 2);
    bars += `<rect class="b" style="animation-delay:${r1(-cycle + (i * cycle) / n)}s" x="${r1(24 + i * (bw + 10))}" y="${176 - h}" width="${r1(bw)}" height="${h}"/>`;
  });
  const body =
    label(t, 'chart', 24, 24, `Contributions per week, last ${n} weeks`) +
    `<circle class="v" cx="${dotX}" cy="31" r="4" fill="${OR}"/><text class="m" x="${W - 24}" y="35" text-anchor="end">${peakText}</text>` +
    bars +
    `<path d="M24 176.5H872" stroke="${t.line}"/>` +
    `<text class="m" x="24" y="202">${data.weeks[0].label}</text><text class="m" x="872" y="202" text-anchor="end">${data.weeks[n - 1].label}</text>`;
  return frame(W, H, `Contributions per week over the last ${n} weeks. The peak week had ${num(peak)}.`, t, css, body);
}

/* ------------------------------------------------------------------- hours */

function hours(t) {
  const W = 896, H = 252, x0 = 218, tw = 650;
  const at = (h) => r1(x0 + (h / 24) * tw);
  // Start hour of each city's 9-to-17 day, in Mexico City time, on summer time.
  const rows = [
    ['Mexico City', 'me, UTC−6', null],
    ['San Francisco', '9 to 17 local', 10],
    ['New York', '9 to 17 local', 7],
    ['Madrid', '9 to 17 local', 1],
  ];
  const css = `@keyframes n{to{transform:translateX(${tw}px)}}.n{animation:n 12s linear infinite}`;
  let body = '';
  rows.forEach(([city, note, start], i) => {
    const y = 24 + i * 48;
    body +=
      `<text x="28" y="${y + 15}" font-size="15" font-weight="500">${city}</text><text class="m" x="28" y="${y + 33}">${note}</text>` +
      `<rect x="${x0}" y="${y}" width="${tw}" height="38" fill="${t.well}"/>`;
    if (start === null) {
      body +=
        `<rect x="${at(6)}" y="${y}" width="${r1(at(23) - at(6))}" height="38" fill="${OR}"/>` +
        icon('clock', at(6) + 12, y + 12, 14, INK) +
        `<text class="m" style="fill:${INK}" x="${at(6) + 34}" y="${y + 23}">06:00 to 23:00, remote</text>`;
    } else {
      body += `<rect x="${at(start)}" y="${y + 8}" width="${r1(at(start + 8) - at(start))}" height="22" fill="${t.mid}"/>`;
    }
  });
  ['00', '06', '12', '18', '24'].forEach((h, i) => {
    const anchor = i === 0 ? 'start' : i === 4 ? 'end' : 'middle';
    body += `<text class="m" x="${at(i * 6)}" y="230" text-anchor="${anchor}">${h}</text>`;
  });
  body += `<rect class="n" x="${x0}" y="24" width="2" height="182" fill="${t.fg}"/>`;
  const alt = 'Available 6:00 to 23:00 Mexico City time: the workday in San Francisco and New York, and the Madrid afternoon.';
  return frame(W, H, alt, t, css, body);
}

/* ------------------------------------------------------------ small pieces */

function pill(t, name, text) {
  // No font metrics here, so the width is an estimate by glyph class at 14px.
  const glyph = (ch) => ('il.tfj'.includes(ch) ? 3.8 : ch === '@' ? 12.5 : ch >= 'A' && ch <= 'Z' ? 9 : 7.9);
  const tw = r1([...text].reduce((a, ch) => a + glyph(ch), 0)), W = Math.round(16 + 16 + 8 + tw + 16), H = 36;
  const body =
    `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="${t.card}" stroke="${t.line}"/>` +
    icon(name, 16, 10, 16, OR) +
    `<text x="40" y="23" font-size="14">${esc(text)}</text>`;
  return frame(W, H, text, t, '', body, { card: false, fonts: ['sans'], rx: 18 });
}

function mark(t) {
  const css = EYES + '@keyframes f{0%,100%{transform:translateY(-4px)}50%{transform:translateY(4px)}}.f{animation:f 2.8s ease-in-out infinite}';
  const body = `<g class="f"><g transform="translate(0 4) scale(.22)"><path fill="${t.fg}" d="${MOTH}"/><g class="e" fill="${OR}"><circle cx="52" cy="88" r="9"/><circle cx="148" cy="88" r="9"/></g></g></g>`;
  return frame(44, 52, 'The ilien moth', t, css, body, { card: false, fonts: [], rx: 0 });
}

/* -------------------------------------------------------------------- data */

async function load() {
  if (!TOKEN) throw new Error('Set GH_TOKEN or GITHUB_TOKEN.');
  const query = `{user(login:"${LOGIN}"){
    contributionsCollection{totalCommitContributions totalPullRequestContributions
      contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}
    repositories(first:100,ownerAffiliations:OWNER,privacy:PUBLIC,isFork:false){nodes{stargazerCount
      languages(first:20,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${TOKEN}`, 'content-type': 'application/json', 'user-agent': 'profile-readme' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  const user = json.data.user;
  const cc = user.contributionsCollection;

  const bytes = new Map();
  let stars = 0;
  for (const repo of user.repositories.nodes) {
    stars += repo.stargazerCount;
    for (const e of repo.languages.edges) bytes.set(e.node.name, (bytes.get(e.node.name) ?? 0) + e.size);
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
  const langs = [...bytes].map(([name, size]) => ({ name, pct: (size * 100) / total })).sort((a, b) => b.pct - a.pct);

  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekList = cc.contributionCalendar.weeks.slice(-12).map((w) => {
    const [, m, d] = w.contributionDays[0].date.split('-').map(Number);
    return { total: w.contributionDays.reduce((a, day) => a + day.contributionCount, 0), label: `${month[m - 1]} ${d}` };
  });

  return {
    contributions: cc.contributionCalendar.totalContributions,
    commits: cc.totalCommitContributions,
    prs: cc.totalPullRequestContributions,
    stars,
    langs,
    weeks: weekList,
  };
}

/* -------------------------------------------------------------------- main */

const data = await load();
mkdirSync(out, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  const files = {
    banner: banner(t),
    stack: stack(t, data),
    activity: activity(t, data),
    weeks: weeks(t, data),
    hours: hours(t),
    mail: pill(t, 'mail', 'contact@ilien.dev'),
    linkedin: pill(t, 'work', 'LinkedIn'),
    site: pill(t, 'globe', 'ilien.dev'),
    mark: mark(t),
  };
  for (const [file, svg] of Object.entries(files)) writeFileSync(new URL(`${file}-${name}.svg`, out), svg);
}
console.log(JSON.stringify({ ...data, langs: data.langs.slice(0, 5) }));
