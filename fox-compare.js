(() => {
const $ = s => document.querySelector(s);
const { DAY, danR, rk, rate, vsProb } = FoxEngine;
const pct = x => Math.round(x * 100) + '%';
const sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(Math.round(x));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtD = t => { const d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate(); };
const COL = ['var(--color-accent)', 'var(--color-text)'], BAND = ['var(--color-accent-200)', 'var(--color-neutral-300)'];
const ERR = { empty: '請輸入兩位棋手的 UID', nick: '目前無法用暱稱查詢，請改輸入數字 UID', notfound: '找不到這個棋手', nogames: '這個帳號沒有公開棋譜' };
let P = [], step = 0, CATS = [];

function stats(p) {
  const G = p.games, cur = G[G.length - 1];
  let R = G.filter(g => g.t >= cur.t - 90 * DAY); if (R.length < 20) R = G.slice(-60);
  const rateOf = gs => gs.length >= 3 ? gs.filter(g => g.win).length / gs.length : null;
  const p30 = G.filter(g => g.t < cur.t - 30 * DAY).pop() || G[0];
  const L = R.filter(g => !g.win && g.end);
  const avgOpp = R.reduce((a, g) => a + danR(g.oppDan), 0) / R.length;
  const farm = R.filter(g => g.oppDan <= g.fox - 2).length / R.length;
  const cons = cur.r - cur.rd, str = .25 * (avgOpp - cur.r), pen = -40 * farm;
  return { cur, R, n: G.length, avgOpp, farm, cons, str, pen, gold: cons + str + pen,
    vals: [cur.r, cur.r - p30.r, avgOpp, rateOf(R.filter(g => g.oppDan > g.fox)), rateOf(R.filter(g => g.oppDan === g.fox)), L.length >= 3 ? L.filter(g => g.end === 'T').length / L.length : null, rateOf(R.filter(g => g.prevL >= 2))] };
}
const erf = x => { const s = Math.sign(x), t = 1 / (1 + .3275911 * Math.abs(x)); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x)); };
const Phi = z => .5 * (1 + erf(z / Math.SQRT2));
const conf = sd => sd <= 30 ? '高' : sd <= 60 ? '中' : '低';
const DEF = [
  ['目前分數', 'Elo 分數，越高越強', 1, v => Math.round(v)],
  ['近 30 天進步', '這 30 天的分數變化', 1, v => sgn(v)],
  ['平均對手強度', '近期對手的平均換算分數', 1, v => Math.round(v)],
  ['對高段勝率', '對上比自己高段的對手', 1, v => pct(v)],
  ['同段勝率', '和同段位對手的較量', 1, v => pct(v)],
  ['超時敗比例', '敗局中超時輸掉的比例，越低越好', -1, v => pct(v)],
  ['連敗後勝率', '連敗 2 盤後下一盤的勝率', 1, v => pct(v)]
];

