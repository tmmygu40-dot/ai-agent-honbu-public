const STORAGE_KEY = 'tax_schedule_items';

let items = [];

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    items = saved ? JSON.parse(saved) : [];
  } catch (e) {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function addItem() {
  const name = document.getElementById('taxName').value.trim();
  const amountVal = document.getElementById('amount').value;
  const dueDate = document.getElementById('dueDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('税目・保険料名を入力してください');
    document.getElementById('taxName').focus();
    return;
  }
  if (!dueDate) {
    alert('支払期限を入力してください');
    document.getElementById('dueDate').focus();
    return;
  }

  const amount = amountVal === '' ? 0 : Number(amountVal);

  items.push({
    id: generateId(),
    name,
    amount,
    dueDate,
    memo,
    paid: false,
    createdAt: new Date().toISOString()
  });

  saveItems();
  clearForm();
  renderList();
  updateSummary();
}

function clearForm() {
  document.getElementById('taxName').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('dueDate').value = '';
  document.getElementById('memo').value = '';
}

function togglePaid(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.paid = !item.paid;
    saveItems();
    renderList();
    updateSummary();
  }
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  renderList();
  updateSummary();
}

function getDaysUntil(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function formatAmount(amount) {
  return '¥' + amount.toLocaleString();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}/${m}/${day}`;
}

function getDaysLabel(days) {
  if (days < 0) return { text: `${Math.abs(days)}日超過`, cls: 'overdue' };
  if (days === 0) return { text: '今日が期限', cls: 'overdue' };
  return { text: `あと${days}日`, cls: days <= 7 ? 'soon' : '' };
}

function renderList() {
  const showPaid = document.getElementById('showPaid').checked;
  const list = document.getElementById('itemList');

  // 期限順にソート（未払い優先 → 期限昇順）
  const sorted = [...items].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const visible = sorted.filter(item => showPaid || !item.paid);

  if (visible.length === 0) {
    list.innerHTML = '<div class="empty-msg">登録された支払いはありません</div>';
    return;
  }

  list.innerHTML = visible.map(item => {
    const days = getDaysUntil(item.dueDate);
    const dayInfo = getDaysLabel(days);
    const cardCls = item.paid ? 'paid' : (days < 0 ? 'overdue' : (days <= 7 ? 'soon' : ''));
    const daysCls = item.paid ? '' : dayInfo.cls;

    return `
      <div class="item-card ${cardCls}">
        <input type="checkbox" class="item-check"
          ${item.paid ? 'checked' : ''}
          onchange="togglePaid('${item.id}')"
          title="支払済みにする">
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-meta">
            <span class="item-amount">${formatAmount(item.amount)}</span>
            <span class="item-date">期限：${formatDate(item.dueDate)}</span>
            ${!item.paid ? `<span class="item-days ${daysCls}">${dayInfo.text}</span>` : '<span class="item-days">支払済</span>'}
          </div>
          ${item.memo ? `<div class="item-memo">${escapeHtml(item.memo)}</div>` : ''}
        </div>
        <button class="btn-delete" onclick="deleteItem('${item.id}')" title="削除">×</button>
      </div>
    `;
  }).join('');
}

function updateSummary() {
  const unpaid = items.filter(i => !i.paid);
  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.amount, 0);
  const soonCount = unpaid.filter(i => {
    const days = getDaysUntil(i.dueDate);
    return days >= 0 && days <= 7;
  }).length + unpaid.filter(i => getDaysUntil(i.dueDate) < 0).length;

  document.getElementById('unpaidCount').textContent = unpaid.length;
  document.getElementById('unpaidTotal').textContent = formatAmount(unpaidTotal);
  document.getElementById('soonCount').textContent = soonCount;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

// 初期化
loadItems();
renderList();
updateSummary();

// Enterキーで登録
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.target.tagName === 'INPUT')) {
    addItem();
  }
});
