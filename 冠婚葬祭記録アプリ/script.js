'use strict';

const STORAGE_KEY = 'kankonsoosai_records';

let records = [];
let currentDetailId = null;

function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    records = data ? JSON.parse(data) : [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatAmount(amount) {
  return Number(amount).toLocaleString('ja-JP') + '円';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function renderRecords(filter = '') {
  const list = document.getElementById('records-list');
  const countEl = document.getElementById('count');

  const filtered = records.filter(r =>
    r.name.includes(filter) || r.memo.includes(filter)
  );

  countEl.textContent = `${filtered.length}件`;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません。上のフォームから追加してください。</p>';
    return;
  }

  list.innerHTML = filtered
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(r => `
      <div class="record-card" onclick="openDetail('${r.id}')">
        <div class="record-info">
          <div class="record-name">${escapeHtml(r.name)}</div>
          <div class="record-tags">
            <span class="tag">${escapeHtml(r.relation)}</span>
            <span class="tag event">${escapeHtml(r.eventType)}</span>
          </div>
          ${r.memo ? `<div class="record-memo">${escapeHtml(r.memo)}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div class="record-amount">${formatAmount(r.amount)}</div>
          ${r.date ? `<div class="record-date">${formatDate(r.date)}</div>` : ''}
          <button class="btn-delete" onclick="deleteRecord(event,'${r.id}')" title="削除">✕</button>
        </div>
      </div>
    `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addRecord(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const relation = document.getElementById('relation').value;
  const eventType = document.getElementById('event-type').value;
  const amount = document.getElementById('amount').value;
  const date = document.getElementById('date').value;
  const memo = document.getElementById('memo').value.trim();

  if (!name || !amount) return;

  const record = {
    id: generateId(),
    name,
    relation,
    eventType,
    amount: Number(amount),
    date,
    memo,
    createdAt: new Date().toISOString()
  };

  records.unshift(record);
  saveRecords();
  renderRecords(document.getElementById('search').value);

  document.getElementById('record-form').reset();
  document.getElementById('name').focus();
}

function deleteRecord(e, id) {
  e.stopPropagation();
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderRecords(document.getElementById('search').value);
}

function openDetail(id) {
  const r = records.find(r => r.id === id);
  if (!r) return;
  currentDetailId = id;

  document.getElementById('modal-title').textContent = r.name + ' さん';
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-amount">${formatAmount(r.amount)}</div>
    <div class="modal-detail-row"><span class="label">続柄</span><span class="value">${escapeHtml(r.relation)}</span></div>
    <div class="modal-detail-row"><span class="label">種類</span><span class="value">${escapeHtml(r.eventType)}</span></div>
    ${r.date ? `<div class="modal-detail-row"><span class="label">日付</span><span class="value">${formatDate(r.date)}</span></div>` : ''}
    ${r.memo ? `<div class="modal-detail-row"><span class="label">メモ</span><span class="value">${escapeHtml(r.memo)}</span></div>` : ''}
  `;

  document.getElementById('detail-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('detail-modal').classList.add('hidden');
  currentDetailId = null;
}

// 今日の日付をデフォルトにセット
function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
}

document.addEventListener('DOMContentLoaded', () => {
  loadRecords();
  setTodayDate();
  renderRecords();

  document.getElementById('record-form').addEventListener('submit', addRecord);

  document.getElementById('search').addEventListener('input', e => {
    renderRecords(e.target.value.trim());
  });

  document.getElementById('detail-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('detail-modal')) {
      closeModal();
    }
  });
});