function drawCurves() {
  const el = $('#cmp'), W = el.clientWidth - 32, H = W < 600 ? 260 : 340, m = { l: 44, r: 12, t: 12, b: 26 };
  const t1 = Math.max(...P.map(p => p.st.cur.t)), t0 = Math.min(...P.map(p => Math.max(p.games[0].t, p.st.cur.t - 180 * DAY)));
  const S = P.map(p => { const i = p.games.findIndex(g => g.t >= t0); return i < 0 ? p.games.slice(-1) : p.games.slice(Math.max(0, i - 1)); });
  let lo = Infinity, hi = -Infinity; S.flat().forEach(g => { lo = Math.min(lo, g.r); hi = Math.max(hi, g.r); });
  lo = Math.floor((lo - 20) / 100) * 100; hi = Math.ceil((hi + 20) / 100) * 100;
  const X = t => m.l + (t - t0) / (t1 - t0 || 1) * (W - m.l - m.r), Y = v => m.t + (hi - v) / (hi - lo) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><defs><clipPath id="cc"><rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"></rect></clipPath></defs>`;
  const step100 = (hi - lo) > 800 ? 200 : 100;
  for (let v = lo; v <= hi; v += step100) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--color-neutral-300)"></line><text x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  const span = (t1 - t0) / DAY; for (let t = new Date(t0).setHours(0, 0, 0, 0); t <= t1; t += DAY) { const d = new Date(t); if (t >= t0 && (span > 45 ? d.getDate() === 1 : d.getDate() % 7 === 1)) s += `<text x="${X(t)}" y="${H - 6}" text-anchor="middle">${span > 45 ? (d.getMonth() + 1) + ' 月' : fmtD(t)}</text>`; }
  s += '<g clip-path="url(#cc)">';
  S.forEach((G, i) => { if (G.length < 2) { const g = G[0]; s += `<circle cx="${X(Math.max(g.t, t0))}" cy="${Y(g.r)}" r="4" fill="${COL[i]}"></circle>`; } });
  S.forEach((G, i) => { s += `<polyline points="${G.map(g => `${X(g.t)},${Y(g.r)}`).join(' ')}" fill="none" stroke="${COL[i]}" stroke-width="2.5" stroke-linejoin="round"></polyline>`; });
  S.forEach((G, i) => { const g = G[G.length - 1]; if (t1 - g.t > 3 * DAY) s += `<line x1="${X(g.t)}" x2="${X(t1)}" y1="${Y(g.r)}" y2="${Y(g.r)}" stroke="${COL[i]}" stroke-width="1.5" stroke-dasharray="4 4"></line>`; });
  s += '</g>';
  S.forEach((G, i) => { const g = G[G.length - 1]; if (t1 - g.t > 3 * DAY) s += `<text x="${Math.max(m.l + 4, X(g.t) + 6)}" y="${Y(g.r) - 8}" style="fill:var(--color-text);font-weight:600;paint-order:stroke;stroke:var(--color-bg);stroke-width:4px">${esc(P[i].name)} 最後對局 ${fmtD(g.t)}</text>`; });
  S.forEach((G, i) => { if (!G.length) return; const g = G[G.length - 1]; s += `<circle cx="${X(g.t)}" cy="${Y(g.r)}" r="5" fill="${COL[i]}" stroke="var(--color-bg)" stroke-width="2"></circle>`; });
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="var(--color-text)" stroke-width="2"></line></svg>`;
  el.innerHTML = s;
  $('#cmpLegend').innerHTML = P.map((p, i) => `<span><i style="background:${COL[i]}"></i>${esc(p.name)}</span>`).join('');
}

function sideHTML(p, i) {
  const st = p.st, c = st.cur;
  return `<span class="lbl">棋手 ${'AB'[i]}</span><div class="side-name"><i class="dot" style="background:${COL[i]}"></i>${esc(p.name)}</div><div class="side-score num">${Math.round(c.r)}<small>Elo</small></div><span class="side-sub">可信度 <b>${conf(c.rd)}</b>（近 30 盤波動 ±${Math.round(c.rd)}）</span><span class="side-sub">野狐 ${rk(c.foxAfter)} · ${st.n} 盤公開對局 · UID ${p.uid}</span>${Math.abs(c.r - danR(c.foxAfter)) > 100 ? '<span class="tag tag-accent">與野狐段位差距大，可能因公開對局樣本偏差</span>' : ''}<div class="medals" id="med${i}"></div>`;
}
function renderCats() {
  $('#cats').innerHTML = CATS.map((c, k) => {
    const open = k < step, now = k === step - 1;
    const cell = j => { const v = c.v[j]; if (!open) return `<div class="val">?</div>`; if (v == null) return `<div class="val lose">—<small>樣本不足</small></div>`; const win = c.w === j; return `<div class="val${typeof c.w === 'number' && !win ? ' lose' : ''}">${win ? '<span class="medal">金</span>' : ''}${c.f(v)}</div>`; };
    const tag = !open ? '' : c.w === 'skip' ? ' <span class="tag tag-neutral">不比</span>' : c.w === 'tie' ? ' <span class="tag tag-neutral">平手</span>' : '';
    return `<div class="cat${open ? '' : ' locked'}${now ? ' now' : ''}"><span class="cat-n">${String(k + 1).padStart(2, '0')}</span><div><h3>${c.name}${tag}</h3><p>${c.desc}${open && c.w === 'skip' ? '（一方資料不足，不發牌）' : open && c.w === 'tie' ? '（數值相同，不發牌）' : ''}</p></div>${cell(0)}${cell(1)}</div>`;
  }).join('');
  [0, 1].forEach(j => { $('#med' + j).innerHTML = CATS.slice(0, step).filter(c => c.w === j).map(() => '<span class="medal">金</span>').join(''); });
  $('#progress').textContent = `已揭曉 ${step} / ${CATS.length}`;
  const done = step >= CATS.length;
  $('#next').textContent = done ? '已全部揭曉' : `揭曉第 ${step + 1} 項`; $('#next').disabled = done; $('#all').hidden = done;
  $('#final').hidden = !done; if (done) renderFinal();
}
function renderFinal() {
  const [a, b] = P, ga = a.st.gold, gb = b.st.gold;
  const m = [0, 1].map(j => CATS.filter(c => c.w === j).length), mw = m[0] === m[1] ? null : m[0] > m[1] ? 0 : 1;
  const A = a.st.cur, B = b.st.cur, z = (B.r - A.r) / Math.sqrt(A.rd * A.rd + B.rd * B.rd), pB = Phi(z), fw = Math.abs(pB - .5) < .005 ? null : pB > .5 ? 1 : 0, pw = fw === 1 ? pB : 1 - pB;
  const gw = Math.abs(ga - gb) < 1 ? null : ga > gb ? 0 : 1;
  const nm = j => esc(P[j].name), pp = x => x < .01 ? '低於 1%' : x > .99 ? '高於 99%' : pct(x);
  const sure = p => p >= .95 ? '幾乎可以確定' : p >= .8 ? '相當有把握' : p >= .65 ? '略有把握' : '差距不明顯，接近五五波';
  $('#verdict').innerHTML = `<span class="lbl">最終判定</span><div class="vgrid">
