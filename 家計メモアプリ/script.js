'use strict';

const STORAGE_KEY = 'kakeibo-list';

// ===== 要素取得 =====
const labelInput   = document.getElementById('labelInput');
const amountInput  = document.getElementById('amountInput');
const addBtn       = document.getElementById('addBtn');
const itemList     = document.getElementById('itemList');
const emptyMsg     = document.getElementById('emptyMsg');
const totalAmount  = document.getElementById('totalAmount');
const totalCount   = document.getElementById('totalCount');
const clearAllBtn  = document.getElementById('clearAllBtn');

// ===== データ =====
let records = load();

// ===== 初期描画 =====
render();

// ===== イベント =====
addBtn.addEventListener('click', addRecord);

amountInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addRecord();
});

labelInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') amountInput.focus();
});

clearAllBtn.addEventListener('click', () => {
  if (records.length === 0) return;
  if (!confirm('すべての記録を削除しますか？')) return;
  records = [];
  save();
  render();
});

// ===== 追加 =====
function addRecord() {
  const label  = labelInput.value.trim() || '未記入';
  const amount = parseInt(amountInput.value, 10);

  if (!amountInput.value || isNaN(amount) || amount < 0) {
    amountInput.focus();
    return;
  }

  records.unshift({
    id: Date.now(),
    label,
    amount,
    date: getNow()
  });

  labelInput.value  = '';
  amountInput.value = '';
  labelInput.focus();
  save();
  render();
}

// ===== 削除 =====
function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  save();
  render();
}

// ===== 描画 =====
function render() {
  itemList.innerHTML = '';

  const total = records.reduce((sum, r) => sum + r.amount, 0);
  totalAmount.textContent = `合計 ¥${formatNum(total)}`;
  totalCount.textContent  = `${records.length}件`;
  emptyMsg.style.display  = records.length === 0 ? 'block' : 'none';
  clearAllBtn.style.display = records.length === 0 ? 'none' : 'flex';

  records.forEach(r => {
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `
      <div class="item-info">
        <div class="item-label">${escapeHtml(r.label)}</div>
        <div class="item-amount">¥${formatNum(r.amount)}</div>
        <div class="item-date">${r.date}</div>
      </div>
      <button class="delete-btn" title="削除">×</button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', () => deleteRecord(r.id));
    itemList.appendChild(li);
  });
}

// ===== localStorage =====
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// ===== ユーティリティ =====
function formatNum(n) {
  return n.toLocaleString('ja-JP');
}

function getNow() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
