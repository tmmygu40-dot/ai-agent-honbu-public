// ---- state ----
let participants = [];

// ---- persistence ----
function save() {
  localStorage.setItem('seatApp_participants', JSON.stringify(participants));
  localStorage.setItem('seatApp_tableCount', document.getElementById('tableCount').value);
  localStorage.setItem('seatApp_tableCapacity', document.getElementById('tableCapacity').value);
}

function load() {
  const p = localStorage.getItem('seatApp_participants');
  if (p) participants = JSON.parse(p);
  const tc = localStorage.getItem('seatApp_tableCount');
  const cap = localStorage.getItem('seatApp_tableCapacity');
  if (tc) document.getElementById('tableCount').value = tc;
  if (cap) document.getElementById('tableCapacity').value = cap;
}

// ---- render participants ----
function renderParticipants() {
  const list = document.getElementById('participantList');
  if (participants.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;font-size:.85rem;">参加者を追加してください</p>';
    return;
  }
  list.innerHTML = participants.map((p, i) => `
    <div class="participant-item">
      <div class="info">
        <span>${escHtml(p.name)}</span>
        <span class="group-tag">${escHtml(p.group || 'グループなし')}</span>
      </div>
      <button class="del-btn" onclick="deleteParticipant(${i})">×</button>
    </div>
  `).join('');
}

// ---- add participant ----
document.getElementById('addBtn').addEventListener('click', addParticipant);
document.getElementById('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addParticipant();
});
document.getElementById('groupInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addParticipant();
});

function addParticipant() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) { alert('名前を入力してください'); return; }
  const group = document.getElementById('groupInput').value.trim() || 'グループなし';
  participants.push({ name, group });
  document.getElementById('nameInput').value = '';
  document.getElementById('groupInput').value = '';
  document.getElementById('nameInput').focus();
  save();
  renderParticipants();
  hideResult();
}

// ---- delete participant ----
function deleteParticipant(index) {
  participants.splice(index, 1);
  save();
  renderParticipants();
  hideResult();
}

// ---- assign ----
document.getElementById('assignBtn').addEventListener('click', assign);

function assign() {
  if (participants.length === 0) {
    alert('参加者を登録してください');
    return;
  }
  const tableCount = parseInt(document.getElementById('tableCount').value) || 3;
  const capacity = parseInt(document.getElementById('tableCapacity').value) || 4;

  // グループごとにまとめてシャッフル
  const groups = {};
  participants.forEach(p => {
    const g = p.group || 'グループなし';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });

  // グループ内をシャッフル
  Object.values(groups).forEach(arr => shuffleArray(arr));

  // テーブルを初期化
  const tables = Array.from({ length: tableCount }, (_, i) => ({
    label: `テーブル ${i + 1}`,
    seats: []
  }));

  // グループごとに同じテーブルへ優先配置（収まらない場合は分散）
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  const overflow = [];

  for (const [, members] of sortedGroups) {
    let placed = false;
    // 一括で入るテーブルを探す
    for (const t of tables) {
      if (t.seats.length + members.length <= capacity) {
        members.forEach(m => t.seats.push(m));
        placed = true;
        break;
      }
    }
    if (!placed) {
      // 分散配置
      members.forEach(m => {
        const t = tables.slice().sort((a, b) => a.seats.length - b.seats.length)[0];
        if (t.seats.length < capacity) {
          t.seats.push(m);
        } else {
          overflow.push(m);
        }
      });
    }
  }

  renderResult(tables, overflow, capacity);
  save();
}

// ---- render result ----
function renderResult(tables, overflow, capacity) {
  const section = document.getElementById('resultSection');
  const list = document.getElementById('resultList');
  section.classList.remove('hidden');

  let html = tables.map(t => `
    <div class="table-block">
      <h3>${escHtml(t.label)}（${t.seats.length}/${capacity}人）</h3>
      <div class="seat-list">
        ${t.seats.length === 0
          ? '<span class="no-assign">空席</span>'
          : t.seats.map(p => `<span class="seat-chip">${escHtml(p.name)}<span class="g">${escHtml(p.group)}</span></span>`).join('')
        }
      </div>
    </div>
  `).join('');

  if (overflow.length > 0) {
    html += `<p class="overflow-note">⚠ テーブルに収まらなかった参加者：${overflow.map(p => escHtml(p.name)).join('、')}</p>`;
  }

  list.innerHTML = html;
}

function hideResult() {
  document.getElementById('resultSection').classList.add('hidden');
}

// ---- reset ----
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('参加者リストと割り当て結果をリセットしますか？')) return;
  participants = [];
  save();
  renderParticipants();
  hideResult();
});

// ---- utils ----
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- init ----
load();
renderParticipants();
