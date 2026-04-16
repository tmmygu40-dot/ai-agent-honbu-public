const STORAGE_KEY = 'league_manager';

let state = {
  teams: [],   // string[]
  matches: []  // { id, home, away, homeScore, awayScore }
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = JSON.parse(saved);
  } catch (e) {
    state = { teams: [], matches: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- チーム ---

function addTeam() {
  const input = document.getElementById('teamNameInput');
  const name = input.value.trim();
  if (!name) return;
  if (state.teams.includes(name)) {
    alert('同じ名前のチームがすでにあります');
    return;
  }
  state.teams.push(name);
  input.value = '';
  saveState();
  renderAll();
}

function removeTeam(name) {
  if (!confirm(`「${name}」を削除しますか？\n関連する試合結果もすべて削除されます。`)) return;
  state.teams = state.teams.filter(t => t !== name);
  state.matches = state.matches.filter(m => m.home !== name && m.away !== name);
  saveState();
  renderAll();
}

function renderTeamList() {
  const ul = document.getElementById('teamList');
  ul.innerHTML = '';
  if (state.teams.length === 0) {
    ul.innerHTML = '<li class="empty-msg">チームがまだ登録されていません</li>';
    return;
  }
  state.teams.forEach(name => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escHtml(name)}</span><button onclick="removeTeam('${escAttr(name)}')" title="削除">✕</button>`;
    ul.appendChild(li);
  });
}

function renderTeamSelects() {
  const home = document.getElementById('homeTeam');
  const away = document.getElementById('awayTeam');
  const prevHome = home.value;
  const prevAway = away.value;

  [home, away].forEach(sel => {
    sel.innerHTML = '';
    if (state.teams.length < 2) {
      sel.innerHTML = '<option value="">（チームを2つ以上登録）</option>';
      return;
    }
    state.teams.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  });

  if (state.teams.includes(prevHome)) home.value = prevHome;
  if (state.teams.includes(prevAway) && prevAway !== home.value) away.value = prevAway;
  // デフォルトで2チーム目を awayTeam に
  if (home.value === away.value && state.teams.length >= 2) {
    const idx = state.teams.indexOf(home.value);
    away.value = state.teams[idx === state.teams.length - 1 ? 0 : idx + 1];
  }
}

// --- 試合結果 ---

function addMatch() {
  const home = document.getElementById('homeTeam').value;
  const away = document.getElementById('awayTeam').value;
  const hs = parseInt(document.getElementById('homeScore').value, 10);
  const as = parseInt(document.getElementById('awayScore').value, 10);

  if (!home || !away) { alert('チームを選択してください'); return; }
  if (home === away) { alert('ホームとアウェイが同じチームです'); return; }
  if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) { alert('スコアを正しく入力してください'); return; }

  state.matches.push({ id: Date.now(), home, away, homeScore: hs, awayScore: as });
  document.getElementById('homeScore').value = 0;
  document.getElementById('awayScore').value = 0;
  saveState();
  renderAll();
}

function removeMatch(id) {
  state.matches = state.matches.filter(m => m.id !== id);
  saveState();
  renderAll();
}

function renderMatchList() {
  const ul = document.getElementById('matchList');
  ul.innerHTML = '';
  if (state.matches.length === 0) {
    ul.innerHTML = '<li class="empty-msg">試合結果がまだありません</li>';
    return;
  }
  [...state.matches].reverse().forEach(m => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="match-info">${escHtml(m.home)} ${m.homeScore} – ${m.awayScore} ${escHtml(m.away)}</span>
      <button onclick="removeMatch(${m.id})" title="削除">✕</button>
    `;
    ul.appendChild(li);
  });
}

// --- 順位表計算 ---

function calcStandings() {
  const table = {};
  state.teams.forEach(name => {
    table[name] = { name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
  });

  state.matches.forEach(m => {
    if (!table[m.home] || !table[m.away]) return;
    const h = table[m.home];
    const a = table[m.away];
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      h.won++; a.lost++;
    } else if (m.homeScore < m.awayScore) {
      a.won++; h.lost++;
    } else {
      h.drawn++; a.drawn++;
    }
  });

  return Object.values(table).sort((a, b) => {
    const pa = a.won * 3 + a.drawn;
    const pb = b.won * 3 + b.drawn;
    if (pb !== pa) return pb - pa;
    const gda = a.gf - a.ga;
    const gdb = b.gf - b.ga;
    if (gdb !== gda) return gdb - gda;
    return b.gf - a.gf;
  });
}

function renderStandings() {
  const tbody = document.getElementById('standingsBody');
  tbody.innerHTML = '';

  if (state.teams.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-msg" style="padding:12px;text-align:center;">チームを登録してください</td></tr>';
    return;
  }

  const rows = calcStandings();
  rows.forEach((r, i) => {
    const pts = r.won * 3 + r.drawn;
    const gd = r.gf - r.ga;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escHtml(r.name)}</td>
      <td>${r.played}</td>
      <td>${r.won}</td>
      <td>${r.drawn}</td>
      <td>${r.lost}</td>
      <td>${r.gf}</td>
      <td>${r.ga}</td>
      <td>${gd > 0 ? '+' : ''}${gd}</td>
      <td><strong>${pts}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAll() {
  renderTeamList();
  renderTeamSelects();
  renderMatchList();
  renderStandings();
}

// --- リセット ---

function resetAll() {
  if (!confirm('全データをリセットします。よろしいですか？')) return;
  state = { teams: [], matches: [] };
  saveState();
  renderAll();
}

// --- ユーティリティ ---

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'");
}

// --- 初期化 ---

document.getElementById('addTeamBtn').addEventListener('click', addTeam);
document.getElementById('teamNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTeam();
});
document.getElementById('addMatchBtn').addEventListener('click', addMatch);
document.getElementById('resetBtn').addEventListener('click', resetAll);

loadState();
renderAll();
