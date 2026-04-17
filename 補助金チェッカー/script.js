const STORAGE_KEY = 'subsidyChecker_entries';
let entries = [];
let currentFilter = 'all';

function load() {
  try {
    entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    entries = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function getStatus(deadline) {
  if (!deadline) return 'ok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'urgent';
  return 'ok';
}

function getDaysLabel(deadline) {
  if (!deadline) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `期限切れ（${Math.abs(diff)}日前）`;
  if (diff === 0) return '今日が期限';
  return `残り ${diff} 日`;
}

function getStatusLabel(status) {
  if (status === 'expired') return '期限切れ';
  if (status === 'urgent') return '期限間近';
  return '余裕あり';
}

function addEntry() {
  const name = document.getElementById('name').value.trim();
  const deadline = document.getElementById('deadline').value;
  const amount = document.getElementById('amount').value.trim();
  const condition = document.getElementById('condition').value.trim();
  const url = document.getElementById('url').value.trim();
  const memo = document.getElementById('memo').value.trim();

  if (!name) { alert('補助金名を入力してください'); return; }
  if (!deadline) { alert('申請期限を入力してください'); return; }

  const entry = {
    id: Date.now(),
    name,
    deadline,
    amount,
    condition,
    url,
    memo,
    createdAt: new Date().toISOString()
  };

  entries.push(entry);
  save();
  clearForm();
  renderList();
}

function clearForm() {
  ['name', 'deadline', 'amount', 'condition', 'url', 'memo'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function deleteEntry(id) {
  if (!confirm('この補助金を削除しますか？')) return;
  entries = entries.filter(e => e.id !== id);
  save();
  renderList();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

function renderList() {
  const search = document.getElementById('search').value.toLowerCase();
  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('empty');
  const summaryEl = document.getElementById('summary');

  // Sort: expired first, then urgent, then ok; within each group by deadline
  const sorted = [...entries].sort((a, b) => {
    const order = { expired: 0, urgent: 1, ok: 2 };
    const sa = getStatus(a.deadline);
    const sb = getStatus(b.deadline);
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    return a.deadline.localeCompare(b.deadline);
  });

  // Summary counts
  const expired = sorted.filter(e => getStatus(e.deadline) === 'expired').length;
  const urgent = sorted.filter(e => getStatus(e.deadline) === 'urgent').length;
  const ok = sorted.filter(e => getStatus(e.deadline) === 'ok').length;

  summaryEl.innerHTML = `
    <span class="summary-badge badge-total">全 ${entries.length} 件</span>
    ${expired > 0 ? `<span class="summary-badge badge-expired">期限切れ ${expired} 件</span>` : ''}
    ${urgent > 0 ? `<span class="summary-badge badge-urgent">期限間近 ${urgent} 件</span>` : ''}
    <span class="summary-badge badge-ok">余裕あり ${ok} 件</span>
  `;

  // Filter
  let filtered = sorted.filter(e => {
    const status = getStatus(e.deadline);
    if (currentFilter !== 'all' && status !== currentFilter) return false;
    if (search) {
      const text = (e.name + e.condition + e.amount + e.memo).toLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.innerHTML = filtered.map(e => {
    const status = getStatus(e.deadline);
    const daysLabel = getDaysLabel(e.deadline);
    const statusLabel = getStatusLabel(status);
    const deadlineFormatted = e.deadline ? new Date(e.deadline + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '未設定';

    return `
      <div class="card status-${status}">
        <div class="card-header">
          <div class="card-name">${escHtml(e.name)}</div>
          <span class="card-badge badge-status-${status}">${statusLabel}</span>
        </div>
        <div class="card-meta">
          <span class="meta-item"><span class="meta-label">申請期限：</span>${deadlineFormatted}</span>
          <span class="meta-item" style="color:${status === 'expired' ? '#dc2626' : status === 'urgent' ? '#d97706' : '#059669'}; font-weight:600;">${daysLabel}</span>
          ${e.amount ? `<span class="meta-item"><span class="meta-label">補助額：</span>${escHtml(e.amount)}</span>` : ''}
        </div>
        ${e.condition ? `<div class="card-condition"><span class="meta-label">対象条件：</span>${escHtml(e.condition)}</div>` : ''}
        ${e.url ? `<div><a class="card-url" href="${escHtml(e.url)}" target="_blank" rel="noopener">${escHtml(e.url)}</a></div>` : ''}
        ${e.memo ? `<div class="card-memo"><span class="meta-label">メモ：</span>${escHtml(e.memo)}</div>` : ''}
        <div class="card-footer">
          <button class="btn-delete" onclick="deleteEntry(${e.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

load();
renderList();
