const STORAGE_KEY = 'keihiData';

let records = [];

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    records = saved ? JSON.parse(saved) : [];
  } catch (e) {
    records = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatYen(amount) {
  return '¥' + Number(amount).toLocaleString();
}

function renderList() {
  const tbody = document.getElementById('list-body');
  const table = document.getElementById('list-table');
  const emptyMsg = document.getElementById('empty-msg');

  tbody.innerHTML = '';

  if (records.length === 0) {
    table.style.display = 'none';
    emptyMsg.style.display = 'block';
  } else {
    table.style.display = 'table';
    emptyMsg.style.display = 'none';

    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((r, idx) => {
      const originalIdx = records.indexOf(r);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.date}</td>
        <td>${r.category}</td>
        <td style="text-align:right">${formatYen(r.amount)}</td>
        <td>${escapeHtml(r.memo)}</td>
        <td class="no-print"><button class="btn-delete" data-idx="${originalIdx}">削除</button></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function renderSummary() {
  const tbody = document.getElementById('summary-body');
  const totalEl = document.getElementById('total-amount');

  tbody.innerHTML = '';

  const categoryMap = {};
  let total = 0;

  records.forEach(r => {
    if (!categoryMap[r.category]) categoryMap[r.category] = 0;
    categoryMap[r.category] += Number(r.amount);
    total += Number(r.amount);
  });

  const categories = ['交通費', '宿泊費', '会議費', '接待費', '消耗品費', 'その他'];
  categories.forEach(cat => {
    if (categoryMap[cat]) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${cat}</td><td style="text-align:right">${formatYen(categoryMap[cat])}</td>`;
      tbody.appendChild(tr);
    }
  });

  // Any categories not in preset
  Object.keys(categoryMap).forEach(cat => {
    if (!categories.includes(cat)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${cat}</td><td style="text-align:right">${formatYen(categoryMap[cat])}</td>`;
      tbody.appendChild(tr);
    }
  });

  totalEl.textContent = formatYen(total);
}

function render() {
  renderList();
  renderSummary();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('btn-add').addEventListener('click', () => {
  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value;
  const amountVal = document.getElementById('amount').value;
  const memo = document.getElementById('memo').value.trim();

  if (!date) {
    alert('日付を入力してください');
    return;
  }
  const amount = parseInt(amountVal, 10);
  if (!amountVal || isNaN(amount) || amount <= 0) {
    alert('金額を正しく入力してください');
    return;
  }

  records.push({ date, category, amount, memo });
  save();
  render();

  document.getElementById('amount').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('amount').focus();
});

document.getElementById('list-body').addEventListener('click', e => {
  if (e.target.classList.contains('btn-delete')) {
    const idx = parseInt(e.target.dataset.idx, 10);
    if (confirm('この行を削除しますか？')) {
      records.splice(idx, 1);
      save();
      render();
    }
  }
});

document.getElementById('btn-print').addEventListener('click', () => {
  const titleInput = document.getElementById('title-input').value.trim();
  const printTitle = document.getElementById('print-title');
  printTitle.textContent = titleInput || '経費精算書';
  window.print();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('全データを削除しますか？この操作は元に戻せません。')) {
    records = [];
    save();
    render();
  }
});

// Set today's date as default
const today = new Date().toISOString().split('T')[0];
document.getElementById('date').value = today;

load();
render();
