(() => {
const $ = s => document.querySelector(s);
const API = 'https://h5.foxwq.com/yehuDiamond/chessbook_local/';
const rk = dan => { if (dan >= 100) return '職業 ' + (dan - 99) + ' 段'; const d = Math.min(9, dan - 17); return d >= 1 ? d + ' 段' : (1 - d) + ' 級'; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const status = (t, err) => { const s = $('#status'); s.textContent = t; s.className = 'status' + (err ? ' err' : ''); };
const timed = (u, ms) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); return fetch(u, { signal: ac.signal }).finally(() => clearTimeout(t)); };

function chessIdOf(text) {
  const m = text.match(/chessid=(\d{15,22})/i) || text.match(/\b(\d{18,20})\b/);
  return m ? m[1] : null;
}
async function find(id) {
  const next = (BigInt(id) + 1n).toString();
  const hits = await Promise.all([3, 1, 2, 4].map(async t => {
    try {
      const j = await (await timed(`${API}YHWQFetchChessList?srcuid=0&dstuid=0&type=${t}&lastcode=0&lastCode=${next}&searchkey=&uin=0`, 8000)).json();
      return (j.chesslist || []).find(c => c.chessid === id) || null;
    } catch (e) { return null; }
  }));
  return hits.find(Boolean) || null;
}
function card(side, nick, uid, dan) {
  return `<div class="player"><span class="lbl">${side}</span><div class="player-name">${esc(nick)}<small>${rk(dan)}</small></div><span class="lbl" style="margin-top:var(--space-2)">UID</span><div class="uid">${uid}</div><div class="form-row"><a class="btn btn-primary" href="野狐棋力追蹤.html?uid=${uid}">這是我，讀取棋譜</a><button type="button" class="btn btn-secondary" data-copy="${uid}">複製 UID</button></div></div>`;
}
async function go() {
  const id = chessIdOf($('#link').value);
  $('#out').hidden = true;
  if (!id) { status('找不到棋局編號，請確認貼上的是野狐分享連結', true); return; }
  $('#go').disabled = true; status('查詢中…');
  const c = await find(id);
  $('#go').disabled = false;
  if (!c) { status('在公開對局中找不到這一盤，請換一盤最近下的棋再試', true); return; }
  status('找到了，請選出你是哪一方');
  const res = c.winner === 1 ? '黑勝' : c.winner === 2 ? '白勝' : '和棋';
  $('#game').textContent = `棋局 ${id} · ${c.starttime} · ${res} · ${c.movenum} 手`;
  $('#players').innerHTML = card('黑方', c.blacknick, c.blackuid, c.blackdan) + card('白方', c.whitenick, c.whiteuid, c.whitedan);
  $('#out').hidden = false;
}
$('#go').addEventListener('click', go);
const goUid = () => { const v = $('#uidIn').value.replace(/\D/g, ''); if (v.length >= 5) location.href = '野狐棋力追蹤.html?uid=' + v; else $('#uidIn').focus(); };
$('#uidGo').addEventListener('click', goUid);
$('#uidIn').addEventListener('keydown', e => { if (e.key === 'Enter') goUid(); });
$('#link').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) go(); });
$('#link').addEventListener('paste', () => setTimeout(() => { if (chessIdOf($('#link').value)) go(); }, 0));
$('#players').addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = '已複製'; } catch (err) { b.textContent = b.dataset.copy; }
  setTimeout(() => { b.textContent = '複製 UID'; }, 1600);
});
})();
