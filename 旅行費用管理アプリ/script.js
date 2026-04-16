const STORAGE_KEY = 'travel_expense_app';

let state = {
  budget: 0,
  expenses: []
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
    } catch (e) {
      state = { budget: 0, expenses: [] };
    }
  }
}

function formatYen(n) {
  return '¥' + Number(n).toLocaleString();
}

function formatDate(iso) {
  const d = new Date(iso);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function getTotalSpent() {
  return state.expenses.reduce((sum, e) => sum + e.amount, 0);
}

function updateBudgetDisplay() {
  const spent = getTotalSpent();
  const remaining = state.budget - spent;
  const pct = state.budget > 0 ? Math.min((spent / state.budget) * 100, 100) : 0;

  document.getElementById('total-budget').textContent = formatYen(state.budget);
  document.getElementById('total-spent').textContent = formatYen(spent);

  const remainEl = document.getElementById('remaining-budget');
  remainEl.textContent = formatYen(remaining);
  remainEl.classList.toggle('over', remaining < 0);

  const bar = document.getElementById('progress-bar');
  bar.style.width = pct + '%';
  bar.classList.toggle('over', remaining < 0);

  const pctLabel = state.budget > 0
    ? Math.round((spent / state.budget) * 100) + '% 使用'
    : '0% 使用';
  document.getElementById('progress-label').textContent = pctLabel;
}

function updateCategorySummary() {
  const container = document.getElementById('category-summary');
  const cats = {};
  state.expenses.forEach(e => {
    cats[e.category] = (cats[e.category] || 0) + e.amount;
  });

  if (Object.keys(cats).length === 0) {
    container.innerHTML = '<span class="empty-cat">まだ支出がありません</span>';
    return;
  }

  container.innerHTML = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) =>
      `<div class="cat-chip">
        <span class="cat-name">${cat}</span>
        <span class="cat-amount">${formatYen(amt)}</span>
      </div>`
    ).join('');
}

function updateExpenseList() {
  const container = document.getElementById('expense-list');

  if (state.expenses.length === 0) {
    container.innerHTML = '<p class="empty-msg">まだ支出がありません</p>';
    return;
  }

  const items = [...state.expenses].reverse().map((e, revIdx) => {
    const idx = state.expenses.length - 1 - revIdx;
    return `<div class="expense-item">
      <div class="expense-left">
        <span class="expense-cat-badge">${e.category}</span>
        <div>
          <div class="expense-memo">${e.memo || '（メモなし）'}</div>
          <div class="expense-date">${formatDate(e.date)}</div>
        </div>
      </div>
      <div class="expense-right">
        <span class="expense-amount">${formatYen(e.amount)}</span>
        <button class="delete-btn" data-idx="${idx}">削除</button>
      </div>
    </div>`;
  });

  container.innerHTML = items.join('');

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx, 10);
      state.expenses.splice(i, 1);
      saveState();
      render();
    });
  });
}

function render() {
  updateBudgetDisplay();
  updateCategorySummary();
  updateExpenseList();
}

// 予算設定
document.getElementById('set-budget-btn').addEventListener('click', () => {
  const val = parseInt(document.getElementById('budget-input').value, 10);
  if (isNaN(val) || val < 0) {
    alert('正しい予算金額を入力してください');
    return;
  }
  state.budget = val;
  document.getElementById('budget-input').value = '';
  saveState();
  render();
});

document.getElementById('budget-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('set-budget-btn').click();
});

// 支出追加
document.getElementById('add-expense-btn').addEventListener('click', () => {
  const category = document.getElementById('category-select').value;
  const amount = parseInt(document.getElementById('amount-input').value, 10);
  const memo = document.getElementById('memo-input').value.trim();

  if (isNaN(amount) || amount <= 0) {
    alert('正しい金額を入力してください');
    return;
  }

  state.expenses.push({
    id: Date.now(),
    category,
    amount,
    memo,
    date: new Date().toISOString()
  });

  document.getElementById('amount-input').value = '';
  document.getElementById('memo-input').value = '';
  saveState();
  render();
});

document.getElementById('amount-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('add-expense-btn').click();
});

// 全リセット
document.getElementById('clear-all-btn').addEventListener('click', () => {
  if (!confirm('全データをリセットします。よろしいですか？')) return;
  state = { budget: 0, expenses: [] };
  saveState();
  render();
});

// 初期化
loadState();
render();
