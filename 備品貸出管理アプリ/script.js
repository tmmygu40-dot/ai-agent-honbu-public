'use strict';

const STORAGE_KEY = 'bihin_lending_data';

let items = [];
let currentFilter = 'unreturned';

// --- 初期化 ---
function init() {
  loadFromStorage();
  setDefaultDates();
  renderList();

  document.getElementById('addBtn').addEventListener('click', addItem);
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderList();
    });
  });
}

function setDefaultDates() {
  const today = new Date();
  const todayStr = formatDate(today);
  document.getElementById('lendDate').value = todayStr;

  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(today.getDate() + 7);
  document.getElementById('returnDate').value = formatDate(oneWeekLater);
}

// --- データ操作 ---
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  items = raw ? JSON.parse(raw) : [];
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const itemName = document.getElementById('itemName').value.trim();
  const borrower = document.getElementById('borrower').value.trim();
  const lendDate = document.getElementById('lendDate').value;
  const returnDate = document.getElementById('returnDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!itemName || !borrower || !lendDate || !returnDate) {
    alert('備品名・借りた人・貸し出し日・返却期限は必須です');
    return;
  }

  if (returnDate < lendDate) {
    alert('返却期限は貸し出し日より後の日付にしてください');
    return;
  }

  const newItem = {
    id: Date.now(),
    itemName,
    borrower,
    lendDate,
    returnDate,
    memo,
    returned: false,
    returnedAt: null
  };

  items.unshift(newItem);
  saveToStorage();
  renderList();

  // フォームリセット
  document.getElementById('itemName').value = '';
  document.getElementById('borrower').value = '';
  document.getElementById('memo').value = '';
  setDefaultDates();
}

function markReturned(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.returned = true;
    item.returnedAt = formatDate(new Date());
    saveToStorage();
    renderList();
  }
}

function deleteItem(id) {
  if (!confirm('この記録を削除しますか？')) return;
  items = items.filter(i => i.id !== id);
  saveToStorage();
  renderList();
}

// --- 表示 ---
function renderList() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');
  const today = formatDate(new Date());

  const filtered = currentFilter === 'unreturned'
    ? items.filter(i => !i.returned)
    : items;

  // カウント表示
  const unreturned = items.filter(i => !i.returned);
  const overdue = unreturned.filter(i => i.returnDate < today);
  let countText = `全${items.length}件`;
  if (unreturned.length > 0) countText += `　未返却: ${unreturned.length}件`;
  if (overdue.length > 0) countText += `　期限超過: ${overdue.length}件`;
  document.getElementById('countBadge').textContent = countText;

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    if (currentFilter === 'unreturned') {
      emptyMsg.textContent = '未返却の備品はありません';
    } else {
      emptyMsg.textContent = '登録された備品はありません';
    }
    return;
  }

  emptyMsg.style.display = 'none';

  filtered.forEach(item => {
    const isOverdue = !item.returned && item.returnDate < today;
    const card = document.createElement('div');
    card.className = 'item-card' + (isOverdue ? ' overdue' : '') + (item.returned ? ' returned' : '');

    const statusLabel = item.returned
      ? `<span class="returned-label">返却済み</span>`
      : (isOverdue ? `<span class="overdue-label">期限超過</span>` : '');

    const memoHtml = item.memo
      ? `<div class="item-memo">メモ: ${escapeHtml(item.memo)}</div>`
      : '';

    const returnedAtHtml = item.returned && item.returnedAt
      ? `<div class="date-item">返却日: ${item.returnedAt}</div>`
      : '';

    const actionButtons = item.returned
      ? `<button class="btn btn-delete" onclick="deleteItem(${item.id})">削除</button>`
      : `<button class="btn btn-returned" onclick="markReturned(${item.id})">返却済みにする</button>
         <button class="btn btn-delete" onclick="deleteItem(${item.id})">削除</button>`;

    card.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.itemName)} ${statusLabel}</div>
        <div class="item-borrower">借りた人: ${escapeHtml(item.borrower)}</div>
        <div class="item-dates">
          <div class="date-item">貸し出し日: ${item.lendDate}</div>
          <div class="date-item">返却期限: ${item.returnDate}</div>
          ${returnedAtHtml}
        </div>
        ${memoHtml}
      </div>
      <div class="item-actions">
        ${actionButtons}
      </div>
    `;

    list.appendChild(card);
  });
}

// --- ユーティリティ ---
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- 起動 ---
document.addEventListener('DOMContentLoaded', init);