<div><span class="lbl">金牌總數</span><h2>${mw == null ? '平手' : '<span class="medal lg">金</span>' + nm(mw)}</h2><p>${nm(0)} ${m[0]} 面，${nm(1)} ${m[1]} 面（共 ${CATS.length} 項，平手與資料不足的項目不發牌）。</p></div>
<div><span class="lbl lbl-q">實力機率<button type="button" class="q" aria-label="計算方式" data-tip="${esc(`<b>P(B 較強) = Φ((μB − μA) / √(σA² + σB²))</b><br>μ 為兩人的 Elo 分數（${Math.round(A.r)}、${Math.round(B.r)}），σ 為各自近 30 盤 Elo 的標準差（${Math.round(A.rd)}、${Math.round(B.rd)}），代表分數的波動。<br>代入得 z = ${z.toFixed(2)}，P(${P[1].name} 較強) = ${pp(pB)}。<br><br>這不是下一盤的勝率，下一盤的預期勝率請看上方長條。`)}">?</button></span><h2>${fw == null ? '平手' : nm(fw)}</h2><p>${fw == null ? '兩人實力高低無法分辨，接近五五波。' : `${nm(fw)}的真實實力高於對方的機率${pw > .99 ? '超過 99%' : '有 ' + pct(pw)}，${sure(pw)}。`}</p></div>
</div>`;
  $('#goldNote').textContent = gw == null ? '依含金量分數，兩人相同。' : `依含金量分數，${P[gw].name} 較高（${Math.round(Math.max(ga, gb))} 對 ${Math.round(Math.min(ga, gb))}）。`;
  const row = (lab, f, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${lab}</td>${P.map((p, j) => `<td class="num">${f(p.st, j)}</td>`).join('')}</tr>`;
  $('#ftab').innerHTML = `<thead><tr><th></th>${P.map(p => `<th class="num">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>` +
    row('保守分數（Elo − 波動 σ）', s => Math.round(s.cons)) + row('對手強度加權（平均對手 − 自己）× 0.25', s => sgn(s.str) + `<span class="text-muted">（平均對手 ${Math.round(s.avgOpp)}）</span>`) +
    row('打低扣分', s => sgn(s.pen) + `<span class="text-muted">（${pct(s.farm)}）</span>`) + row('含金量分數', (s, j) => `<span class="gold-chip${gw === j ? ' win' : ''}">${gw === j ? '勝 ' : ''}${Math.round(s.gold)}</span>`, 'total') + '</tbody>';
}

async function go() {
  const ids = [$('#ia').value.trim(), $('#ib').value.trim()], st = $('#status');
  if (!ids[0] || !ids[1]) { st.textContent = ERR.empty; st.className = 'status err'; return; }
  if (ids[0] === ids[1]) { st.textContent = '請輸入兩位不同的棋手'; st.className = 'status err'; return; }
  $('#go').disabled = true; st.className = 'status'; st.textContent = '讀取兩位棋手的棋譜中…';
  const prog = [0, 0];
  try {
    const res = await Promise.all(ids.map((id, i) => FoxImport.fetchFox(id, n => { prog[i] = n; st.textContent = `讀取中… A ${prog[0]} 盤 · B ${prog[1]} 盤`; }, 600).catch(e => { e.side = 'AB'[i]; throw e; })));
    P = res.map(r => { if (r.games.length < 5) { const e = new Error('nogames'); throw e; } rate(r.games); return { name: r.player || 'UID ' + r.uid, uid: r.uid, games: r.games }; });
    P.forEach(p => p.st = stats(p));
    CATS = DEF.map(([name, desc, dir, f], k) => { const v = P.map(p => p.st.vals[k]); let w = 'skip'; if (v[0] != null && v[1] != null) { const a = Math.round(v[0] * 1000), b = Math.round(v[1] * 1000); w = a === b ? 'tie' : (a > b) === (dir > 0) ? 0 : 1; } return { name, desc, f, v, w }; });
    step = 0;
    $('#sideA').innerHTML = sideHTML(P[0], 0); $('#sideB').innerHTML = sideHTML(P[1], 1);
    $('#hA').textContent = P[0].name; $('#hB').textContent = P[1].name;
    const pa = vsProb(P[0].st.cur, P[1].st.cur);
    $('#odds').innerHTML = `<div style="width:${pa * 100}%;background:var(--color-accent);color:var(--color-bg)">${esc(P[0].name)} ${pct(pa)}</div><div style="width:${(1 - pa) * 100}%;background:var(--color-text);color:var(--color-bg);justify-content:flex-end">${pct(1 - pa)} ${esc(P[1].name)}</div>`;
    const h = P[0].games.filter(g => g.oppUid === P[1].uid), hw = h.filter(g => g.win).length;
    $('#h2h').textContent = h.length ? `兩人在公開對局中直接交手 ${h.length} 盤，${P[0].name} ${hw} 勝 ${h.length - hw} 負。` : '兩人在讀取到的公開對局中沒有直接交手紀錄。';
    $('#out').hidden = false; drawCurves(); renderCats();
    const d = new Date(); st.textContent = `資料更新於 ${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · ${P[0].name} ${P[0].st.n} 盤、${P[1].name} ${P[1].st.n} 盤`;
    history.replaceState(null, '', `?a=${ids[0]}&b=${ids[1]}`);
  } catch (e) { st.className = 'status err'; st.textContent = (e.side ? `棋手 ${e.side}：` : '') + (ERR[e.message] || '讀取失敗，請稍後再試'); }
  $('#go').disabled = false;
}
const tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip);
const showTip = (el, x, y) => { tip.innerHTML = el.dataset.tip; tip.classList.add('on'); const w = tip.offsetWidth; tip.style.left = Math.min(x + 14, innerWidth - w - 8) + 'px'; tip.style.top = (y + 14) + 'px'; };
document.addEventListener('mousemove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else tip.classList.remove('on'); });
document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left, r.bottom); } });
document.addEventListener('focusout', () => tip.classList.remove('on'));
$('#go').addEventListener('click', go);
['#ia', '#ib'].forEach(s => $(s).addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
$('#next').addEventListener('click', () => { step = Math.min(CATS.length, step + 1); renderCats(); });
$('#all').addEventListener('click', () => { step = CATS.length; renderCats(); });
let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (P.length) drawCurves(); }, 80); }).observe($('.wrap'));
const q = new URLSearchParams(location.search), qa = q.get('a'), qb = q.get('b');
if (qa) $('#ia').value = qa; else { try { const u = localStorage.getItem('foxTracker.uid'); if (u) $('#ia').value = u; } catch (e) {} }
if (qb) $('#ib').value = qb;
if (qa && qb) go();
})();
