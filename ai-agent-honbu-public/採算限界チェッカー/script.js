const STORAGE_KEY = 'saisanLimitChecker';
const MAX_COST_ITEMS = 5;
const MAX_MONTHS = 60;

let products = [];

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) products = JSON.parse(data);
  } catch (e) {
    products = [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function getCostRows() {
  const rows = document.querySelectorAll('.cost-item-row');
  const costs = [];
  rows.forEach(row => {
    const name = row.querySelector('.cost-name').value.trim();
    const value = parseFloat(row.querySelector('.cost-value').value);
    const rate = parseFloat(row.querySelector('.cost-rate').value);
    if (name && !isNaN(value) && value >= 0 && !isNaN(rate) && rate >= 0) {
      costs.push({ name, value, rate });
    }
  });
  return costs;
}

// 赤字転落月を計算（1〜MAX_MONTHS月後、越えなければ null）
function calcBreakevenMonth(salePrice, costs) {
  for (let m = 1; m <= MAX_MONTHS; m++) {
    const totalCost = costs.reduce((sum, c) => {
      return sum + c.value * Math.pow(1 + c.rate / 100, m);
    }, 0);
    if (totalCost >= salePrice) return m;
  }
  return null;
}

function registerProduct() {
  const name = document.getElementById('productName').value.trim();
  const salePrice = parseFloat(document.getElementById('salePrice').value);
  const costs = getCostRows();

  if (!name) {
    alert('商品名を入力してください');
    return;
  }
  if (isNaN(salePrice) || salePrice <= 0) {
    alert('売価を正しく入力してください');
    return;
  }
  if (costs.length === 0) {
    alert('原価項目を最低1つ入力してください');
    return;
  }

  const currentTotalCost = costs.reduce((sum, c) => sum + c.value, 0);
  if (currentTotalCost >= salePrice) {
    alert('現時点で原価合計が売価を超えています（すでに赤字）');
  }

  const breakMonth = calcBreakevenMonth(salePrice, costs);

  const product = {
    id: Date.now(),
    name,
    salePrice,
    costs,
    currentTotalCost,
    breakMonth,
  };

  products.unshift(product);
  saveToStorage();
  renderProducts();
  clearForm();
}

function clearForm() {
  document.getElementById('productName').value = '';
  document.getElementById('salePrice').value = '';
  // コスト行をリセット（最初の1行だけ残す）
  const container = document.getElementById('costItems');
  const rows = container.querySelectorAll('.cost-item-row');
  rows.forEach((row, i) => {
    if (i === 0) {
      row.querySelectorAll('input').forEach(inp => inp.value = '');
    } else {
      row.remove();
    }
  });
}

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  saveToStorage();
  renderProducts();
}

function getStatusClass(breakMonth, currentTotalCost, salePrice) {
  if (currentTotalCost >= salePrice) return 'danger';
  if (breakMonth === null) return 'safe';
  if (breakMonth <= 12) return 'danger';
  if (breakMonth <= 24) return 'warning';
  return 'safe';
}

function getResultLabel(breakMonth, currentTotalCost, salePrice) {
  if (currentTotalCost >= salePrice) {
    return { text: '現在すでに赤字', cls: 'red' };
  }
  if (breakMonth === null) {
    return { text: `${MAX_MONTHS}ヶ月以内に赤字転落せず（安全）`, cls: 'green' };
  }
  const years = Math.floor(breakMonth / 12);
  const months = breakMonth % 12;
  let timeStr = '';
  if (years > 0) timeStr += `${years}年`;
  if (months > 0) timeStr += `${months}ヶ月`;
  if (!timeStr) timeStr = `${breakMonth}ヶ月`;

  if (breakMonth <= 12) {
    return { text: `⚠ ${timeStr}後に赤字転落予測（要対策）`, cls: 'red' };
  } else if (breakMonth <= 24) {
    return { text: `△ ${timeStr}後に赤字転落予測（注意）`, cls: 'orange' };
  } else {
    return { text: `○ ${timeStr}後に赤字転落予測`, cls: 'green' };
  }
}

function renderProducts() {
  const list = document.getElementById('productList');
  if (products.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ登録された商品がありません</p>';
    return;
  }

  list.innerHTML = products.map(p => {
    const statusClass = getStatusClass(p.breakMonth, p.currentTotalCost, p.salePrice);
    const label = getResultLabel(p.breakMonth, p.currentTotalCost, p.salePrice);
    const currentProfit = p.salePrice - p.currentTotalCost;
    const profitRate = p.salePrice > 0 ? (currentProfit / p.salePrice * 100).toFixed(1) : 0;

    const progressPct = p.breakMonth !== null
      ? Math.min(100, Math.round((p.breakMonth / MAX_MONTHS) * 100))
      : 100;

    const fillClass = p.breakMonth !== null && p.breakMonth <= MAX_MONTHS ? 'red' : 'safe';

    const costRows = p.costs.map(c => `
      <div class="cost-row">
        <span>${c.name}</span>
        <span>¥${c.value.toLocaleString()} <span class="rate">(+${c.rate}%/月)</span></span>
      </div>
    `).join('');

    return `
      <div class="product-card ${statusClass}">
        <div class="product-header">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <button class="btn-delete" onclick="deleteProduct(${p.id})">✕</button>
        </div>
        <div class="product-summary">
          <span>売価 ¥${p.salePrice.toLocaleString()}</span>
          <span>現在原価合計 ¥${Math.round(p.currentTotalCost).toLocaleString()}</span>
          <span>現在粗利率 ${profitRate}%</span>
        </div>
        <div class="result-label ${label.cls}">${label.text}</div>
        ${p.breakMonth !== null ? `
        <div class="timeline-bar">
          <div class="timeline-fill ${fillClass}" style="width:${progressPct}%"></div>
        </div>
        <div style="font-size:0.75rem;color:#999;margin-bottom:8px;">${p.breakMonth}ヶ月後 / 上限${MAX_MONTHS}ヶ月</div>
        ` : ''}
        <div class="cost-breakdown">
          <div class="cost-breakdown-title">原価内訳（月次上昇率）</div>
          ${costRows}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addCostRow() {
  const container = document.getElementById('costItems');
  const existing = container.querySelectorAll('.cost-item-row');
  if (existing.length >= MAX_COST_ITEMS) {
    alert(`原価項目は最大${MAX_COST_ITEMS}つまでです`);
    return;
  }
  const idx = existing.length;
  const row = document.createElement('div');
  row.className = 'cost-item-row';
  row.dataset.index = idx;
  row.innerHTML = `
    <input type="text" class="cost-name" placeholder="原価名" maxlength="30">
    <input type="number" class="cost-value" placeholder="金額（円）" min="0">
    <input type="number" class="cost-rate" placeholder="上昇率（%）" min="0" step="0.1">
    <button type="button" class="btn-remove-cost" onclick="this.parentElement.remove()">−</button>
  `;
  container.appendChild(row);
}

document.getElementById('addCostBtn').addEventListener('click', addCostRow);
document.getElementById('registerBtn').addEventListener('click', registerProduct);

loadFromStorage();
renderProducts();
