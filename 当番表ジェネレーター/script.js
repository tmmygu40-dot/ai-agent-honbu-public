// ---- State ----
let members = [];      // [{ id, name, role }]
let currentIndex = -1; // 現在の当番インデックス（-1 = 未開始）
let history = [];      // [{ name, role, date }]

// ---- Init ----
function init() {
  const saved = localStorage.getItem('tbl_members');
  const savedIndex = localStorage.getItem('tbl_currentIndex');
  const savedHistory = localStorage.getItem('tbl_history');
  if (saved) members = JSON.parse(saved);
  if (savedIndex !== null) currentIndex = parseInt(savedIndex, 10);
  if (savedHistory) history = JSON.parse(savedHistory);
  renderAll();
}

// ---- Save ----
function save() {
  localStorage.setItem('tbl_members', JSON.stringify(members));
  localStorage.setItem('tbl_currentIndex', String(currentIndex));
  localStorage.setItem('tbl_history', JSON.stringify(history));
}

// ---- Render ----
function renderAll() {
  renderMembers();
  renderCurrentTurn();
  renderHistory();
}

function renderMembers() {
  const ul = document.getElementById('memberList');
  document.getElementById('memberCount').textContent = members.length;

  if (members.length === 0) {
    ul.innerHTML = '<li class="empty-msg">メンバーを登録してください</li>';
    return;
  }

  ul.innerHTML = members.map((m, i) => {
    const isActive = (i === currentIndex);
    return `<li class="${isActive ? 'active-member' : ''}">
      <span class="member-info">
        <span class="member-name">${escHtml(m.name)}</span>
        ${m.role ? `<span class="member-role">${escHtml(m.role)}</span>` : ''}
      </span>
      <button class="delete-btn" onclick="deleteMember('${m.id}')" title="削除">×</button>
    </li>`;
  }).join('');
}

function renderCurrentTurn() {
  const div = document.getElementById('currentTurn');
  if (members.length === 0 || currentIndex < 0) {
    div.innerHTML = '<span class="no-data">メンバーを登録して当番を開始してください</span>';
    return;
  }
  const idx = currentIndex % members.length;
  const m = members[idx];
  const now = formatDate(new Date());
  div.innerHTML = `
    <span class="turn-name">${escHtml(m.name)}</span>
    ${m.role ? `<span class="turn-role">${escHtml(m.role)}</span>` : ''}
    <span class="turn-date">${now}</span>
  `;
}

function renderHistory() {
  const ul = document.getElementById('historyList');
  if (history.length === 0) {
    ul.innerHTML = '<li class="empty-msg">履歴はまだありません</li>';
    return;
  }
  ul.innerHTML = [...history].reverse().map((h, i) => {
    const num = history.length - i;
    return `<li>
      <span class="history-num">#${num}</span>
      <span class="history-name">${escHtml(h.name)}</span>
      ${h.role ? `<span class="history-role">${escHtml(h.role)}</span>` : ''}
      <span class="history-date">${h.date}</span>
    </li>`;
  }).join('');
}

// ---- Actions ----
function addMember() {
  const nameInput = document.getElementById('memberName');
  const roleInput = document.getElementById('memberRole');
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();

  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = '#e74c3c';
    setTimeout(() => { nameInput.style.borderColor = ''; }, 1000);
    return;
  }

  members.push({ id: Date.now().toString(), name, role });
  nameInput.value = '';
  roleInput.value = '';
  nameInput.focus();

  // 最初のメンバー追加時は index を 0 にセット
  if (members.length === 1) currentIndex = 0;

  save();
  renderAll();
}

function deleteMember(id) {
  const idx = members.findIndex(m => m.id === id);
  if (idx === -1) return;

  members.splice(idx, 1);

  // currentIndex の補正
  if (members.length === 0) {
    currentIndex = -1;
  } else {
    if (currentIndex >= members.length) currentIndex = 0;
  }

  save();
  renderAll();
}

function nextTurn() {
  if (members.length === 0) return;

  // 最初の呼び出し（currentIndex が -1）の場合は 0 から開始
  if (currentIndex < 0) {
    currentIndex = 0;
  } else {
    currentIndex = (currentIndex + 1) % members.length;
  }

  const m = members[currentIndex];
  history.push({ name: m.name, role: m.role, date: formatDate(new Date()) });

  save();
  renderAll();
}

function resetTurn() {
  if (members.length === 0) return;
  currentIndex = 0;
  save();
  renderAll();
}

function clearHistory() {
  if (!confirm('履歴を全件削除しますか？')) return;
  history = [];
  save();
  renderHistory();
}

// ---- Utils ----
function formatDate(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${day} ${h}:${mi}`;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Enterキーでメンバー追加
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('memberName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('memberRole').focus();
  });
  document.getElementById('memberRole').addEventListener('keydown', e => {
    if (e.key === 'Enter') addMember();
  });
  init();
});
