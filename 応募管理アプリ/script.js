'use strict';

const STORAGE_KEY = 'oubo_kanri_entries';
const STATUS_LIST = ['書類選考中', '一次面接', '二次面接', '最終面接', '内定', '不採用', '辞退'];

let entries = loadEntries();

// DOM
const form = document.getElementById('entryForm');
const companyInput = document.getElementById('company');
const dateInput = document.getElementById('appliedDate');
const statusInput = document.getElementById('status');
const memoInput = document.getElementById('memo');
const filterSelect = document.getElementById('filterStatus');
const entryList = document.getElementById('entryList');
const emptyMessage = document.getElementById('emptyMessage');
const countDisplay = document.getElementById('countDisplay');

// 今日の日付をデフォルト設定
dateInput.value = new Date().toISOString().split('T')[0];

// フォーム送信
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const company = companyInput.value.trim();
  if (!company) return;

  const entry = {
    id: Date.now(),
    company,
    appliedDate: dateInput.value,
    status: statusInput.value,
    memo: memoInput.value.trim(),
    createdAt: Date.now()
  };

  entries.unshift(entry);
  saveEntries();
  render();

  companyInput.value = '';
  memoInput.value = '';
  dateInput.value = new Date().toISOString().split('T')[0];
  companyInput.focus();
});

// フィルター変更
filterSelect.addEventListener('change', render);

// 一覧描画
function render() {
  const filter = filterSelect.value;
  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);

  entryList.innerHTML = '';

  if (filtered.length === 0) {
    emptyMessage.style.display = 'block';
    countDisplay.textContent = '0件';
    return;
  }

  emptyMessage.style.display = 'none';
  countDisplay.textContent = `${filtered.length}件`;

  filtered.forEach(entry => {
    const card = createCard(entry);
    entryList.appendChild(card);
  });
}

function createCard(entry) {
  const card = document.createElement('div');
  card.className = `entry-card status-${entry.status}`;
  card.dataset.id = entry.id;

  const dateStr = entry.appliedDate
    ? new Date(entry.appliedDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  card.innerHTML = `
    <div class="card-header">
      <span class="company-name">${escHtml(entry.company)}</span>
      <span class="status-badge badge-${entry.status}">${escHtml(entry.status)}</span>
    </div>
    <div class="card-meta">応募日：${dateStr}</div>
    ${entry.memo ? `<div class="card-memo">${escHtml(entry.memo)}</div>` : ''}
    <div class="card-actions">
      <select class="inline-select" data-action="status" data-id="${entry.id}">
        ${STATUS_LIST.map(s => `<option value="${s}"${s === entry.status ? ' selected' : ''}>${s}</option>`).join('')}
      </select>
      <button class="btn-edit-status" data-action="update" data-id="${entry.id}">更新</button>
      <button class="btn-delete" data-action="delete" data-id="${entry.id}">削除</button>
    </div>
  `;

  return card;
}

// カード操作（イベント委譲）
entryList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === 'delete') {
    if (confirm('この応募を削除しますか？')) {
      entries = entries.filter(e => e.id !== id);
      saveEntries();
      render();
    }
  } else if (action === 'update') {
    const card = btn.closest('.entry-card');
    const select = card.querySelector('select[data-action="status"]');
    const newStatus = select.value;
    const entry = entries.find(e => e.id === id);
    if (entry) {
      entry.status = newStatus;
      saveEntries();
      render();
    }
  }
});

// localStorage
function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadEntries() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期描画
render();
