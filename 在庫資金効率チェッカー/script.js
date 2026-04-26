const STORAGE_KEY = 'zaiko_items';
const TURNOVER_WARN_DAYS = 60; // 60日以上は警告

let items = [];

function loadItems() {
  const data = localStorage.getItem(STORAGE_KEY);
  items = data ? JSON.parse(data) : [];
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const stock = parseFloat(document.getElementById('stockQty').value);
  const cost = parseFloat(document.getElementById('unitCost').value);
  const usage = parseFloat(document.getElementById('monthlyUsage').value);

  if (!name) {
    alert('品目名を入力してください');
    return;
  }
  if (isNaN(stock) || stock < 0) {
    alert('在庫数を正しく入力してください');
    return;
  }
  if (isNaN(cost) || cost < 0) {
    alert('仕入れ単価を正しく入力してください');
    return;
  }
  if (isNaN(usage) || usage <= 0) {
    alert('月間消費数を1以上で入力してください');
    return;
  }

  const turnoverDays = Math.round((stock / usage) * 30);
  const fundsLocked = stock * cost;

  items.push({
    id: Date.now(),
    name,
    stock,
    cost,
    usage,
    turnoverDays,
    fundsLocked,
    createdAt: Date.now()
  });

  saveItems();
  clearForm();
  renderList();
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
  renderList();
}

function clearForm() {
  document.getElementById('itemName').value = '';
  document.getElementById('stockQty').value = '';
  document.getElementById('unitCost').value = '';
  document.getElementById('monthlyUsage').value = '';
}

function getSortedItems() {
  const sort = document.getElementById('sortSelect').value;
  const sorted = [...items];
  if (sort === 'turnover_desc') {
    sorted.sort((a, b) => b.turnoverDays - a.turnoverDays);
  } else if (sort === 'turnover_asc') {
    sorted.sort((a, b) => a.turnoverDays - b.turnoverDays);
  } else if (sort === 'funds_desc') {
    sorted.sort((a, b) => b.fundsLocked - a.fundsLocked);
  }
  return sorted;
}

function formatNum(n) {
  return n.toLocaleString('ja-JP');
}

function renderList() {
  const listEl = document.getElementById('itemList');
  const summarySection = document.getElementById('summarySection');

  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">まだ品目が登録されていません</p>';
    summarySection.style.display = 'none';
    return;
  }

  summarySection.style.display = 'block';

  const totalFunds = items.reduce((sum, item) => sum + item.fundsLocked, 0);
  document.getElementById('totalItems').textContent = items.length;
  document.getElementById('totalFunds').textContent = '¥' + formatNum(totalFunds);

  const sorted = getSortedItems();
  listEl.innerHTML = sorted.map(item => {
    const isWarn = item.turnoverDays >= TURNOVER_WARN_DAYS;
    return `
      <div class="item-card${isWarn ? ' warning' : ''}">
        <button class="btn-delete" onclick="deleteItem(${item.id})" title="削除">✕</button>
        <div class="item-name">
          ${escHtml(item.name)}
          ${isWarn ? '<span class="warning-badge">回転遅い</span>' : ''}
        </div>
        <div class="item-metrics">
          <div class="metric${isWarn ? ' turnover-warn' : ''}">
            <div class="metric-label">在庫回転日数</div>
            <div class="metric-value">${formatNum(item.turnoverDays)} 日</div>
          </div>
          <div class="metric">
            <div class="metric-label">資金拘束額</div>
            <div class="metric-value">¥${formatNum(item.fundsLocked)}</div>
          </div>
        </div>
        <div class="item-details">
          <span>在庫：${formatNum(item.stock)}</span>
          <span>単価：¥${formatNum(item.cost)}</span>
          <span>月消費：${formatNum(item.usage)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 初期化
loadItems();
renderList();
