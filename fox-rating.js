(() => {
const $ = s => document.querySelector(s);
const DAY = 864e5, Q = 173.7178, OPP_RD = 60;
const danR = d => 1400 + 100 * d;
const pct = x => Math.round(x * 100) + '%';
const sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(Math.round(x));
const fmtD = t => { const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate(); };
const fmtT = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const rk = d => d >= 1 ? d + ' 段' : (1 - d) + ' 級';
const WD = ['一', '二', '三', '四', '五', '六', '日'];

/* ── sample data: seeded simulation ── */
let seed = 19;
const R = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = arr => { const x = R(); let a = 0; for (const [v, w] of arr) { a += w; if (x < a) return v; } return arr[arr.length - 1][0]; };
const gauss = () => Math.sqrt(-2 * Math.log(R() || 1e-9)) * Math.cos(2 * Math.PI * R());
const DAYS = 150; let START = new Date(2026, 4, 31).getTime(), END = START + DAYS * DAY;
const ctrl = [[0, 1805], [55, 1850], [74, 1818], [100, 1835], [125, 1890], [150, 2030]];
const trueAt = d => { for (let i = 1; i < ctrl.length; i++) if (d <= ctrl[i][0]) { const [a, ra] = ctrl[i - 1], [b, rb] = ctrl[i]; return ra + (rb - ra) * (d - a) / (b - a); } return ctrl[ctrl.length - 1][1]; };
const TC = [['快棋', .45], ['一般', .4], ['慢棋', .15]], TCM = { 快棋: -55, 一般: 0, 慢棋: 35 }, TCL = { 快棋: 12, 一般: 25, 慢棋: 50 };

function simulate() {
  const games = []; let fox = 4, cnt = 0, sid = 0;
  for (let d = 0; d < DAYS; d++) {
    if (d >= 78 && d <= 93) continue;
    const base = START + d * DAY, wd = new Date(base).getDay(), weekend = wd === 0 || wd === 6;
    if (R() > (weekend ? .8 : .55)) continue;
    const hour = weekend ? pick([[10, .1], [14, .2], [16, .15], [20, .3], [22, .15], [24, .1]]) : pick([[12, .1], [20, .25], [21, .25], [22, .2], [23, .1], [24, .1]]);
    let t = base + hour * 36e5 + Math.floor(R() * 50) * 6e4, k = 0, sl = 0; sid++;
    for (;;) {
      const tc = pick(TC), hr = new Date(t).getHours();
      const oppDan = Math.min(9, Math.max(1, fox + pick([[-2, .06], [-1, .24], [0, .42], [1, .22], [2, .06]])));
      const color = R() < .5 ? 'B' : 'W';
      const eff = trueAt(d) + (color === 'B' ? 22 : -22) + TCM[tc] - (sl >= 2 ? Math.min(140, 50 * (sl - 1)) : 0) - (hr < 3 ? 60 : 0);
      const win = R() < 1 / (1 + 10 ** (-(eff - (danR(oppDan) + gauss() * 40)) / 400));
      const g = { t, oppDan, color, tc, win, fox, sid, prevL: sl };
      g.end = R() < (tc === '快棋' ? (win ? .08 : .3) : tc === '一般' ? (win ? .04 : .1) : .03) ? 'T' : R() < .35 ? 'C' : 'R';
      sl = win ? 0 : sl + 1;
      cnt += win ? 1 : -1;
      if (cnt >= 16 && fox < 9) { fox++; cnt = 0; } else if (cnt <= -16 && fox > 1) { fox--; cnt = 0; }
      g.foxAfter = fox; games.push(g);
      t += (TCL[tc] + 4 + R() * 10) * 6e4; k++;
      if (k >= 9 || R() > (win ? .5 : .74) - k * .04) break;
    }
  }
  return games;
}

/* ── Glicko-2 ── */
function g2(r, rd, sig, or, ord, s, el) {
  const mu = (r - 1500) / Q, phi = rd / Q, muj = (or - 1500) / Q, phj = ord / Q, tau = .3;
  const g = 1 / Math.sqrt(1 + 3 * phj * phj / (Math.PI * Math.PI));
  const E = 1 / (1 + Math.exp(-g * (mu - muj)));
  const v = 1 / (g * g * E * (1 - E)), delta = v * g * (s - E), a = Math.log(sig * sig);
  const f = x => { const ex = Math.exp(x); return ex * (delta * delta - phi * phi - v - ex) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (tau * tau); };
  let A = a, B;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else { let k = 1; while (f(a - k * tau) < 0) k++; B = a - k * tau; }
  let fA = f(A), fB = f(B);
  while (Math.abs(B - A) > 1e-6) { const C = A + (A - B) * fA / (fB - fA), fC = f(C); if (fC * fB <= 0) { A = B; fA = fB; } else fA /= 2; B = C; fB = fC; }
  const ns = Math.min(.04, Math.max(.025, Math.exp(A / 2))), ps = Math.sqrt(phi * phi + ns * ns * el), np = 1 / Math.sqrt(1 / (ps * ps) + 1 / v);
  return { r: 1500 + Q * (mu + np * np * g * (s - E)), rd: Q * np, sig: ns };
}
const expect = (r, rd, or) => { const g = 1 / Math.sqrt(1 + 3 * (OPP_RD / Q) ** 2 / (Math.PI * Math.PI)); return 1 / (1 + Math.exp(-g * (r - or) / Q)); };

let ALL, CUR, META = { sample: true };
function compute(games) {
  ALL = games;
  const f0 = ALL.find(g => g.fox != null), base = f0 ? f0.fox : Math.round(ALL.reduce((a, g) => a + g.oppDan, 0) / ALL.length);
  let lf = base, sid = 0, sl = 0, lt = null;
  ALL.forEach(g => { if (g.fox == null) g.fox = lf; lf = g.fox; if (g.sid == null) { if (lt == null || g.t - lt > 90 * 6e4) { sid++; sl = 0; } g.sid = sid; g.prevL = sl; sl = g.win ? 0 : sl + 1; } lt = g.t; });
  ALL.forEach((g, i) => { if (g.foxAfter == null) g.foxAfter = i < ALL.length - 1 ? ALL[i + 1].fox : g.fox; });
  let r = danR(base), rd = 150, sig = .04, last = null;
  for (const g of ALL) {
    const el = last == null ? 1 : Math.max(.05, (g.t - last) / DAY);
    const before = r; Object.assign(g, { rdPre: rd });
    ({ r, rd, sig } = g2(r, rd, sig, danR(g.oppDan), OPP_RD, g.win ? 1 : 0, el)); rd = Math.min(350, rd);
    Object.assign(g, { r, rd, delta: r - before }); last = g.t;
  }
  let e = danR(base); ALL.forEach((g, i) => { const E = 1 / (1 + 10 ** ((danR(g.oppDan) - e) / 400)), K = i < 30 ? 40 : 20, b = e; e += K * ((g.win ? 1 : 0) - E); g.elo = e; g.eloDelta = e - b; });
  CUR = ALL[ALL.length - 1];
  if (!META.sample) { END = CUR.t + 36e5; START = ALL[0].t - 36e5; }
}
compute(simulate());
const isElo = () => state.sys === 'elo';
const SC = g => isElo() ? g.elo : g.r, DL = g => isElo() ? g.eloDelta : g.delta;
const expectS = or => isElo() ? 1 / (1 + 10 ** ((or - CUR.elo) / 400)) : expect(CUR.r, CUR.rd, or);

const state = { range: '90', axis: 'date', sys: 'elo' };
const view = () => state.range === 'all' ? ALL : ALL.filter(g => g.t >= END - (+state.range) * DAY);

/* ── tooltip ── */
const tip = $('#tip');
const showTip = (html, e) => { tip.innerHTML = html; tip.classList.add('on'); const w = tip.offsetWidth; let x = e.clientX + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px'; };
const hideTip = () => tip.classList.remove('on');
document.addEventListener('mousemove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el.dataset.tip, e); else if (!e.target.closest('#main svg')) hideTip(); });

/* ── summary + explanation ── */
function summary(G) {
  const cr = SC(CUR), r = Math.round(cr), ci = Math.round(2 * CUR.rd), eq = (cr - 1400) / 100, eqL = eq >= 1 ? eq.toFixed(1) + ' 段' : (1 - eq).toFixed(1) + ' 級', elo = isElo();
  $('#sLbl').textContent = elo ? 'Elo 分數' : 'Glicko-2 分數';
  const neg = r < 0, sR = $('#sR');
  const sN = $('#sNeg');
  if (neg) { sR.textContent = ''; sN.innerHTML = `<span style="display:block;font-size:1.12em;line-height:1.3;color:var(--color-neutral-700);font-weight:700">${r}</span><span style="display:block;font-size:27px;font-weight:700">約等於野狐 ${eqL}</span>`; }
  else { sR.textContent = r; sN.innerHTML = ''; }
  $('#sRD').textContent = elo ? '' : '±' + ci;
  $('#sRsub').style.display = neg && elo ? 'none' : '';
  $('#sRsub').textContent = neg ? (elo ? 'Elo 分數為負，以野狐級數顯示' : `95% 落在 ${r - ci}–${r + ci}`) : (elo ? `約等於野狐 ${eqL}` : `95% 落在 ${r - ci}–${r + ci}，約等於 ${eqL}`);
  const fox = CUR.foxAfter; let since = ALL.length - 1; while (since > 0 && ALL[since - 1].foxAfter === fox) since--;
  $('#sFox').textContent = rk(fox);
  $('#sFoxSub').textContent = `${fmtD(ALL[since].t)} 起，已 ${ALL.length - since} 盤未變動`;
  const p14 = ALL.filter(g => g.t < END - 14 * DAY).pop() || ALL[0], n14 = ALL.filter(g => g.t >= END - 14 * DAY);
  const d14 = cr - SC(p14), w14 = n14.filter(g => g.win).length;
  const s14 = $('#s14'); s14.textContent = sgn(d14); s14.className = d14 > 0 ? 'up' : '';
  $('#s14sub').textContent = `${n14.length} 盤，${w14} 勝 ${n14.length - w14} 負`;
  const w = G.filter(g => g.win).length;
  $('#sWL').textContent = `${w}–${G.length - w}`;
  $('#sWLsub').textContent = `勝率 ${pct(w / G.length)}，共 ${G.length} 盤`;
  const gap = cr - danR(fox), eSame = expectS(danR(fox)), eUp = expectS(danR(fox + 1));
  const verdict = gap > 40 ? `比 ${rk(fox)}的換算分數高 <b>${Math.round(gap)} 分</b>，實力已經走在段位前面，只是升段規則還沒跟上。`
    : gap < -40 ? `比 ${rk(fox)}的換算分數低 ${Math.round(-gap)} 分，目前段位對你來說偏高。` : `和 ${rk(fox)}的換算分數大致相符。`;
  const bs = META.bs, many = n => bs && bs.all && n >= 20 && n / bs.all >= 0.2;
  const small = gap < -100 && bs && ((fox <= 2 && many(bs[9] + bs[13])) || (fox <= 5 && many(bs[13])));
  const warn = Math.abs(gap) > 100 ? `<span class="tag tag-accent" style="font-size:13px;margin-right:8px;width:313px;height:18px">${small ? '與野狐段位差距大，可能因非19路對局樣本偏差' : '與野狐段位差距大，可能因公開對局樣本偏差'}</span>` : '';
  $('#explainWarn').innerHTML = warn;
  $('#explain').innerHTML = (elo ? `你的 Elo 分數是 <b>${r}</b>，大約相當於野狐 <b>${eqL}</b>。` : `你的分數是 <b>${r}</b>，有 95% 的把握真實實力落在 ${r - ci} 到 ${r + ci} 之間，大約相當於野狐 <b>${eqL}</b>。`) + verdict +
    `近 14 天${d14 >= 0 ? '上升' : '下降'} ${Math.abs(Math.round(d14))} 分。以現在的分數，對 ${rk(fox)}預期勝率約 ${pct(eSame)}，對 ${rk(fox + 1)}約 ${pct(eUp)}。`;
}

/* ── 01 main curve ── */
function drawMain(G) {
  const el = $('#main'), W = el.clientWidth - 32, H = W < 600 ? 280 : 380, m = { l: 40, r: 44, t: 12, b: 26 };
  const idx = state.axis === 'idx', off = ALL.indexOf(G[0]);
  const xs = G.map((g, i) => idx ? off + i : g.t), x0 = idx ? xs[0] : (state.range === 'all' ? START : END - (+state.range) * DAY), x1 = idx ? xs[xs.length - 1] : END;
  const X = v => m.l + (v - x0) / (x1 - x0 || 1) * (W - m.l - m.r);
  let lo = Infinity, hi = -Infinity;
  const pad = g => isElo() ? 25 : g.rd * 1.4;
  G.forEach(g => { lo = Math.min(lo, SC(g) - pad(g), danR(g.fox)); hi = Math.max(hi, SC(g) + pad(g), danR(g.fox)); });
  lo = Math.floor((lo - 20) / 50) * 50; hi = Math.ceil((hi + 20) / 50) * 50;
  const Y = v => m.t + (hi - v) / (hi - lo) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><defs><clipPath id="clipM"><rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"></rect></clipPath></defs>`;
  for (let v = lo; v <= hi; v += 50) {
    const isDan = v % 100 === 0, y = Y(v);
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" stroke="var(--color-neutral-${isDan ? 400 : 300})" stroke-width="1" ${isDan ? '' : 'stroke-dasharray="2 4"'}></line>`;
    if (v % 100 === 0) s += `<text x="${m.l - 6}" y="${y + 4}" text-anchor="end">${v}</text>`;
    if (isDan) s += `<text x="${W - m.r + 6}" y="${y + 4}" style="fill:var(--color-text);font-weight:600">${rk((v - 1400) / 100)}</text>`;
  }
  // x ticks
  if (idx) { const step = (x1 - x0) > 200 ? 50 : (x1 - x0) > 80 ? 20 : 10; for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) s += `<text x="${X(v)}" y="${H - 6}" text-anchor="middle">第 ${v} 盤</text>`; }
  else { const d = new Date(x0); d.setHours(0, 0, 0, 0); const span = (x1 - x0) / DAY; for (let t = d.getTime(); t <= x1; t += DAY) { const dd = new Date(t), day = dd.getDate(); if (t >= x0 && (span > 45 ? day === 1 : span > 20 ? day % 7 === 1 : day % 3 === 1)) s += `<text x="${X(t)}" y="${H - 6}" text-anchor="middle">${span > 45 ? (dd.getMonth() + 1) + ' 月' : fmtD(t)}</text>`; } }
  // idle gaps
  if (!idx) for (let i = 1; i < G.length; i++) if (G[i].t - G[i - 1].t > 7 * DAY) { const a = X(G[i - 1].t), b = X(G[i].t); s += `<rect x="${a}" y="${m.t}" width="${b - a}" height="${H - m.t - m.b}" fill="var(--color-neutral-200)"></rect><text x="${(a + b) / 2}" y="${m.t + 16}" text-anchor="middle">${Math.round((G[i].t - G[i - 1].t) / DAY)} 天未下</text>`; }
  // band
  const top = G.map((g, i) => `${X(xs[i])},${Y(g.r + 2 * g.rd)}`), bot = G.map((g, i) => `${X(xs[i])},${Y(g.r - 2 * g.rd)}`).reverse();
  s += `<g clip-path="url(#clipM)">` + (isElo() ? '' : `<polygon points="${top.concat(bot).join(' ')}" fill="var(--color-accent-200)" opacity=".75"></polygon>`);
  // fox step
  let p = `M${X(x0)},${Y(danR(G[0].fox))}`;
  G.forEach((g, i) => { p += `L${X(xs[i])},${Y(danR(g.fox))}`; if (g.foxAfter !== g.fox) p += `L${X(xs[i])},${Y(danR(g.foxAfter))}`; });
  p += `L${X(x1)},${Y(danR(G[G.length - 1].foxAfter))}`;
  s += `<path d="${p}" fill="none" stroke="var(--color-text)" stroke-width="2"></path>`;
  s += `<polyline points="${G.map((g, i) => `${X(xs[i])},${Y(SC(g))}`).join(' ')}" fill="none" stroke="var(--color-accent)" stroke-width="2.25" stroke-linejoin="round"></polyline></g>`;
  G.forEach((g, i) => { if (g.foxAfter !== g.fox) { const up = g.foxAfter > g.fox; s += `<text x="${X(xs[i]) + 4}" y="${Y(danR(g.foxAfter)) + (up ? -8 : 18)}" style="fill:var(--color-text);font-weight:600;paint-order:stroke;stroke:var(--color-bg);stroke-width:4px">${up ? '升' : '降'} ${rk(g.foxAfter)}</text>`; } });
  s += `<line id="hvL" y1="${m.t}" y2="${H - m.b}" stroke="var(--color-text)" stroke-width="1" opacity="0"></line><circle id="hvC" r="4.5" fill="var(--color-accent)" stroke="var(--color-bg)" stroke-width="2" opacity="0"></circle>`;
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="var(--color-text)" stroke-width="2"></line>`;
  s += `<rect id="hvR" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"></rect></svg>`;
  el.innerHTML = s;
  const svg = el.querySelector('svg'), L = $('#hvL'), C = $('#hvC');
  $('#hvR').addEventListener('mousemove', e => {
    const bx = svg.getBoundingClientRect(), px = (e.clientX - bx.left) * W / bx.width;
    let bi = 0, bd = Infinity; xs.forEach((v, i) => { const d = Math.abs(X(v) - px); if (d < bd) { bd = d; bi = i; } });
    const g = G[bi], x = X(xs[bi]);
    L.setAttribute('x1', x); L.setAttribute('x2', x); L.setAttribute('opacity', .35);
    C.setAttribute('cx', x); C.setAttribute('cy', Y(SC(g))); C.setAttribute('opacity', 1);
    showTip(`${fmtD(g.t)} ${fmtT(g.t)} · 第 ${off + bi + 1} 盤<br>對 ${rk(g.oppDan)} · 執${g.color === 'B' ? '黑' : '白'} · ${g.tc} · <b>${g.win ? '勝' : '負'}</b><br>${isElo() ? 'Elo' : 'Glicko'} ${Math.round(SC(g))}（${sgn(DL(g))}）${isElo() ? '' : '±' + Math.round(2 * g.rd)}<br>野狐 ${rk(g.foxAfter)}`, e);
  });
  $('#hvR').addEventListener('mouseleave', () => { L.setAttribute('opacity', 0); C.setAttribute('opacity', 0); hideTip(); });
}

/* ── 02 opponent rank ── */
function drawOpp(G) {
  const el = $('#opp'), W = el.clientWidth - 32, H = 240, m = { l: 34, r: 8, t: 22, b: 40 };
  const by = {}; G.forEach(g => { (by[g.oppDan] = by[g.oppDan] || []).push(g); });
  const dans = Object.keys(by).map(Number).filter(d => by[d].length >= 3).sort((a, b) => a - b);
  if (!dans.length) { el.innerHTML = '<p class="note" style="padding:0">每個段位至少要 3 盤才會顯示。</p>'; $('#oppNote').textContent = ''; return; }
  const bw = (W - m.l - m.r) / dans.length, Y = v => m.t + (1 - v) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}">`;
  [0, .25, .5, .75, 1].forEach(v => { s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--color-neutral-${v === .5 ? 500 : 300})" ${v === .5 ? 'stroke-dasharray="4 3"' : ''}></line><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v * 100}%</text>`; });
  let ceil = null;
  dans.forEach((d, i) => {
    const gs = by[d], w = gs.filter(g => g.win).length / gs.length, e = expectS(danR(d));
    const x = m.l + i * bw + bw * .2, bwi = bw * .6;
    if (ceil == null && w < .5) ceil = d;
    s += `<g data-tip="對 ${rk(d)}：${gs.filter(g => g.win).length} 勝 ${gs.length - gs.filter(g => g.win).length} 負（${pct(w)}）<br>依目前分數預期 ${pct(e)}">`;
    s += `<rect x="${m.l + i * bw}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="transparent"></rect>`;
    s += `<rect x="${x}" y="${Y(w)}" width="${bwi}" height="${Y(0) - Y(w)}" fill="var(--color-text)"></rect>`;
    s += `<line x1="${x - 4}" x2="${x + bwi + 4}" y1="${Y(e)}" y2="${Y(e)}" stroke="var(--color-accent)" stroke-width="3"></line>`;
    s += `<text x="${x + bwi / 2}" y="${Math.min(Y(w), Y(e)) - 7}" text-anchor="middle" style="fill:var(--color-text);font-weight:800;font-size:13px">${pct(w)}</text>`;
    s += `<text x="${x + bwi / 2}" y="${H - m.b + 17}" text-anchor="middle" style="fill:var(--color-text);font-weight:600;font-size:12px">對 ${rk(d)}</text><text x="${x + bwi / 2}" y="${H - m.b + 32}" text-anchor="middle">${gs.length} 盤</text></g>`;
  });
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--color-text)" stroke-width="2"></line></svg>`;
  el.innerHTML = s;
  $('#oppNote').textContent = ceil != null ? `對 ${rk(ceil)}的勝率首次跌破五成，這是目前實際的天花板。紅線是依目前分數算出的預期勝率，黑柱高於紅線代表這一段表現得比分數更好。` : '對各段位的勝率都在五成以上。';
}

/* ── 03 colour + time control ── */
const perf = gs => { const w = gs.filter(g => g.win).length, n = gs.length; return { w, n, rate: w / n, perf: gs.reduce((a, g) => a + danR(g.oppDan), 0) / n + 400 * (2 * w - n) / n }; };
function rowsHTML(items) {
  return `<div class="row head"><span></span><span>勝率</span><span>戰績</span><span>表現分</span></div>` + items.map(([k, gs, acc]) => {
    const p = perf(gs);
    return `<div class="row" data-tip="${k}：${p.w} 勝 ${p.n - p.w} 負<br>表現分 = 對手平均分數 + 400 ×（勝 − 負）÷ 盤數"><b>${k}</b><div class="track"><div class="fill${acc ? ' acc' : ''}" style="width:${p.rate * 100}%"></div><div class="mid"></div></div><span class="num">${pct(p.rate)} · ${p.n} 盤</span><span class="num">${Math.round(p.perf)}</span></div>`;
  }).join('');
}
function drawColorTC(G) {
  const B = G.filter(g => g.color === 'B'), Wh = G.filter(g => g.color === 'W');
  $('#color').innerHTML = rowsHTML([['執黑', B], ['執白', Wh]]);
  const tcs = ['快棋', '一般', '慢棋'].map(k => [k, G.filter(g => g.tc === k)]).filter(x => x[1].length);
  if (!tcs.length) { $('#tc').innerHTML = '<p class="note" style="padding:0">棋譜裡沒有用時資訊。</p>'; $('#tcNote').textContent = ''; return; }
  const ps = tcs.map(([k, gs]) => [k, perf(gs).perf]).sort((a, b) => b[1] - a[1]);
  $('#tc').innerHTML = rowsHTML(tcs.map(([k, gs]) => [k, gs, k === ps[0][0]]));
  const db = perf(B).rate - perf(Wh).rate;
  $('#tcNote').textContent = `執黑比執白勝率${db >= 0 ? '高' : '低'} ${Math.abs(Math.round(db * 100))} 個百分點。${ps[0][0]}的表現分最高（${Math.round(ps[0][1])}），比${ps[ps.length - 1][0]}高 ${Math.round(ps[0][1] - ps[ps.length - 1][1])} 分。`;
}

/* ── 04 heatmap ── */
function drawHeat(G) {
  if (META.noTime) { $('#heat').innerHTML = '<p class="note" style="padding:0">匯入的棋譜只有日期、沒有時間，無法畫時段圖。</p>'; $('#heatNote').textContent = ''; return; }
  const el = $('#heat'), W = el.clientWidth - 32, lw = 22, cw = (W - lw) / 24, ch = Math.max(18, Math.min(30, cw * 1.1)), H = ch * 7 + 22;
  const cells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ w: 0, n: 0 })));
  G = G.filter(g => !g.nt);
  G.forEach(g => { const d = new Date(g.t), r = (d.getDay() + 6) % 7, c = cells[r][d.getHours()]; c.n++; if (g.win) c.w++; });
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}">`;
  cells.forEach((row, r) => {
    s += `<text x="0" y="${r * ch + ch / 2 + 4}" style="fill:var(--color-text)">${WD[r]}</text>`;
    row.forEach((c, h) => {
      const x = lw + h * cw, y = r * ch;
      if (!c.n) { s += `<rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" fill="none" stroke="var(--color-neutral-300)"></rect>`; return; }
      const v = c.w / c.n, k = Math.round(Math.abs(v - .5) * 200);
      const fill = v >= .5 ? `color-mix(in oklch, var(--color-accent) ${k}%, var(--color-neutral-200))` : `color-mix(in oklch, var(--color-neutral-800) ${k}%, var(--color-neutral-200))`;
      s += `<rect data-tip="週${WD[r]} ${h}:00–${h + 1}:00<br>${c.w} 勝 ${c.n - c.w} 負（${pct(v)}）" x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" style="fill:${fill}" opacity="${c.n < 3 ? .4 : 1}"></rect>`;
    });
  });
  for (let h = 0; h < 24; h += 3) s += `<text x="${lw + h * cw + cw / 2}" y="${H - 4}" text-anchor="middle">${h}</text>`;
  el.innerHTML = s + '</svg>';
  const slot = (f) => { const gs = G.filter(f); return gs.length ? [gs.filter(g => g.win).length / gs.length, gs.length] : null; };
  const late = slot(g => new Date(g.t).getHours() < 3), eve = slot(g => { const h = new Date(g.t).getHours(); return h >= 19 && h < 24; });
  $('#heatNote').textContent = late && eve ? `晚上 7 點到 12 點勝率 ${pct(eve[0])}（${eve[1]} 盤），過了午夜${late[0] < eve[0] - .03 ? '降到' : late[0] > eve[0] + .03 ? '反而升到' : '維持在'} ${pct(late[0])}（${late[1]} 盤）。` : '';
}

