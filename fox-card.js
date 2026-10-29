(() => {
const $ = s => document.querySelector(s);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const F = (w, s) => `${w} ${s}px "Archivo", "Noto Sans TC", system-ui, sans-serif`;
const sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(Math.round(x));
const DAY = 864e5;

async function draw() {
  const V = window.FoxView; if (!V) return;
  await Promise.all([F(800, 64), F(600, 28), F(400, 24)].map(f => document.fonts.load(f, '棋力曲線0123')));
  const cv = $('#cardCv'), c = cv.getContext('2d'), W = 1080, P = 72;
  const ink = css('--color-text'), bg = css('--color-bg'), acc = css('--color-accent'), band = css('--color-accent-200'), mute = css('--color-neutral-700'), rule = css('--color-neutral-400');
  const { G, ALL, CUR, rk, SC } = V, elo = V.sys === 'elo';
  c.fillStyle = bg; c.fillRect(0, 0, W, W);
  c.fillStyle = acc; c.fillRect(0, 0, W, 14);
  c.textBaseline = 'alphabetic'; c.fillStyle = ink;
  c.font = F(800, 30); c.fillText('棋力曲線', P, P + 30);
  c.font = F(400, 24); c.fillStyle = mute; const d = new Date(CUR.t); c.fillText(`截至 ${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`, P + 150, P + 30);
  c.fillStyle = ink; c.font = F(800, 64);
  let name = V.who.replace(/（UID \d+）/, ''); while (c.measureText(name).width > W - 2 * P && name.length > 2) name = name.slice(0, -2) + '…';
  c.fillText(name, P, P + 120);
  const hr = y => { c.fillStyle = rule; c.fillRect(P, y, W - 2 * P, 2); };
  hr(P + 156);
  const cur = SC(CUR), p14 = ALL.filter(g => g.t < CUR.t - 14 * DAY).pop() || ALL[0], d14 = cur - SC(p14);
  const w = G.filter(g => g.win).length;
  const cells = [[elo ? 'ELO 分數' : 'GLICKO-2 分數', String(Math.round(cur)), elo ? '' : '±' + Math.round(2 * CUR.rd), true], ['野狐段位', rk(CUR.foxAfter), '', false], ['近 14 天', sgn(d14), '分', d14 > 0], ['戰績', `${w}–${G.length - w}`, `勝率 ${Math.round(w / G.length * 100)}%`, false]];
  const cw = (W - 2 * P) / 2, ch = 170, y0 = P + 158;
  cells.forEach(([lab, val, sub, hot], i) => {
    const x = P + (i % 2) * cw + (i % 2 ? 28 : 0), y = y0 + Math.floor(i / 2) * ch;
    c.fillStyle = mute; c.font = F(600, 22); c.fillText(lab, x, y + 46);
    c.fillStyle = hot && i === 2 ? css('--color-accent-700') : ink; c.font = F(800, 84); c.fillText(val, x, y + 136);
    if (sub) { const vw = c.measureText(val).width; c.fillStyle = mute; c.font = F(600, 28); c.fillText(sub, x + vw + 12, y + 136); }
  });
  c.fillStyle = rule; c.fillRect(P + cw, y0 + 20, 2, ch * 2 - 40);
  hr(y0 + ch); hr(y0 + ch * 2);
  // curve
  const cy = y0 + ch * 2 + 40, cH = W - cy - 130, xL = P, xR = W - P;
  const pts = G.length > 1 ? G : ALL;
  let lo = Infinity, hi = -Infinity; pts.forEach(g => { lo = Math.min(lo, SC(g) - (elo ? 20 : g.rd), 1400 + 100 * g.fox); hi = Math.max(hi, SC(g) + (elo ? 20 : g.rd), 1400 + 100 * g.fox); });
  lo -= 20; hi += 20;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t, X = t => xL + (t - t0) / (t1 - t0 || 1) * (xR - xL), Y = v => cy + (hi - v) / (hi - lo) * cH;
  c.save(); c.beginPath(); c.rect(xL, cy, xR - xL, cH); c.clip();
  if (!elo) { c.beginPath(); pts.forEach((g, i) => c[i ? 'lineTo' : 'moveTo'](X(g.t), Y(g.r + 2 * g.rd))); for (let i = pts.length - 1; i >= 0; i--) c.lineTo(X(pts[i].t), Y(pts[i].r - 2 * pts[i].rd)); c.closePath(); c.fillStyle = band; c.globalAlpha = .8; c.fill(); c.globalAlpha = 1; }
  c.beginPath(); pts.forEach((g, i) => { const x = X(g.t), y = Y(1400 + 100 * g.fox); if (!i) c.moveTo(x, y); else c.lineTo(x, y); if (g.foxAfter !== g.fox) c.lineTo(x, Y(1400 + 100 * g.foxAfter)); });
  c.strokeStyle = ink; c.lineWidth = 3; c.stroke();
  c.beginPath(); pts.forEach((g, i) => c[i ? 'lineTo' : 'moveTo'](X(g.t), Y(SC(g)))); c.strokeStyle = acc; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke();
  c.restore();
  c.fillStyle = ink; c.fillRect(xL, cy + cH, xR - xL, 3);
  c.fillStyle = mute; c.font = F(400, 22);
  c.fillText(`${pts.length} 盤 · 紅線為${elo ? ' Elo' : ' Glicko-2'} 分數${elo ? '' : '，淺紅為 95% 區間'}，黑線為野狐段位`, xL, cy + cH + 36);
  hr(W - 92);
  c.fillStyle = mute; c.font = F(600, 22); c.fillText('非野狐官方 · 分數由本站依公開棋譜自行計算', P, W - 52);
}
const dlg = $('#cardDlg');
$('#cardBtn').addEventListener('click', async () => { dlg.hidden = false; $('#cardMsg').textContent = '圖卡依目前顯示的評分系統與時間範圍產生。'; await draw(); });
$('#cardClose').addEventListener('click', () => { dlg.hidden = true; });
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') dlg.hidden = true; });
$('#cardDl').addEventListener('click', () => { const a = document.createElement('a'); a.download = '棋力曲線.png'; a.href = $('#cardCv').toDataURL('image/png'); a.click(); });
$('#cardCopy').addEventListener('click', () => {
  $('#cardCv').toBlob(async b => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); $('#cardMsg').textContent = '已複製，可以直接貼到群組。'; } catch (e) { $('#cardMsg').textContent = '這個瀏覽器不支援複製圖片，請改用下載。'; } });
});
})();
