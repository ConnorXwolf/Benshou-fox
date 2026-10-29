(() => {
const DAY = 864e5, Q = 173.7178, OPP_RD = 60;
const danR = d => 1400 + 100 * d;
const rk = d => d >= 10 ? '職業' : d >= 1 ? d + ' 段' : (1 - d) + ' 級';
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
  return { r: 1500 + Q * (mu + np * np * g * (s - E)), rd: Math.min(350, Q * np), sig: ns };
}
function rate(games) {
  const f0 = games.find(g => g.fox != null), base = f0 ? f0.fox : 4;
  let e = danR(base), lf = base, sl = 0, lt = null; const hist = [];
  games.forEach((g, i) => {
    if (g.fox == null) g.fox = lf; lf = g.fox;
    if (lt == null || g.t - lt > 90 * 6e4) sl = 0; g.prevL = sl; sl = g.win ? 0 : sl + 1; lt = g.t;
    const E = 1 / (1 + 10 ** ((danR(g.oppDan) - e) / 400)), K = i < 30 ? 40 : 20, b = e;
    e += K * ((g.win ? 1 : 0) - E); hist.push(e);
    const w = hist.slice(-30), mu = w.reduce((a, v) => a + v, 0) / w.length;
    g.r = e; g.delta = e - b; g.rd = w.length < 5 ? 100 : Math.sqrt(w.reduce((a, v) => a + (v - mu) ** 2, 0) / (w.length - 1));
  });
  games.forEach((g, i) => { if (g.foxAfter == null) g.foxAfter = i < games.length - 1 ? games[i + 1].fox : g.fox; });
  return games;
}
function rateGlicko(games) {
  const f0 = games.find(g => g.fox != null), base = f0 ? f0.fox : 4;
  let r = danR(base), rd = 150, sig = .04, last = null, lf = base, sl = 0, lt = null;
  games.forEach((g, i) => {
    if (g.fox == null) g.fox = lf; lf = g.fox;
    if (lt == null || g.t - lt > 90 * 6e4) sl = 0; g.prevL = sl; sl = g.win ? 0 : sl + 1; lt = g.t;
    const el = last == null ? 1 : Math.max(.05, (g.t - last) / DAY), before = r;
    ({ r, rd, sig } = g2(r, rd, sig, danR(g.oppDan), OPP_RD, g.win ? 1 : 0, el));
    Object.assign(g, { r, rd, delta: r - before }); last = g.t;
  });
  games.forEach((g, i) => { if (g.foxAfter == null) g.foxAfter = i < games.length - 1 ? games[i + 1].fox : g.fox; });
  return games;
}
const vsProb = (a, b) => 1 / (1 + 10 ** ((b.r - a.r) / 400));
const perf = gs => { const w = gs.filter(g => g.win).length, n = gs.length; return n ? danR(0) + gs.reduce((a, g) => a + 100 * g.oppDan, 0) / n + 400 * (2 * w - n) / n : null; };
window.FoxEngine = { DAY, danR, rk, rate, vsProb, perf };
})();
