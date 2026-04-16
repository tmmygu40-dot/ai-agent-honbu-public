'use strict';

const STORAGE_KEY = 'inspection_records';

let records = [];
let currentFilter = 'all';
let editingId = null;

// 初期化
function init() {
  load();
  setDefaultDates();
  bindEvents();
  render();
}

function load() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    records = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function setDefaultDates() {
  const today = todayStr();
  document.getElementById('inspectDate').value = today;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// イベント
function bindEvents() {
  document.getElementById('addBtn').addEventListener('click', addRecord);

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  document.getElementById('searchInput').addEventListener('input', render);

  document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
  document.getElementById('cancelEditBtn').addEventListener('click', closeModal);
  document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal')) closeModal();
  });
}

function addRecord() {
  const location = document.getElementById('location').value.trim();
  const item = document.getElementById('item').value.trim();
  if (!location || !item) {
    alert('点検箇所と点検項目を入力してください');
    return;
  }

  const record = {
    id: generateId(),
    location,
    item,
    result: document.getElementById('result').value,
    inspectDate: document.getElementById('inspectDate').value,
    nextDate: document.getElementById('nextDate').value,
    memo: document.getElementById('memo').value.trim(),
    createdAt: Date.now()
  };

  records.unshift(record);
  save();

  // リセット
  document.getElementById('location').value = '';
  document.getElementById('item').value = '';
  document.getElementById('result').value = '合格';
  document.getElementById('nextDate').value = '';
  document.getElementById('memo').value = '';

  render();
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  save();
  render();
}

function openEdit(id) {
  const r = records.find(r => r.id === id);
  if (!r) return;
  editingId = id;
  document.getElementById('editLocation').value = r.location;
  document.getElementById('editItem').value = r.item;
  document.getElementById('editResult').value = r.result;
  document.getElementById('editInspectDate').value = r.inspectDate || '';
  document.getElementById('editNextDate').value = r.nextDate || '';
  document.getElementById('editMemo').value = r.memo || '';
  document.getElementById('editModal').classList.remove('hidden');
}

function saveEdit() {
  const r = records.find(r => r.id === editingId);
  if (!r) return;
  const location = document.getElementById('editLocation').value.trim();
  const item = document.getElementById('editItem').value.trim();
  if (!location || !item) {
    alert('点検箇所と点検項目を入力してください');
    return;
  }
  r.location = location;
  r.item = item;
  r.result = document.getElementById('editResult').value;
  r.inspectDate = document.getElementById('editInspectDate').value;
  r.nextDate = document.getElementById('editNextDate').value;
  r.memo = document.getElementById('editMemo').value.trim();
  save();
  closeModal();
  render();
}

function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
  editingId = null;
}

// フィルタリング
function getFiltered() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const today = todayStr();
  const soon = daysLater(7);

  return records.filter(r => {
    // 検索
    if (query && !r.location.toLowerCase().includes(query) && !r.item.toLowerCase().includes(query)) {
      return false;
    }
    // フィルター
    if (currentFilter === '不合格') return r.result === '不合格';
    if (currentFilter === '合格') return r.result === '合格';
    if (currentFilter === 'upcoming') {
      return r.nextDate && r.nextDate <= soon;
    }
    return true;
  });
}

function daysLater(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// 統計
function updateStats() {
  const total = records.length;
  const fail = records.filter(r => r.result === '不合格').length;
  const pass = records.filter(r => r.result === '合格').length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statFail').textContent = fail;
  document.getElementById('statPass').textContent = pass;
}

// レンダリング
function render() {
  updateStats();
  const filtered = getFiltered();
  const list = document.getElementById('recordList');
  const emptyMsg = document.getElementById('emptyMsg');

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  const today = todayStr();
  const soon = daysLater(7);

  list.innerHTML = filtered.map(r => {
    const isPass = r.result === '合格';
    const nextDateLabel = getNextDateLabel(r.nextDate, today, soon);
    const memoHtml = r.memo
      ? `<div class="card-memo">📝 ${escapeHtml(r.memo)}</div>`
      : '';

    return `
      <div class="record-card ${isPass ? 'pass' : 'fail'}">
        <div class="card-header">
          <div>
            <div class="card-title">${escapeHtml(r.item)}</div>
            <div class="card-location">📍 ${escapeHtml(r.location)}</div>
          </div>
          <span class="badge ${isPass ? 'pass' : 'fail'}">${r.result}</span>
        </div>
        <div class="card-dates">
          ${r.inspectDate ? `<span>📅 点検日：${formatDate(r.inspectDate)}</span>` : ''}
          ${nextDateLabel}
        </div>
        ${memoHtml}
        <div class="card-actions">
          <button class="btn-edit" onclick="openEdit('${r.id}')">編集</button>
          <button class="btn-delete" onclick="deleteRecord('${r.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function getNextDateLabel(nextDate, today, soon) {
  if (!nextDate) return '';
  const label = `次回：${formatDate(nextDate)}`;
  if (nextDate < today) {
    return `<span class="next-date-overdue">⚠️ ${label}（期限超過）</span>`;
  } else if (nextDate <= soon) {
    return `<span class="next-date-warn">🔔 ${label}（7日以内）</span>`;
  }
  return `<span>🗓 ${label}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

init();
