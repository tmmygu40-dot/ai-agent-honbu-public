const STORAGE_KEY = 'cashflow_entries';
const BALANCE_KEY = 'cashflow_initial_balance';

let entries = [];
let initialBalance = 0;

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  entries = saved ? JSON.parse(saved) : [];
  const savedBalance = localStorage.getItem(BALANCE_KEY);
  initialBalance = savedBalance ? parseInt(savedBalance, 10) : 0;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  localStorage.setItem(BALANCE_KEY, String(initialBalance));
}

function getCurrentMonth() {
  return document.getElementById('monthSelect').value;
}

function formatAmount(n) {
  return n.toLocaleString('ja-JP');
}

function updateSummary() {
  const month = getCurrentMonth();
  const monthEntries = entries.filter(e => e.date.startsWith(month));

  const totalIncome = monthEntries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpense = monthEntries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = initialBalance + totalIncome - totalExpense;

  document.getElementById('totalIncome').textContent = formatAmount(totalIncome);
  document.getElementById('totalExpense').textContent = formatAmount(totalExpense);

  const balanceEl = document.getElementById('totalBalance');
  balanceEl.textContent = formatAmount(balance);
  balanceEl.style.color = balance < 0 ? '#e74c3c' : '#2980b9';
}

function renderList() {
  const month = getCurrentMonth();
  const monthEntries = entries
    .filter(e => e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));

  const listEl = document.getElementById('entryList');

  if (monthEntries.length === 0) {
    listEl.innerHTML = '<p class="empty-message">予定がありません</p>';
    return;
  }

  let runningBalance = initialBalance;
  listEl.innerHTML = monthEntries.map(entry => {
    if (entry.type === 'income') {
      runningBalance += entry.amount;
    } else {
      runningBalance -= entry.amount;
    }
    const balanceClass = runningBalance < 0 ? 'negative' : '';
    const sign = entry.type === 'income' ? '+' : '-';
    return `
      <div class="entry-item ${entry.type}">
        <div class="entry-info">
          <div class="entry-date">${entry.date}</div>
          <div class="entry-name">
            <span class="entry-type-badge">${entry.type === 'income' ? '入金' : '支払い'}</span>
            ${escapeHtml(entry.name)}
          </div>
        </div>
        <div>
          <div class="entry-amount">${sign}${formatAmount(entry.amount)}円</div>
          <div class="entry-running-balance ${balanceClass}">残高: ${formatAmount(runningBalance)}円</div>
        </div>
        <button class="delete-btn" onclick="deleteEntry('${entry.id}')" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  updateSummary();
  renderList();
}

function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  saveData();
  render();
}

function addEntry() {
  const type = document.getElementById('entryType').value;
  const date = document.getElementById('entryDate').value;
  const name = document.getElementById('entryName').value.trim();
  const amount = parseInt(document.getElementById('entryAmount').value, 10);

  if (!date) {
    alert('日付を入力してください');
    return;
  }
  if (!name) {
    alert('名称を入力してください');
    return;
  }
  if (!amount || amount <= 0) {
    alert('金額を正しく入力してください');
    return;
  }

  const entry = {
    id: Date.now().toString(),
    type,
    date,
    name,
    amount
  };

  entries.push(entry);
  saveData();

  // 追加した月を表示月に合わせる
  const entryMonth = date.substring(0, 7);
  if (document.getElementById('monthSelect').value !== entryMonth) {
    document.getElementById('monthSelect').value = entryMonth;
  }

  // フォームリセット
  document.getElementById('entryName').value = '';
  document.getElementById('entryAmount').value = '';

  render();
}

function setInitialBalance() {
  const val = parseInt(document.getElementById('initialBalance').value, 10);
  if (isNaN(val) || val < 0) {
    alert('正しい金額を入力してください');
    return;
  }
  initialBalance = val;
  saveData();
  document.getElementById('currentInitialBalance').textContent = formatAmount(initialBalance);
  document.getElementById('initialBalance').value = '';
  render();
}

function initMonthSelect() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('monthSelect').value = `${yyyy}-${mm}`;
}

document.getElementById('addEntryBtn').addEventListener('click', addEntry);
document.getElementById('setBalanceBtn').addEventListener('click', setInitialBalance);
document.getElementById('monthSelect').addEventListener('change', render);

// 初期化
loadData();
initMonthSelect();
document.getElementById('currentInitialBalance').textContent = formatAmount(initialBalance);

// 今日の日付をデフォルトセット
const today = new Date().toISOString().split('T')[0];
document.getElementById('entryDate').value = today;

render();
