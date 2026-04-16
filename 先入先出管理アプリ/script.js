'use strict';

const STORAGE_KEY = 'fifo_foods';

let foods = [];

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    foods = data ? JSON.parse(data) : [];
  } catch (e) {
    foods = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

function getStatus(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'expired', days: diffDays, label: `${Math.abs(diffDays)}日超過` };
  if (diffDays === 0) return { status: 'danger', days: diffDays, label: '今日まで' };
  if (diffDays <= 3) return { status: 'danger', days: diffDays, label: `あと${diffDays}日` };
  if (diffDays <= 7) return { status: 'warning', days: diffDays, label: `あと${diffDays}日` };
  return { status: 'safe', days: diffDays, label: `あと${diffDays}日` };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function renderList() {
  const list = document.getElementById('foodList');
  const countBadge = document.getElementById('itemCount');

  countBadge.textContent = foods.length;

  if (foods.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ食品が登録されていません</p>';
    return;
  }

  // 賞味期限の早い順にソート
  const sorted = [...foods].sort((a, b) => {
    return new Date(a.expiryDate) - new Date(b.expiryDate);
  });

  list.innerHTML = sorted.map((food) => {
    const { status, label } = getStatus(food.expiryDate);
    return `
      <div class="food-card status-${status}">
        <div class="food-info">
          <div class="food-name">${escapeHtml(food.name)}</div>
          <div class="food-meta">入荷：${formatDate(food.arrivalDate)}　賞味期限：${formatDate(food.expiryDate)}</div>
        </div>
        <div class="food-status">
          <div class="days-label ${status}">${label}</div>
          ${food.quantity ? `<div class="quantity-label">${escapeHtml(food.quantity)}</div>` : ''}
        </div>
        <button class="btn-delete" onclick="deleteFood('${food.id}')" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.hidden = false;
}

function clearError() {
  const el = document.getElementById('errorMsg');
  el.hidden = true;
}

function addFood() {
  clearError();
  const name = document.getElementById('foodName').value.trim();
  const arrivalDate = document.getElementById('arrivalDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const quantity = document.getElementById('quantity').value.trim();

  if (!name) { showError('食品名を入力してください'); return; }
  if (!expiryDate) { showError('賞味期限を入力してください'); return; }
  if (arrivalDate && expiryDate && arrivalDate > expiryDate) {
    showError('賞味期限は入荷日より後にしてください'); return;
  }

  const food = {
    id: Date.now().toString(),
    name,
    arrivalDate: arrivalDate || '',
    expiryDate,
    quantity,
  };

  foods.push(food);
  saveToStorage();
  renderList();

  // フォームリセット（賞味期限はクリア、入荷日は今日のまま）
  document.getElementById('foodName').value = '';
  document.getElementById('expiryDate').value = '';
  document.getElementById('quantity').value = '';
  document.getElementById('foodName').focus();
}

function deleteFood(id) {
  foods = foods.filter(f => f.id !== id);
  saveToStorage();
  renderList();
}

function setDefaultDates() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('arrivalDate').value = `${yyyy}-${mm}-${dd}`;
}

// 初期化
loadFromStorage();
setDefaultDates();
renderList();

document.getElementById('addBtn').addEventListener('click', addFood);

document.getElementById('foodName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addFood();
});
