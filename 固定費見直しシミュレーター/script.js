const STORAGE_KEY = 'koteihi_items';
const REVENUE_KEY = 'koteihi_revenue';

let items = [];
let reductionRate = 20;

function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) items = JSON.parse(saved);
  const rev = localStorage.getItem(REVENUE_KEY);
  if (rev !== null) {
    document.getElementById('revenue').value = rev;
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  localStorage.setItem(REVENUE_KEY, document.getElementById('revenue').value);
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const amount = parseInt(document.getElementById('itemAmount').value, 10);
  const reducible = document.getElementById('itemReducible').checked;

  if (!name) { alert('項目名を入力してください'); return; }
  if (isNaN(amount) || amount < 0) { alert('金額を正しく入力してください'); return; }

  items.push({ id: Date.now(), name, amount, reducible });
  saveToStorage();

  document.getElementById('itemName').value = '';
  document.getElementById('itemAmount').value = '';
  document.getElementById('itemReducible').checked = false;

  render();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveToStorage();
  render();
}

function updateRate(val) {
  reductionRate = parseInt(val, 10);
  document.getElementById('rateLabel').textContent = reductionRate;
  renderSimulation();
}

function getRevenue() {
  const val = parseInt(document.getElementById('revenue').value, 10);
  return isNaN(val) || val < 0 ? null : val;
}

function render() {
  renderList();
  renderSummary();
  renderSimulation();
}

function renderList() {
  const el = document.getElementById('itemList');
  if (items.length === 0) {
    el.innerHTML = '<p class="empty-msg">まだ固定費が登録されていません</p>';
    return;
  }
  el.innerHTML = items.map(item => `
    <div class="item-entry">
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}
          ${item.reducible ? '<span class="badge-reducible">削減可能</span>' : ''}
        </div>
        <div class="item-amount">${item.amount.toLocaleString()} 円</div>
      </div>
      <button class="btn-delete" onclick="deleteItem(${item.id})">✕</button>
    </div>
  `).join('');
}

function renderSummary() {
  const totalFixed = items.reduce((s, i) => s + i.amount, 0);
  const totalReducible = items.filter(i => i.reducible).reduce((s, i) => s + i.amount, 0);

  document.getElementById('totalFixed').textContent = totalFixed.toLocaleString() + ' 円';
  document.getElementById('totalReducible').textContent = totalReducible.toLocaleString() + ' 円';

  const revenue = getRevenue();
  if (revenue !== null && revenue > 0) {
    const profit = revenue - totalFixed;
    const profitRate = ((profit / revenue) * 100).toFixed(1);
    document.getElementById('currentProfit').textContent = profit.toLocaleString() + ' 円';
    document.getElementById('currentProfitRate').textContent = profitRate + ' %';
    document.getElementById('profitRow').style.display = '';
    document.getElementById('profitRateRow').style.display = '';
  } else {
    document.getElementById('profitRow').style.display = 'none';
    document.getElementById('profitRateRow').style.display = 'none';
  }
}

function renderSimulation() {
  const totalFixed = items.reduce((s, i) => s + i.amount, 0);
  const totalReducible = items.filter(i => i.reducible).reduce((s, i) => s + i.amount, 0);
  const saving = Math.round(totalReducible * (reductionRate / 100));
  const afterFixed = totalFixed - saving;

  document.getElementById('savingAmount').textContent = saving.toLocaleString() + ' 円';
  document.getElementById('afterFixed').textContent = afterFixed.toLocaleString() + ' 円';

  const revenue = getRevenue();
  if (revenue !== null && revenue > 0) {
    const afterProfit = revenue - afterFixed;
    const currentProfit = revenue - totalFixed;
    const improvement = afterProfit - currentProfit;
    const afterRate = ((afterProfit / revenue) * 100).toFixed(1);

    document.getElementById('afterProfit').textContent = improvement.toLocaleString() + ' 円';
    document.getElementById('afterProfitRate').textContent = afterRate + ' %';
    document.getElementById('afterProfitRow').style.display = '';
    document.getElementById('afterProfitRateRow').style.display = '';
  } else {
    document.getElementById('afterProfitRow').style.display = 'none';
    document.getElementById('afterProfitRateRow').style.display = 'none';
  }
}

function clearAll() {
  if (!confirm('全データを削除しますか？')) return;
  items = [];
  document.getElementById('revenue').value = '';
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(REVENUE_KEY);
  render();
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 売上入力時もリアルタイム更新
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  render();
  document.getElementById('revenue').addEventListener('input', () => {
    saveToStorage();
    renderSummary();
    renderSimulation();
  });
});
