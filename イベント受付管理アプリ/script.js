const STORAGE_KEY = 'event-participants';

let participants = [];

function load() {
  try {
    participants = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    participants = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
}

// ---- タブ切り替え ----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'checkin') renderCheckin();
  });
});

// ---- 参加者登録 ----
document.getElementById('btn-add').addEventListener('click', addParticipant);
document.getElementById('input-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addParticipant();
});

function addParticipant() {
  const nameEl = document.getElementById('input-name');
  const noteEl = document.getElementById('input-note');
  const name = nameEl.value.trim();
  if (!name) {
    nameEl.focus();
    return;
  }
  participants.push({ id: Date.now(), name, note: noteEl.value.trim(), checked: false, checkedAt: null });
  save();
  nameEl.value = '';
  noteEl.value = '';
  nameEl.focus();
  renderRegister();
}

function renderRegister() {
  const list = document.getElementById('participant-list');
  document.getElementById('total-count').textContent = participants.length;
  if (participants.length === 0) {
    list.innerHTML = '<p class="empty-msg">登録された参加者はいません</p>';
    return;
  }
  list.innerHTML = participants.map((p, idx) => `
    <li class="participant-item">
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        ${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}
      </div>
      <button class="btn-delete" data-idx="${idx}">削除</button>
    </li>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      participants.splice(idx, 1);
      save();
      renderRegister();
    });
  });
}

// ---- 当日受付 ----
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', renderCheckin);

function renderCheckin() {
  const keyword = searchInput.value.trim().toLowerCase();
  const list = document.getElementById('checkin-list');
  const checkedCount = participants.filter(p => p.checked).length;
  document.getElementById('checked-count').textContent = checkedCount;
  document.getElementById('total-count2').textContent = participants.length;

  const filtered = keyword
    ? participants.filter(p => p.name.toLowerCase().includes(keyword))
    : [...participants];

  if (filtered.length === 0) {
    list.innerHTML = keyword
      ? '<p class="empty-msg">一致する参加者が見つかりません</p>'
      : '<p class="empty-msg">参加者が登録されていません</p>';
    return;
  }

  // 未チェックイン → チェックイン済みの順に表示
  filtered.sort((a, b) => {
    if (a.checked === b.checked) return 0;
    return a.checked ? 1 : -1;
  });

  list.innerHTML = filtered.map(p => `
    <li class="checkin-item ${p.checked ? 'checked' : ''}" data-id="${p.id}">
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        ${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}
        ${p.checked && p.checkedAt ? `<div class="time-label">受付済：${p.checkedAt}</div>` : ''}
      </div>
      <button class="btn-checkin" data-id="${p.id}">
        ${p.checked ? '取消' : 'チェックイン'}
      </button>
    </li>
  `).join('');

  list.querySelectorAll('.btn-checkin').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const p = participants.find(x => x.id === id);
      if (!p) return;
      p.checked = !p.checked;
      p.checkedAt = p.checked ? now() : null;
      save();
      renderCheckin();
    });
  });
}

function now() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- 初期化 ----
load();
renderRegister();
