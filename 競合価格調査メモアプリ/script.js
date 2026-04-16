const STORAGE_KEY = 'competitive_price_data';

let items = [];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch {
    items = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function render() {
  const list = document.getElementById('list');
  const emptyMsg = document.getElementById('emptyMsg');
  const count = document.getElementById('count');

  count.textContent = items.length + '件';

  if (items.length === 0) {
    emptyMsg.style.display = 'block';
    list.innerHTML = '';
    return;
  }

  emptyMsg.style.display = 'none';
  list.innerHTML = items.map((item, i) => {
    const diff = item.myPrice - item.competitorPrice;
    const diffRate = item.competitorPrice > 0
      ? ((diff / item.competitorPrice) * 100).toFixed(1)
      : 0;

    let diffClass = 'diff-same';
    let diffSign = '';
    if (diff < 0) {
      diffClass = 'diff-cheaper';
      diffSign = '';
    } else if (diff > 0) {
      diffClass = 'diff-expensive';
      diffSign = '+';
    }

    return `
      <div class="card">
        <div class="card-top">
          <div class="card-names">
            <div class="card-competitor">${escHtml(item.competitorName)}</div>
            <div class="card-product">${escHtml(item.productName)}</div>
          </div>
          <button class="delete-btn" onclick="deleteItem(${i})" title="削除">✕</button>
        </div>
        <div class="card-prices">
          <div class="price-block">
            <div class="price-label">競合価格</div>
            <div class="price-value">¥${item.competitorPrice.toLocaleString()}</div>
          </div>
          <div class="price-block">
            <div class="price-label">自社価格</div>
            <div class="price-value">¥${item.myPrice.toLocaleString()}</div>
          </div>
          <div class="price-block">
            <div class="price-label">差額</div>
            <div class="price-value ${diffClass}">${diffSign}¥${Math.abs(diff).toLocaleString()}<br><small>${diffSign}${diffRate}%</small></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addItem() {
  const competitorName = document.getElementById('competitorName').value.trim();
  const productName = document.getElementById('productName').value.trim();
  const competitorPrice = parseFloat(document.getElementById('competitorPrice').value);
  const myPrice = parseFloat(document.getElementById('myPrice').value);

  if (!competitorName || !productName) {
    alert('競合店名と商品名を入力してください');
    return;
  }
  if (isNaN(competitorPrice) || isNaN(myPrice)) {
    alert('価格を正しく入力してください');
    return;
  }

  items.unshift({ competitorName, productName, competitorPrice, myPrice });
  save();
  render();

  document.getElementById('competitorName').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('competitorPrice').value = '';
  document.getElementById('myPrice').value = '';
  document.getElementById('competitorName').focus();
}

function deleteItem(index) {
  items.splice(index, 1);
  save();
  render();
}

document.getElementById('addBtn').addEventListener('click', addItem);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    addItem();
  }
});

load();
render();
