const STORAGE_KEY = 'hikiotoshi_items';
const BALANCE_KEY = 'hikiotoshi_balance';

let items = [];
let balance = '';

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { items = JSON.parse(saved); } catch { items = []; }
  }
  const savedBalance = localStorage.getItem(BALANCE_KEY);
  if (savedBalance !== null) balance = savedBalance;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  localStorage.setItem(BALANCE_KEY, balance);
}

function render() {
  renderList();
  renderSummary();
}

function renderList() {
  const list = document.getElementById('itemList');
  const count = document.getElementById('itemCount');
  count.textContent = items.length + '件';

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-message">まだ項目がありません</li>';
    return;
  }

  // 引き落とし日順にソート
  const sorted = [...items].sort((a, b) => a.day - b.day);

  list.innerHTML = sorted.map(item => `
    <li class="item-card">
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-day">毎月 ${item.day}日</div>
      </div>
      <div class="item-amount">${item.amount.toLocaleString()} 円</div>
      <button class="btn-delete" data-id="${item.id}" aria-label="削除">✕</button>
    </li>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.id));
  });
}

function renderSummary() {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  document.getElementById('totalAmount').textContent = total.toLocaleString() + ' 円';

  const balanceVal = parseFloat(balance);
  const diffEl = document.getElementById('diffAmount');
  const badge = document.getElementById('statusBadge');

  if (balance === '' || isNaN(balanceVal)) {
    diffEl.textContent = '- 円';
    badge.textContent = '残高を入力してください';
    badge.className = 'status-badge';
  } else {
    const diff = balanceVal - total;
    diffEl.textContent = diff.toLocaleString() + ' 円';
    if (diff >= 0) {
      badge.textContent = '✓ 残高OK（余裕: ' + diff.toLocaleString() + '円）';
      badge.className = 'status-badge ok';
    } else {
      badge.textContent = '⚠ 残高不足（' + Math.abs(diff).toLocaleString() + '円 足りません）';
      badge.className = 'status-badge ng';
    }
  }
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const day = parseInt(document.getElementById('itemDay').value);
  const amount = parseInt(document.getElementById('itemAmount').value);

  if (!name) { alert('名前を入力してください'); return; }
  if (!day || day < 1 || day > 31) { alert('引き落とし日は1〜31の範囲で入力してください'); return; }
  if (!amount || amount < 0) { alert('金額を入力してください'); return; }

  items.push({
    id: Date.now().toString(),
    name,
    day,
    amount
  });

  saveData();
  render();

  document.getElementById('itemName').value = '';
  document.getElementById('itemDay').value = '';
  document.getElementById('itemAmount').value = '';
  document.getElementById('itemName').focus();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveData();
  render();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// イベント設定
document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('balanceInput').addEventListener('input', function() {
  balance = this.value;
  saveData();
  renderSummary();
});

// Enterキーで追加
document.getElementById('itemAmount').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addItem();
});

// 初期化
loadData();

// 残高フィールドを復元
if (balance !== '') {
  document.getElementById('balanceInput').value = balance;
}

render();
