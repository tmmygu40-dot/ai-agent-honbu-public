const STORAGE_KEY = 'gross_profit_products';
let products = [];
let sortMode = 'profit';

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      products = JSON.parse(saved);
    } catch (e) {
      products = [];
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function addProduct() {
  const nameEl = document.getElementById('productName');
  const costEl = document.getElementById('costPrice');
  const sellEl = document.getElementById('sellPrice');
  const errorEl = document.getElementById('errorMsg');

  const name = nameEl.value.trim();
  const cost = parseFloat(costEl.value);
  const sell = parseFloat(sellEl.value);

  errorEl.textContent = '';

  if (!name) {
    errorEl.textContent = '商品名を入力してください';
    nameEl.focus();
    return;
  }
  if (isNaN(cost) || cost < 0) {
    errorEl.textContent = '仕入れ値を正しく入力してください';
    costEl.focus();
    return;
  }
  if (isNaN(sell) || sell < 0) {
    errorEl.textContent = '販売価格を正しく入力してください';
    sellEl.focus();
    return;
  }

  const profit = sell - cost;
  const margin = sell > 0 ? ((profit / sell) * 100) : 0;

  const product = {
    id: Date.now(),
    name,
    cost,
    sell,
    profit,
    margin
  };

  products.push(product);
  saveData();

  nameEl.value = '';
  costEl.value = '';
  sellEl.value = '';
  nameEl.focus();

  render();
}

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  saveData();
  render();
}

function setSortMode(mode) {
  sortMode = mode;
  document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('sort' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
  render();
}

function getSorted() {
  const copy = [...products];
  if (sortMode === 'profit') {
    copy.sort((a, b) => b.profit - a.profit);
  } else if (sortMode === 'margin') {
    copy.sort((a, b) => b.margin - a.margin);
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }
  return copy;
}

function formatNum(n) {
  return n.toLocaleString('ja-JP', { maximumFractionDigits: 0 });
}

function formatMargin(m) {
  return m.toFixed(1);
}

function render() {
  const emptySection = document.getElementById('emptySection');
  const listSection = document.getElementById('listSection');
  const summarySection = document.getElementById('summarySection');

  if (products.length === 0) {
    emptySection.style.display = '';
    listSection.style.display = 'none';
    summarySection.style.display = 'none';
    return;
  }

  emptySection.style.display = 'none';
  listSection.style.display = '';
  summarySection.style.display = '';

  // サマリー
  const totalCount = products.length;
  const avgMargin = products.reduce((s, p) => s + p.margin, 0) / totalCount;
  const sorted = getSorted();
  const top = sorted[0];

  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('avgMargin').textContent = formatMargin(avgMargin);
  document.getElementById('topProduct').textContent = top.name;

  // リスト
  const listEl = document.getElementById('productList');
  listEl.innerHTML = '';

  sorted.forEach((p, idx) => {
    const rank = idx + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : '';
    const rankLabel = rank === 1 ? '🥇 1位' : rank === 2 ? '🥈 2位' : rank === 3 ? '🥉 3位' : `${rank}位`;
    const profitClass = p.profit < 0 ? 'negative' : 'profit';
    const barWidth = Math.min(Math.max((p.sell > 0 ? (p.profit / p.sell) * 100 : 0), 0), 100);
    const barNeg = p.profit < 0;

    const card = document.createElement('div');
    card.className = `product-card${rankClass}`;
    card.innerHTML = `
      <button class="delete-btn" onclick="deleteProduct(${p.id})" title="削除">✕</button>
      <div class="card-top">
        <span class="product-name">${escapeHtml(p.name)}</span>
        <span class="rank-badge">${rankLabel}</span>
      </div>
      <div class="card-stats">
        <div class="stat-item">
          <span class="stat-label">仕入れ値</span>
          <span class="stat-value">¥${formatNum(p.cost)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">販売価格</span>
          <span class="stat-value">¥${formatNum(p.sell)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">粗利額</span>
          <span class="stat-value ${profitClass}">${p.profit >= 0 ? '+' : ''}¥${formatNum(p.profit)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">粗利率</span>
          <span class="stat-value ${profitClass}">${formatMargin(p.margin)}%</span>
        </div>
      </div>
      <div class="margin-bar-wrap">
        <div class="margin-bar${barNeg ? ' negative-bar' : ''}" style="width:${barWidth}%"></div>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// キーボード入力でEnter → 登録
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  render();

  ['productName', 'costPrice', 'sellPrice'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addProduct();
    });
  });
});
