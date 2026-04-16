const STORAGE_KEY = 'okozukai_entries';

let entries = [];
let selectedType = 'income';

function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    entries = JSON.parse(saved);
  }

  // 今日の日付をデフォルトにセット
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;

  render();
}

function selectType(type) {
  selectedType = type;
  document.getElementById('btn-income').classList.toggle('active', type === 'income');
  document.getElementById('btn-expense').classList.toggle('active', type === 'expense');
}

function addEntry() {
  const date = document.getElementById('date').value;
  const amountRaw = document.getElementById('amount').value;
  const note = document.getElementById('note').value.trim();

  if (!date) {
    alert('日付を入力してください');
    return;
  }
  const amount = parseInt(amountRaw, 10);
  if (!amountRaw || isNaN(amount) || amount <= 0) {
    alert('金額を正しく入力してください');
    return;
  }
  if (!note) {
    alert('用途を入力してください');
    return;
  }

  const entry = {
    id: Date.now(),
    type: selectedType,
    date,
    amount,
    note
  };

  entries.unshift(entry);
  save();
  render();

  // 入力欄をリセット
  document.getElementById('amount').value = '';
  document.getElementById('note').value = '';
}

function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  save();
  render();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function render() {
  renderBalance();
  renderPace();
  renderHistory();
}

function renderBalance() {
  let balance = 0;
  entries.forEach(e => {
    if (e.type === 'income') balance += e.amount;
    else balance -= e.amount;
  });
  const el = document.getElementById('balance');
  el.textContent = '¥' + balance.toLocaleString();
  el.style.color = balance < 0 ? '#ffcdd2' : '#fff';
}

function renderPace() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = year + '-' + String(month).padStart(2, '0');

  let monthlyExpense = 0;
  entries.forEach(e => {
    if (e.type === 'expense' && e.date.startsWith(monthStr)) {
      monthlyExpense += e.amount;
    }
  });

  document.getElementById('pace-info').textContent = '¥' + monthlyExpense.toLocaleString();
}

function renderHistory() {
  const list = document.getElementById('history-list');

  if (entries.length === 0) {
    list.innerHTML = '<li class="empty-msg" id="empty-msg">履歴がありません</li>';
    return;
  }

  list.innerHTML = entries.map(e => {
    const sign = e.type === 'income' ? '+' : '-';
    const dateStr = e.date.replace(/-/g, '/');
    return `
      <li class="history-item">
        <div class="item-type ${e.type}"></div>
        <div class="item-info">
          <div class="item-note">${escHtml(e.note)}</div>
          <div class="item-date">${dateStr}</div>
        </div>
        <div class="item-amount ${e.type}">${sign}¥${e.amount.toLocaleString()}</div>
        <button class="delete-btn" onclick="deleteEntry(${e.id})" title="削除">×</button>
      </li>
    `;
  }).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
