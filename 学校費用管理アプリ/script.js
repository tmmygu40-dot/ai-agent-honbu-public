const STORAGE_KEY = 'school-fees-v1';

let items = [];

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch {
    items = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getDaysDiff(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function getDueStatus(dueDate, paid) {
  if (paid || !dueDate) return 'normal';
  const diff = getDaysDiff(dueDate);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due-soon';
  return 'normal';
}

function addItem() {
  const name = document.getElementById('item-name').value.trim();
  const amount = parseInt(document.getElementById('item-amount').value, 10);
  const due = document.getElementById('item-due').value;
  const memo = document.getElementById('item-memo').value.trim();

  if (!name) {
    alert('項目名を入力してください');
    document.getElementById('item-name').focus();
    return;
  }
  if (isNaN(amount) || amount < 0) {
    alert('正しい金額を入力してください');
    document.getElementById('item-amount').focus();
    return;
  }

  const item = {
    id: Date.now(),
    name,
    amount,
    due,
    memo,
    paid: false
  };

  items.push(item);
  saveItems();
  render();

  document.getElementById('item-name').value = '';
  document.getElementById('item-amount').value = '';
  document.getElementById('item-due').value = '';
  document.getElementById('item-memo').value = '';
  document.getElementById('item-name').focus();
}

function togglePaid(id) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.paid = !item.paid;
    saveItems();
    render();
  }
}

function deleteItem(id) {
  if (!confirm('この項目を削除しますか？')) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  render();
}

function buildCard(item) {
  const status = getDueStatus(item.due, item.paid);
  const cardClass = item.paid ? 'done' : (status === 'overdue' ? 'overdue' : status === 'due-soon' ? 'due-soon' : '');
  const dueClass = status === 'overdue' ? 'overdue' : status === 'due-soon' ? 'due-soon' : '';

  let badgeHtml = '';
  if (!item.paid) {
    if (status === 'overdue') {
      badgeHtml = `<span class="badge badge-overdue">期限切れ</span>`;
    } else if (status === 'due-soon') {
      const diff = getDaysDiff(item.due);
      badgeHtml = diff === 0
        ? `<span class="badge badge-soon">今日まで</span>`
        : `<span class="badge badge-soon">あと${diff}日</span>`;
    }
  }

  const dueText = item.due ? `期限: ${formatDate(item.due)}` : '期限: 未設定';
  const memoHtml = item.memo ? `<div class="item-memo">📝 ${escapeHtml(item.memo)}</div>` : '';

  return `
    <div class="item-card ${cardClass}" data-id="${item.id}">
      <input type="checkbox" class="item-check" ${item.paid ? 'checked' : ''}
             onchange="togglePaid(${item.id})" title="${item.paid ? '未払いに戻す' : '支払い済みにする'}">
      <div class="item-body">
        <div class="item-name">${escapeHtml(item.name)} ${badgeHtml}</div>
        <div class="item-meta">
          <span class="item-amount">¥${item.amount.toLocaleString()}</span>
          <span class="item-due ${dueClass}">${dueText}</span>
        </div>
        ${memoHtml}
      </div>
      <button class="btn-delete" onclick="deleteItem(${item.id})" title="削除">✕</button>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function render() {
  const unpaid = items.filter(i => !i.paid);
  const paid = items.filter(i => i.paid);

  // 未払いリストを期限順にソート（期限なしは最後）
  unpaid.sort((a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due.localeCompare(b.due);
  });

  const unpaidList = document.getElementById('unpaid-list');
  unpaidList.innerHTML = unpaid.length
    ? unpaid.map(buildCard).join('')
    : '<p class="empty-msg">未払いの項目はありません ✅</p>';

  const paidList = document.getElementById('paid-list');
  paidList.innerHTML = paid.length
    ? paid.map(buildCard).join('')
    : '<p class="empty-msg">支払い済みの項目はありません</p>';

  document.getElementById('unpaid-count').textContent = unpaid.length;
  document.getElementById('paid-count').textContent = paid.length;

  const totalUnpaid = unpaid.reduce((s, i) => s + i.amount, 0);
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);
  document.getElementById('total-unpaid').textContent = `¥${totalUnpaid.toLocaleString()}`;
  document.getElementById('total-paid').textContent = `¥${totalPaid.toLocaleString()}`;
}

// Enter キーで追加
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('#item-name, #item-amount, #item-due, #item-memo')) {
    addItem();
  }
});

// 初期化
loadItems();
render();
