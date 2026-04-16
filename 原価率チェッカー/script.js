let products = [];
let sortKey = 'none';
let sortAsc = true;

function loadData() {
  const saved = localStorage.getItem('genkaRateChecker');
  if (saved) {
    products = JSON.parse(saved);
  }
}

function saveData() {
  localStorage.setItem('genkaRateChecker', JSON.stringify(products));
}

function calcRates(cost, sell) {
  if (sell === 0) return { costRate: 0, profitRate: 0, profit: 0 };
  const costRate = (cost / sell) * 100;
  const profitRate = 100 - costRate;
  const profit = sell - cost;
  return { costRate, profitRate, profit };
}

function getRateClass(profitRate) {
  if (profitRate < 30) return 'danger';
  if (profitRate < 50) return 'warning';
  return 'good';
}

function addProduct() {
  const name = document.getElementById('productName').value.trim();
  const cost = parseFloat(document.getElementById('costPrice').value);
  const sell = parseFloat(document.getElementById('sellPrice').value);

  if (!name) {
    alert('商品名を入力してください');
    return;
  }
  if (isNaN(cost) || cost < 0) {
    alert('仕入れ値を正しく入力してください');
    return;
  }
  if (isNaN(sell) || sell <= 0) {
    alert('売価を正しく入力してください（0より大きい値）');
    return;
  }
  if (cost > sell) {
    if (!confirm('仕入れ値が売価より高いです。このまま登録しますか？')) return;
  }

  const id = Date.now();
  products.push({ id, name, cost, sell });
  saveData();

  document.getElementById('productName').value = '';
  document.getElementById('costPrice').value = '';
  document.getElementById('sellPrice').value = '';

  renderList();
}

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  saveData();
  renderList();
}

function sortBy(key) {
  if (sortKey === key) {
    sortAsc = !sortAsc;
  } else {
    sortKey = key;
    sortAsc = true;
  }
  renderList();
}

function getSortedProducts() {
  if (sortKey === 'none') return [...products];

  return [...products].sort((a, b) => {
    let va, vb;
    if (sortKey === 'name') {
      va = a.name;
      vb = b.name;
      return sortAsc ? va.localeCompare(vb, 'ja') : vb.localeCompare(va, 'ja');
    }
    const ra = calcRates(a.cost, a.sell);
    const rb = calcRates(b.cost, b.sell);
    if (sortKey === 'costRate') {
      va = ra.costRate;
      vb = rb.costRate;
    } else if (sortKey === 'profit') {
      va = ra.profitRate;
      vb = rb.profitRate;
    }
    return sortAsc ? va - vb : vb - va;
  });
}

function renderList() {
  const listEl = document.getElementById('productList');
  const emptyMsg = document.getElementById('emptyMsg');
  const listHeader = document.getElementById('listHeader');
  const summaryBar = document.getElementById('summaryBar');
  const legend = document.getElementById('legend');
  const itemCount = document.getElementById('itemCount');
  const summaryText = document.getElementById('summaryText');

  // update sort button styles
  document.querySelectorAll('.btn-sort').forEach(btn => btn.classList.remove('active'));
  if (sortKey !== 'none') {
    const map = { name: 0, costRate: 1, profit: 2 };
    const btns = document.querySelectorAll('.btn-sort');
    if (btns[map[sortKey]]) btns[map[sortKey]].classList.add('active');
  }

  if (products.length === 0) {
    listEl.innerHTML = '';
    emptyMsg.style.display = 'block';
    listHeader.style.display = 'none';
    summaryBar.style.display = 'none';
    legend.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  listHeader.style.display = 'flex';
  legend.style.display = 'block';

  // summary
  const dangerCount = products.filter(p => calcRates(p.cost, p.sell).profitRate < 30).length;
  summaryBar.style.display = 'block';
  if (dangerCount > 0) {
    summaryText.innerHTML = `<strong style="color:#e74c3c">⚠ 利益率30%未満の商品が ${dangerCount} 件あります</strong>`;
  } else {
    summaryText.innerHTML = `<strong style="color:#27ae60">✓ 全商品の利益率が30%以上です</strong>`;
  }

  itemCount.textContent = `全 ${products.length} 件`;

  const sorted = getSortedProducts();
  listEl.innerHTML = sorted.map(p => {
    const { costRate, profitRate, profit } = calcRates(p.cost, p.sell);
    const cls = getRateClass(profitRate);
    return `
      <div class="product-item ${cls}">
        <div class="product-info">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-prices">仕入れ値：${p.cost.toLocaleString()}円 ／ 売価：${p.sell.toLocaleString()}円 ／ 粗利：${profit.toLocaleString()}円</div>
          <div class="product-rates">
            <div class="rate-item">
              <span class="rate-label">原価率</span>
              <span class="rate-value ${cls}">${costRate.toFixed(1)}%</span>
            </div>
            <div class="rate-item">
              <span class="rate-label">利益率</span>
              <span class="rate-value ${cls}">${profitRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <button class="btn-delete" onclick="deleteProduct(${p.id})">削除</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

loadData();
renderList();