/* ── 05 streaks ── */
function drawStreak(G) {
  const runs = []; let cur = null;
  G.forEach(g => { if (cur && cur.win === g.win) cur.len++; else { cur = { win: g.win, len: 1 }; runs.push(cur); } });
  const MAX = 7, cnt = { w: Array(MAX).fill(0), l: Array(MAX).fill(0) };
  runs.forEach(r => cnt[r.win ? 'w' : 'l'][Math.min(MAX, r.len) - 1]++);
  const el = $('#streak'), W = el.clientWidth - 32, H = 220, m = { l: 34, r: 8, t: 14, b: 14 }, mid = (H - m.t - m.b) / 2 + m.t;
  const top = Math.max(...cnt.w, ...cnt.l), bw = (W - m.l - m.r) / MAX, Ys = v => v / top * ((H - m.t - m.b) / 2 - 16);
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><text x="0" y="${m.t + 10}" style="fill:var(--color-accent-700);font-weight:600">連勝</text><text x="0" y="${H - m.b}" style="fill:var(--color-text);font-weight:600">連敗</text>`;
  for (let i = 0; i < MAX; i++) {
    const x = m.l + i * bw + bw * .2, w = bw * .6, a = Ys(cnt.w[i]), b = Ys(cnt.l[i]), lab = i === MAX - 1 ? MAX + '+' : i + 1;
    s += `<g data-tip="${lab} 連勝：${cnt.w[i]} 次<br>${lab} 連敗：${cnt.l[i]} 次"><rect x="${m.l + i * bw}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="transparent"></rect>`;
    s += `<rect x="${x}" y="${mid - 9 - a}" width="${w}" height="${a}" fill="var(--color-accent)"></rect><rect x="${x}" y="${mid + 9}" width="${w}" height="${b}" fill="var(--color-text)"></rect>`;
    if (cnt.w[i]) s += `<text x="${x + w / 2}" y="${mid - 13 - a}" text-anchor="middle">${cnt.w[i]}</text>`;
    if (cnt.l[i]) s += `<text x="${x + w / 2}" y="${mid + 21 + b}" text-anchor="middle">${cnt.l[i]}</text>`;
    s += `<text x="${x + w / 2}" y="${mid + 4}" text-anchor="middle" style="fill:var(--color-text);font-weight:600">${lab}</text></g>`;
  }
  el.innerHTML = s + '</svg>';
  const buckets = [['剛贏', g => g.prevL === 0], ['連敗 1', g => g.prevL === 1], ['連敗 2', g => g.prevL === 2], ['連敗 3+', g => g.prevL >= 3]];
  $('#tilt').innerHTML = `<div class="row head"><span></span><span>下一盤勝率</span><span>戰績</span><span>分數變化</span></div>` + buckets.map(([k, f]) => {
    const gs = G.filter(f); if (!gs.length) return '';
    const w = gs.filter(g => g.win).length, d = gs.reduce((a, g) => a + DL(g), 0);
    return `<div class="row" data-tip="${k}後繼續下：${w} 勝 ${gs.length - w} 負<br>這些盤合計 ${sgn(d)} 分"><b>${k}</b><div class="track"><div class="fill${k === '剛贏' ? ' acc' : ''}" style="width:${w / gs.length * 100}%"></div><div class="mid"></div></div><span class="num">${pct(w / gs.length)} · ${gs.length} 盤</span><span class="num">${sgn(d)}</span></div>`;
  }).join('');
  const tilt = G.filter(g => g.prevL >= 2), tw = tilt.filter(g => g.win).length, td = tilt.reduce((a, g) => a + DL(g), 0);
  const allW = G.filter(g => g.win).length / G.length, tr = tilt.length ? tw / tilt.length : 0;
  $('#tiltNote').textContent = tilt.length < 8 ? `同一時段連敗 2 盤以上還繼續下的只有 ${tilt.length} 盤，樣本太少，暫時看不出影響。`
    : (tr < allW - .05 && td < 0) ? `同一時段連敗 2 盤以上還繼續下的 ${tilt.length} 盤，勝率只有 ${pct(tr)}（整體 ${pct(allW)}），合計讓分數 ${sgn(td)}。連敗兩盤後休息，是目前最直接的止損方式。`
    : `同一時段連敗 2 盤以上還繼續下的 ${tilt.length} 盤，勝率 ${pct(tr)}（整體 ${pct(allW)}），合計 ${sgn(td)} 分，目前沒有明顯的連敗後下滑。`;
}

