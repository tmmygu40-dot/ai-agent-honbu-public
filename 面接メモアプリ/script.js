const STORAGE_KEY = 'interview_memo_candidates';

let candidates = [];
let editingId = null;
let modalId = null;

function load() {
  try {
    candidates = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    candidates = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getResultLabel(result) {
  const map = { pass: '合格', fail: '不合格', hold: '保留', '': '未定' };
  return map[result] || '未定';
}

function getBadgeClass(result) {
  const map = { pass: 'badge-pass', fail: 'badge-fail', hold: 'badge-hold', '': 'badge-none' };
  return map[result] || 'badge-none';
}

function saveCandidate() {
  const name = document.getElementById('name').value.trim();
  const date = document.getElementById('date').value;

  if (!name) {
    alert('名前を入力してください');
    return;
  }

  const data = {
    id: editingId || generateId(),
    name,
    date,
    position: document.getElementById('position').value.trim(),
    impression: document.getElementById('impression').value.trim(),
    strength: document.getElementById('strength').value.trim(),
    concern: document.getElementById('concern').value.trim(),
    result: document.getElementById('result').value,
    createdAt: editingId
      ? (candidates.find(c => c.id === editingId)?.createdAt || Date.now())
      : Date.now(),
  };

  if (editingId) {
    const idx = candidates.findIndex(c => c.id === editingId);
    if (idx !== -1) candidates[idx] = data;
    editingId = null;
  } else {
    candidates.unshift(data);
  }

  save();
  resetForm();
  renderList();
}

function resetForm() {
  ['name', 'date', 'position', 'impression', 'strength', 'concern'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('result').value = '';
  document.getElementById('form-title').textContent = '候補者を登録';
  document.getElementById('save-btn').textContent = '登録する';
  document.getElementById('cancel-btn').style.display = 'none';
  editingId = null;
}

function cancelEdit() {
  resetForm();
}

function deleteCandidate(id) {
  if (!confirm('この候補者を削除しますか？')) return;
  candidates = candidates.filter(c => c.id !== id);
  save();
  renderList();
}

function openModal(id) {
  const c = candidates.find(c => c.id === id);
  if (!c) return;
  modalId = id;

  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <div class="modal-name">${esc(c.name)}</div>
    <div class="modal-meta">
      ${c.date ? formatDate(c.date) + '　' : ''}
      ${c.position ? esc(c.position) + '　' : ''}
      <span class="badge ${getBadgeClass(c.result)}">${getResultLabel(c.result)}</span>
    </div>
    ${modalSection('印象', c.impression)}
    ${modalSection('強み', c.strength)}
    ${modalSection('懸念点', c.concern)}
  `;

  document.getElementById('modal').classList.add('open');
}

function modalSection(title, text) {
  if (!text) return '';
  return `
    <div class="modal-section">
      <div class="modal-section-title">${title}</div>
      <div class="modal-section-body">${esc(text)}</div>
    </div>
  `;
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modal')) return;
  document.getElementById('modal').classList.remove('open');
  modalId = null;
}

function editFromModal() {
  document.getElementById('modal').classList.remove('open');
  const c = candidates.find(c => c.id === modalId);
  if (!c) return;
  editingId = c.id;

  document.getElementById('name').value = c.name;
  document.getElementById('date').value = c.date || '';
  document.getElementById('position').value = c.position || '';
  document.getElementById('impression').value = c.impression || '';
  document.getElementById('strength').value = c.strength || '';
  document.getElementById('concern').value = c.concern || '';
  document.getElementById('result').value = c.result || '';

  document.getElementById('form-title').textContent = '候補者を編集';
  document.getElementById('save-btn').textContent = '更新する';
  document.getElementById('cancel-btn').style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
  modalId = null;
}

function deleteFromModal() {
  const id = modalId;
  document.getElementById('modal').classList.remove('open');
  modalId = null;
  deleteCandidate(id);
}

function renderList() {
  const searchVal = document.getElementById('search').value.toLowerCase();
  const filterResult = document.getElementById('filter-result').value;

  let filtered = candidates.filter(c => {
    const matchSearch = !searchVal ||
      c.name.toLowerCase().includes(searchVal) ||
      (c.position || '').toLowerCase().includes(searchVal);
    const matchResult = !filterResult || c.result === filterResult;
    return matchSearch && matchResult;
  });

  const list = document.getElementById('candidate-list');
  const countLabel = document.getElementById('count-label');

  countLabel.textContent = `${filtered.length} 件`;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">候補者はまだいません</div>';
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="candidate-card" onclick="openModal('${c.id}')">
      <div class="card-info">
        <div class="card-name">${esc(c.name)}</div>
        <div class="card-meta">
          ${c.date ? formatDate(c.date) : '日付なし'}
          ${c.position ? '　' + esc(c.position) : ''}
        </div>
      </div>
      <span class="badge ${getBadgeClass(c.result)}">${getResultLabel(c.result)}</span>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
load();
// 今日の日付をデフォルトに
const today = new Date().toISOString().slice(0, 10);
document.getElementById('date').value = today;
renderList();
