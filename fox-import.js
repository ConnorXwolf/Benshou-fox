(() => {
const rankOf = s => {
  if (!s) return null; s = String(s).trim();
  let m = s.match(/(\d+)\s*(段|d|D|dan)/); if (m) return Math.min(10, +m[1]);
  m = s.match(/(\d+)\s*(级|級|k|K|kyu)/); if (m) return 1 - +m[1];
  if (/^P|职业|職業|pro/i.test(s)) return 10;
  m = s.match(/^\d+$/); return m ? +s : null;
};
const parseDate = s => {
  const m = String(s || '').match(/(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return { t: new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0).getTime(), hasTime: !!m[4] };
};
const tcOf = sec => sec == null || isNaN(sec) ? null : sec <= 180 ? '快棋' : sec <= 900 ? '一般' : '慢棋';
const decode = buf => { try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { try { return new TextDecoder('gbk').decode(buf); } catch (e2) { return new TextDecoder().decode(buf); } } };

function sgfProps(txt) {
  const head = txt.slice(0, (txt.search(/;\s*[BW]\[/) + 1 || txt.length + 1) - 1), p = {};
  head.replace(/\b([A-Z]{1,2})\s*\[((?:\\.|[^\]\\])*)\]/g, (_, k, v) => { if (!(k in p)) p[k] = v.replace(/\\(.)/g, '$1').trim(); });
  return p;
}
const endOf = re => { const s = String(re || '').trim(); return /\+(R|Resign)/i.test(s) || /中盘|中盤/.test(s) ? 'R' : /\+(T|Time)/i.test(s) || /超时|超時/.test(s) ? 'T' : /\+\d/.test(s) || /目|子/.test(s) ? 'C' : 'O'; };
const tcOfSGF = p => { const tm = parseFloat(p.TM), tt = parseFloat(p.TT); if (isNaN(tm)) return null; const v = tm + (isNaN(tt) ? 0 : tt * 3); return v <= 300 ? '快棋' : v <= 1500 ? '一般' : '慢棋'; };
function winnerOf(re) {
  if (!re) return null; const s = re.trim();
  if (/^B\+/i.test(s) || /黑.*(胜|勝)/.test(s) || /白.*(负|負)/.test(s)) return 'B';
  if (/^W\+/i.test(s) || /白.*(胜|勝)/.test(s) || /黑.*(负|負)/.test(s)) return 'W';
  return null;
}

function parseSGFs(files, name) {
  const recs = [];
  files.forEach(f => { const p = sgfProps(f.text); if (p.PB || p.PW) recs.push({ p, file: f.name }); });
  name = (name || '').trim();
  let matched = name ? recs.filter(r => r.p.PB === name || r.p.PW === name).length : 0;
  if (!name || matched < recs.length / 2) {
    const c = {}; recs.forEach(r => [r.p.PB, r.p.PW].forEach(n => n && (c[n] = (c[n] || 0) + 1)));
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    if (top) name = top[0];
  }
  const games = []; let skipped = files.length - recs.length, noTime = false;
  recs.forEach(({ p }) => {
    const color = p.PB === name ? 'B' : p.PW === name ? 'W' : null;
    const win = winnerOf(p.RE), d = parseDate(p.DT);
    const oppDan = rankOf(color === 'B' ? p.WR : p.BR), fox = rankOf(color === 'B' ? p.BR : p.WR);
    if (!color || !win || !d || oppDan == null) { skipped++; return; }
    if (!d.hasTime) noTime = true;
    games.push({ nt: !d.hasTime, t: d.t, oppDan, color, win: win === color, fox, tc: tcOfSGF(p), end: endOf(p.RE) });
  });
  return { games, skipped, player: name, noTime };
}

const COLS = { date: /^(日期|date)$/i, time: /^(時間|时间|time)$/i, opp: /^(對手段位|对手段位|對手|对手|opp(onent)?_?rank)$/i, color: /^(執子|执子|顏色|颜色|color)$/i, result: /^(結果|结果|勝負|胜负|result)$/i, tc: /^(用時|用时|用時制|用时制|time_?control)$/i, mine: /^(我的段位|段位|my_?rank|rank)$/i, end: /^(勝負方式|胜负方式|結束方式|结束方式|end|method)$/i };
function splitCSV(line) { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if ((ch === ',' || ch === '\t') && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; }
function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  const head = splitCSV(lines[0] || ''), idx = {};
  head.forEach((h, i) => { for (const k in COLS) if (COLS[k].test(h)) idx[k] = i; });
  if (idx.date == null || idx.opp == null || idx.color == null || idx.result == null) return { games: [], skipped: lines.length, error: 'CSV 需要「日期、對手段位、執子、結果」欄位' };
  const games = []; let skipped = 0, noTime = false;
  lines.slice(1).forEach(l => {
    const c = splitCSV(l), d = parseDate(c[idx.date] + (idx.time != null ? ' ' + c[idx.time] : ''));
    const col = /^(黑|b|black)$/i.test(c[idx.color]) ? 'B' : /^(白|w|white)$/i.test(c[idx.color]) ? 'W' : null;
    const res = c[idx.result] || '', win = /^(勝|胜|w|win|1|贏|赢)$/i.test(res) ? true : /^(負|负|l|loss|lose|0|輸|输)$/i.test(res) ? false : null;
    const oppDan = rankOf(c[idx.opp]);
    if (!d || !col || win == null || oppDan == null) { skipped++; return; }
    if (!d.hasTime) noTime = true;
    const tc = idx.tc != null ? (['快棋', '一般', '慢棋'].includes(c[idx.tc]) ? c[idx.tc] : tcOf(parseFloat(c[idx.tc]))) : null;
    games.push({ nt: !d.hasTime, t: d.t, oppDan, color: col, win, tc, fox: idx.mine != null ? rankOf(c[idx.mine]) : null, end: idx.end != null ? ({ 中盤: 'R', 中盘: 'R', 數子: 'C', 数子: 'C', 超時: 'T', 超时: 'T' }[c[idx.end]] || 'O') : null });
  });
  return { games, skipped, noTime };
}

async function importFiles(fileList, name) {
  const files = await Promise.all([...fileList].map(async f => ({ name: f.name, text: decode(await f.arrayBuffer()) })));
  const sgf = files.filter(f => /\.sgf$/i.test(f.name) || /^\s*\(\s*;/.test(f.text)), csv = files.filter(f => !sgf.includes(f));
  const a = parseSGFs(sgf, name), out = { games: a.games, skipped: a.skipped, player: sgf.length ? a.player : (name || ''), noTime: a.noTime, error: null };
  csv.forEach(f => { const r = parseCSV(f.text); out.games.push(...r.games); out.skipped += r.skipped; out.noTime = out.noTime || r.noTime; if (r.error) out.error = r.error; });
  out.noTime = out.games.every(g => g.nt);
  const seen = new Set();
  out.games = out.games.sort((x, y) => x.t - y.t).filter(g => { const k = [g.t, g.oppDan, g.color, g.win].join('|'); if (seen.has(k) && !out.noTime) return false; seen.add(k); return true; });
  return { out, files };
}
const API = 'https://h5.foxwq.com/yehuDiamond/chessbook_local/YHWQFetchChessList';
const foxDan = d => d >= 100 ? 10 : Math.min(9, d - 17);
const tcByPace = c => { const s = (+c.gameendtime - +c.gamestarttime) / Math.max(1, c.movenum); return c.movenum < 40 || !(s > 0) ? null : s <= 5 ? '快棋' : s <= 12 ? '一般' : '慢棋'; };
const USER_Q = 'srcuid=0&dstuid=0&dstuin=0&accounttype=0&clienttype=0&username=';
async function lookupUid(nick) {
  const tries = [];
  if (window.FOX_PROXY) tries.push(window.FOX_PROXY.replace(/\/$/, '') + '/user?name=' + encodeURIComponent(nick));
  tries.push('https://h5.foxwq.com/getFechInfo/wxnseed/txwq_fetch_personal_info?' + USER_Q + encodeURIComponent(nick));
  for (const u of tries) {
    let j; try { j = await (await fetch(u)).json(); } catch (e) { continue; }
    if (!j.uid || String(j.uid) === '0') throw new Error('notfound');
    return String(j.uid);
  }
  throw new Error(window.FOX_PROXY ? 'proxy' : 'nick');
}
async function fetchFox(input, onProgress, maxGames = 1000, opts = {}) {
  const okBoard = opts.beginner ? c => (c.boardsize === 9 || c.boardsize === 13) && c.additionalrule !== 2 : c => c.boardsize === 19;
  input = String(input || '').trim(); if (!input) throw new Error('empty');
  let uid = /^\d+$/.test(input) ? input : null;
  if (!uid) { try { uid = await lookupUid(input); } catch (e) { throw new Error(e.message === 'notfound' ? 'notfound' : 'nick'); } }
  const seen = new Set(), raw = []; let last = 0;
  for (let page = 0; page < (opts.beginner ? 30 : 20) && raw.length < (opts.beginner ? maxGames * 2 : maxGames); page++) {
    const r = await fetch(`${API}?srcuid=0&dstuid=${uid}&type=1&lastcode=0&lastCode=${last || ''}&searchkey=&uin=${uid}`);
    const j = await r.json(), list = (j.chesslist || []).filter(c => !seen.has(c.chessid));
    if (!list.length) break;
    list.forEach(c => { seen.add(c.chessid); raw.push(c); });
    last = list[list.length - 1].chessid; onProgress && onProgress(raw.length);
  }
  if (!raw.length) throw new Error('nogames');
  let player = '', skipped = 0; const games = [], bs = { 9: 0, 13: 0, 19: 0, all: 0 };
  raw.forEach(c => {
    const me = String(c.blackuid) === uid ? 'B' : String(c.whiteuid) === uid ? 'W' : null;
    if (me) { bs.all++; if (bs[c.boardsize] != null) bs[c.boardsize]++; }
    if (me && !player) player = me === 'B' ? c.blacknick : c.whitenick;
    if (!me || !(c.winner === 1 || c.winner === 2) || c.handicap > 0 || !okBoard(c)) { skipped++; return; }
    const t = +c.gamestarttime * 1000 || new Date(c.starttime.replace(' ', 'T')).getTime();
    const myDan = me === 'B' ? c.blackdan : c.whitedan, opDan = me === 'B' ? c.whitedan : c.blackdan;
    games.push({ t, oppDan: foxDan(opDan, false), color: me, win: (c.winner === 1) === (me === 'B'), fox: foxDan(myDan, false), tc: tcByPace(c), id: c.chessid, end: c.point >= 0 ? 'C' : c.point === -1 ? 'R' : c.point === -2 ? 'T' : 'O', oppUid: String(me === 'B' ? c.whiteuid : c.blackuid), oppNick: me === 'B' ? c.whitenick : c.blacknick });
  });
  games.sort((x, y) => x.t - y.t);
  return { games, skipped, player, uid, bs, noTime: false, fetchedAt: Date.now() };
}
window.FoxImport = { importFiles, parseSGFs, rankOf, fetchFox };
})();