/* ── 06 opponent mix over time ── */
const MIX = [['高 2 段+', d => d >= 2, 'var(--color-accent-700)'], ['高 1 段', d => d === 1, 'var(--color-accent-400)'], ['同段', d => d === 0, 'var(--color-neutral-300)'], ['低 1 段', d => d === -1, 'var(--color-neutral-600)'], ['低 2 段+', d => d <= -2, 'var(--color-neutral-900)']];
function drawMix(G) {
  const el = $('#mix'), W = el.clientWidth - 32, H = 220, m = { l: 34, r: 8, t: 10, b: 26 };
  const wk = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
  const weeks = []; G.forEach(g => { const k = wk(g.t); let w = weeks[weeks.length - 1]; if (!w || w.k !== k) weeks.push(w = { k, gs: [] }); w.gs.push(g); });
  const bw = (W - m.l - m.r) / weeks.length, Y = v => m.t + (1 - v) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}">`;
  [0, .5, 1].forEach(v => { s += `<text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v * 100}%</text>`; });
  weeks.forEach((w, i) => {
    const n = w.gs.length, x = m.l + i * bw + 1, cw = Math.max(1, bw - 2); let acc = 0, tip = `${fmtD(w.k)} 那週 · ${n} 盤`;
    MIX.forEach(([lab, f, col]) => { const c = w.gs.filter(g => f(g.oppDan - g.fox)).length; if (!c) return; const h = c / n * (H - m.t - m.b); s += `<rect x="${x}" y="${Y(acc) - h}" width="${cw}" height="${h}" fill="${col}" opacity="${n < 3 ? .45 : 1}"></rect>`; acc += c / n; tip += `<br>${lab}：${c} 盤（${pct(c / n)}）`; });
    s += `<rect data-tip="${tip}" x="${m.l + i * bw}" y="${m.t}" width="${bw}" height="${H - m.t - m.b}" fill="transparent"></rect>`;
    if (i % Math.ceil(weeks.length / 8) === 0) s += `<text x="${x + cw / 2}" y="${H - 8}" text-anchor="middle">${fmtD(w.k)}</text>`;
  });
  el.innerHTML = s + `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--color-text)" stroke-width="2"></line></svg>`;
  const share = gs => gs.length ? { up: gs.filter(g => g.oppDan > g.fox).length / gs.length, down: gs.filter(g => g.oppDan < g.fox).length / gs.length, avg: gs.reduce((a, g) => a + g.oppDan - g.fox, 0) / gs.length } : null;
  const cut = END - 28 * DAY, now = share(G.filter(g => g.t >= cut)), before = share(G.filter(g => g.t < cut)), all = share(G);
  const kind = all.avg > .15 ? '整體偏向<b>越級挑戰</b>' : all.avg < -.15 ? '整體偏向<b>打低</b>（對手多比你低）' : '整體以<b>同級對局</b>為主';
  $('#mixNote').innerHTML = `${kind}：對上比自己高段的對手占 ${pct(all.up)}，比自己低段的占 ${pct(all.down)}。` + (now && before ? `最近 4 週高段對手占 ${pct(now.up)}，之前是 ${pct(before.up)}。` : '');
}

