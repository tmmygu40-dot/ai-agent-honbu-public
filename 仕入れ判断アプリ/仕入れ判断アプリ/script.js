const STORAGE_KEY = 'shiire_handan_items';

let items = loadItems();

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getRisk(changeRate) {
  if (changeRate < 0) return { key: 'risk-down', label: '価格低下' };
  if (changeRate < 5) return { key: 'risk-low', label: '低リスク' };
  if (changeRate < 10) return { key: 'risk-mid', label: '中リスク' };
  return { key: 'risk-high', label: '高リスク' };
}

function calcChangeRate(normal, current) {
  if (!normal || normal === 0) return 0;
  return ((current - normal) / normal) * 100;
}

function render() {
  const list = document.getElementById('itemList');
  const count = document.getElementById('itemCount');
  count.textContent = `${items.length}件`;

  if (items.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ品目が登録されていません</p>';
    return;
  }

  list.innerHTML = items.map((item, idx) => {
    const changeRate = calcChangeRate(item.normalPrice, item.currentPrice);
    const risk = getRisk(changeRate);
    const diff = item.currentPrice - item.normalPrice;
    const diffSign = diff > 0 ? '+' : '';
    const rateSign = changeRate > 0 ? '+' : '';
    const updown = diff > 0 ? 'up' : diff < 0 ? 'down' : '';

    return `
      <div class="item-card ${risk.key}">
        <div class="item-top">
          <span class="item-name">${escHtml(item.name)}</span>
          <div class="item-actions">
            <button class="btn-delete" onclick="deleteItem(${idx})">削除</button>
          </div>
        </div>
        <div class="item-body">
          <div class="info-box">
            <div class="info-label">通常価格</div>
            <div class="info-value">¥${item.normalPrice.toLocaleString()}</div>
          </div>
          <div class="info-box">
            <div class="info-label">現在価格</div>
            <div class="info-value ${updown}">¥${item.currentPrice.toLocaleString()}</div>
          </div>
          <div class="info-box">
            <div class="info-label">差額</div>
            <div class="info-value ${updown}">${diffSign}¥${diff.toLocaleString()}</div>
          </div>
          <div class="info-box">
            <div class="info-label">変動率</div>
            <div class="info-value ${updown}">${rateSign}${changeRate.toFixed(1)}%</div>
          </div>
          ${item.stock !== '' ? `
          <div class="info-box">
            <div class="info-label">在庫数</div>
            <div class="info-value">${item.stock}${escHtml(item.stockUnit || '')}</div>
          </div>` : ''}
        </div>
        <div class="item-badge-row">
          <span class="badge ${risk.key}">${risk.label}</span>
          ${item.memo ? `<span class="item-memo">${escHtml(item.memo)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const normalPrice = parseFloat(document.getElementById('normalPrice').value);
  const currentPrice = parseFloat(document.getElementById('currentPrice').value);
  const stock = document.getElementById('stock').value.trim();
  const stockUnit = document.getElementById('stockUnit').value.trim();
  const memo = document.getElementById('memo').value.trim();
  const errorMsg = document.getElementById('errorMsg');

  errorMsg.textContent = '';

  if (!name) {
    errorMsg.textContent = '品目名を入力してください';
    return;
  }
  if (isNaN(normalPrice) || normalPrice <= 0) {
    errorMsg.textContent = '通常仕入れ価格を正しく入力してください';
    return;
  }
  if (isNaN(currentPrice) || currentPrice <= 0) {
    errorMsg.textContent = '現在の仕入れ価格を正しく入力してください';
    return;
  }

  items.unshift({
    name,
    normalPrice,
    currentPrice,
    stock: stock !== '' ? parseFloat(stock) : '',
    stockUnit,
    memo,
    createdAt: new Date().toISOString()
  });

  saveItems();
  render();

  document.getElementById('itemName').value = '';
  document.getElementById('normalPrice').value = '';
  document.getElementById('currentPrice').value = '';
  document.getElementById('stock').value = '';
  document.getElementById('stockUnit').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('itemName').focus();
}

function deleteItem(idx) {
  if (!confirm(`「${items[idx].name}」を削除しますか？`)) return;
  items.splice(idx, 1);
  saveItems();
  render();
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
    addItem();
  }
});

render();
