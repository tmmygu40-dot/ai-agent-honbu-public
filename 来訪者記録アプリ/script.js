const STORAGE_KEY = 'visitors_data';
let visitors = [];
let currentFilter = 'all';

// ページ読み込み時
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  setDefaultCheckin();
  renderList();
});

function setDefaultCheckin() {
  const now = new Date();
  const local = toLocalDatetimeValue(now);
  document.getElementById('checkin').value = local;
}

function toLocalDatetimeValue(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDatetime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addVisitor() {
  const name = document.getElementById('name').value.trim();
  const company = document.getElementById('company').value.trim();
  const purpose = document.getElementById('purpose').value.trim();
  const checkin = document.getElementById('checkin').value;

  if (!name) { alert('氏名を入力してください。'); return; }
  if (!purpose) { alert('来訪目的を入力してください。'); return; }
  if (!checkin) { alert('入室時刻を入力してください。'); return; }

  const visitor = {
    id: Date.now(),
    name,
    company,
    purpose,
    checkin: new Date(checkin).toISOString(),
    checkout: null
  };

  visitors.unshift(visitor);
  saveToStorage();
  renderList();
  resetForm();
}

function checkoutVisitor(id) {
  const v = visitors.find(v => v.id === id);
  if (v) {
    v.checkout = new Date().toISOString();
    saveToStorage();
    renderList();
  }
}

function deleteVisitor(id) {
  if (!confirm('この記録を削除しますか？')) return;
  visitors = visitors.filter(v => v.id !== id);
  saveToStorage();
  renderList();
}

function renderList() {
  const list = document.getElementById('visitorList');
  const emptyMsg = document.getElementById('emptyMsg');
  const countEl = document.getElementById('count');

  let filtered = visitors;
  if (currentFilter === 'in') filtered = visitors.filter(v => !v.checkout);
  if (currentFilter === 'out') filtered = visitors.filter(v => v.checkout);

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  list.innerHTML = filtered.map(v => {
    const statusClass = v.checkout ? 'status-out' : 'status-in';
    const statusLabel = v.checkout ? '退室済み' : '在室中';
    const checkoutRow = v.checkout
      ? `<div><span class="label">退室：</span>${formatDatetime(v.checkout)}</div>`
      : '';
    const checkoutBtn = !v.checkout
      ? `<button class="btn btn-checkout" onclick="checkoutVisitor(${v.id})">退室記録</button>`
      : '';
    return `
      <div class="visitor-card ${statusClass}">
        <div class="card-header">
          <div>
            <div class="visitor-name">${escapeHtml(v.name)}</div>
            <div class="visitor-company">${escapeHtml(v.company || '（会社名なし）')}</div>
          </div>
          <span class="status-badge">${statusLabel}</span>
        </div>
        <div class="card-body">
          <div><span class="label">目的：</span>${escapeHtml(v.purpose)}</div>
          <div><span class="label">入室：</span>${formatDatetime(v.checkin)}</div>
          ${checkoutRow}
        </div>
        <div class="card-actions">
          ${checkoutBtn}
          <button class="btn btn-delete" onclick="deleteVisitor(${v.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function resetForm() {
  document.getElementById('name').value = '';
  document.getElementById('company').value = '';
  document.getElementById('purpose').value = '';
  setDefaultCheckin();
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visitors));
}

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    visitors = data ? JSON.parse(data) : [];
  } catch (e) {
    visitors = [];
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