/* ── 07 how games end ── */
const ENDS = [['R', '中盤', 'var(--color-text)'], ['C', '數子', 'var(--color-neutral-500)'], ['T', '超時', 'var(--color-accent)'], ['O', '其他', 'var(--color-neutral-300)']];
function stackRow(label, gs) {
  if (!gs.length) return '';
  const seg = ENDS.map(([k, lab, col]) => { const c = gs.filter(g => (g.end || 'O') === k).length; return c ? `<div data-tip="${label} · ${lab}：${c} 盤（${pct(c / gs.length)}）" style="width:${c / gs.length * 100}%;background:${col}"></div>` : ''; }).join('');
  const t = gs.filter(g => g.end === 'T').length;
  return `<div class="row"><b>${label}</b><div class="stack">${seg}</div><span class="num">${gs.length} 盤</span><span class="num">超時 ${pct(t / gs.length)}</span></div>`;
}
function drawEnd(G) {
  if (!G.some(g => g.end)) { $('#ends').innerHTML = '<p class="note" style="padding:0">這批棋譜沒有勝負方式資訊。</p>'; $('#endTc').innerHTML = ''; $('#endNote').textContent = ''; return; }
  const W = G.filter(g => g.win), L = G.filter(g => !g.win);
  $('#ends').innerHTML = stackRow('勝局', W) + stackRow('敗局', L);
  const tcs = ['快棋', '一般', '慢棋'].filter(k => G.some(g => g.tc === k));
  $('#endTc').innerHTML = tcs.map(k => stackRow(k + '敗局', L.filter(g => g.tc === k))).join('');
  const tl = L.length ? L.filter(g => g.end === 'T').length / L.length : 0;
  const ps = tcs.map(k => [k, perf(G.filter(g => g.tc === k)).perf, L.filter(g => g.tc === k)]).sort((a, b) => a[1] - b[1]);
  let msg = `敗局中有 ${pct(tl)} 是超時輸掉的。`;
  if (ps.length > 1) { const [k, p, ls] = ps[0], best = ps[ps.length - 1], st = ls.length ? ls.filter(g => g.end === 'T').length / ls.length : 0;
    msg += st > tl + .05 && st >= .15 ? `${k}表現分比${best[0]}低 ${Math.round(best[1] - p)} 分，而${k}敗局有 ${pct(st)} 是超時，比平均高；先改善用時分配，可能比練棋力更快見效。` : `${k}表現分比${best[0]}低 ${Math.round(best[1] - p)} 分，但${k}的超時比例不特別高，差距主要來自棋局本身。`; }
  $('#endNote').textContent = msg;
}

function render() {
  let G = view(); if (G.length < 2) G = ALL;
  summary(G); drawMain(G); drawOpp(G); drawColorTC(G); drawHeat(G); drawStreak(G); drawMix(G); drawEnd(G);
  window.FoxView = { G, ALL, CUR, sys: state.sys, range: state.range, who: $('#who').textContent, rk, SC };
}
document.querySelectorAll('input[name=range],input[name=axis]').forEach(i => i.addEventListener('change', () => { state[i.name] = i.value; render(); }));
let RAW = null;
const note = $('#syncNote'), reset = $('#sampleBtn');
async function doImport(list) {
  if (!list || !list.length) return;
  note.textContent = '讀取中…';
  const v = $('#acct').value.trim(), { out } = await FoxImport.importFiles(list, /^\d+$/.test(v) ? '' : v);
  if (out.games.length < 2) { note.textContent = out.error || `找不到可用的對局（略過 ${out.skipped} 個）`; return; }
  RAW = list; apply(out, `已匯入 ${out.games.length} 盤`, '目前顯示的是匯入的棋譜檔。');
}
const fmtFull = t => { const d = new Date(t); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${fmtT(t)}`; };
function apply(out, msg, data) {
  META = { sample: false, noTime: out.noTime, bs: out.beginner ? null : out.bs }; compute(out.games);
  $('#updated').textContent = (out.fetchedAt ? '資料更新於 ' + fmtFull(out.fetchedAt) : '匯入於 ' + fmtFull(Date.now())) + ' · 最新對局 ' + fmtFull(CUR.t);
  note.textContent = msg + (out.skipped ? `，略過 ${out.skipped} 盤（${out.beginner ? '19 路、吃子、和棋或讓子' : '和棋、讓子或非 19 路'}）` : '');
  reset.hidden = false; $('#dataNote').textContent = data; render();
}
const ERR = { empty: '請輸入野狐 UID 或暱稱', nick: '目前無法用暱稱查詢，請改輸入數字 UID', proxy: '轉接服務沒有回應，請確認網址或改輸入數字 UID', notfound: '找不到這個棋手', nogames: '這個帳號沒有可用的 19 路公開棋譜，只下過 9 路或 13 路的話請勾選初學者模式', nosmall: '這個帳號沒有可用的 9 路或 13 路公開棋譜（吃子對局不計）' };
async function doFetch() {
  const v = $('#acct').value.trim(), btn = $('#fetchBtn'); btn.disabled = true; note.textContent = '讀取中…';
  try {
    const beg = $('#beginner').checked, out = await FoxImport.fetchFox(v, n => { note.textContent = `已讀取 ${n} 盤…`; }, 1000, { beginner: beg });
    out.beginner = beg;
    if (out.games.length < 2) throw new Error(beg ? 'nosmall' : 'nogames');
    try { localStorage.setItem('foxTracker.uid', out.uid); } catch (e) {}
    $('#who').textContent = out.player ? `${out.player}（UID ${out.uid}）` : 'UID ' + out.uid;
    apply(out, `${out.player || 'UID ' + out.uid}：已讀取 ${out.games.length} 盤`, `目前顯示的是 ${out.player || 'UID ' + out.uid} 在野狐的${beg ? ' 9 路與 13 路' : ' 19 路'}公開棋譜${beg ? '（初學者模式，不含吃子對局與 19 路）' : ''}。用時制依每手平均用時推估（≤5 秒快棋、≤12 秒一般、其餘慢棋）。`);
  } catch (e) { note.textContent = ERR[e.message] || '讀取失敗，請稍後再試'; }
  btn.disabled = false;
}
$('#fetchBtn').addEventListener('click', doFetch);
try { $('#beginner').checked = localStorage.getItem('foxTracker.beginner') === '1'; } catch (e) {}
$('#beginner').addEventListener('change', () => { try { localStorage.setItem('foxTracker.beginner', $('#beginner').checked ? '1' : '0'); } catch (e) {} if ($('#acct').value.trim() && !META.sample) doFetch(); });
$('#acct').addEventListener('keydown', e => { if (e.key === 'Enter') doFetch(); });
$('#fileIn').addEventListener('change', e => { doImport(e.target.files); e.target.value = ''; });
reset.addEventListener('click', () => { try { localStorage.removeItem('foxTracker.uid'); } catch (e) {} seed = 19; RAW = null; META = { sample: true }; START = new Date(2026, 4, 31).getTime(); END = START + DAYS * DAY; compute(simulate()); $('#acct').value = ''; $('#who').textContent = '範例棋手'; $('#updated').textContent = '範例資料，非即時'; note.textContent = '目前顯示範例資料'; reset.hidden = true; $('#dataNote').textContent = '目前顯示的是範例資料。'; render(); });
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); document.body.classList.add('drop'); }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); if (ev === 'drop' || !e.relatedTarget) document.body.classList.remove('drop'); }));
document.addEventListener('drop', e => doImport(e.dataTransfer.files));
let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(render, 60); }).observe($('.wrap'));
render();
try { const q = new URLSearchParams(location.search).get('uid'), u = (q && /^\d+$/.test(q)) ? q : localStorage.getItem('foxTracker.uid'); if (u) { $('#acct').value = u; doFetch(); } } catch (e) {}
})();

