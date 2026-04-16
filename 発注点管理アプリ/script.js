const STORAGE_KEY = 'reorderItems';

function loadItems() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const name = document.getElementById('name').value.trim();
  const stock = parseFloat(document.getElementById('stock').value);
  const dailyUse = parseFloat(document.getElementById('dailyUse').value);
  const leadTime = parseFloat(document.getElementById('leadTime').value);

  if (!name) { alert('商品名を入力してください'); return; }
  if (isNaN(stock) || stock < 0) { alert('在庫数を正しく入力してください'); return; }
  if (isNaN(dailyUse) || dailyUse <= 0) { alert('1日の消費量を正しく入力してください'); return; }
  if (isNaN(leadTime) || leadTime < 0) { alert('リードタイムを正しく入力してください'); return; }

  const items = loadItems();
  items.push({
    id: Date.now(),
    name,
    stock,
    dailyUse,
    leadTime
  });
  saveItems(items);
  render();

  document.getElementById('name').value = '';
  document.getElementById('stock').value = '';
  document.getElementById('dailyUse').value = '';
  document.getElementById('leadTime').value = '';
  document.getElementById('name').focus();
}

function deleteItem(id) {
  const items = loadItems().filter(item => item.id !== id);
  saveItems(items);
  render();
}

function updateStock(id) {
  const input = document.getElementById('update-' + id);
  const newStock = parseFloat(input.value);
  if (isNaN(newStock) || newStock < 0) { alert('在庫数を正しく入力してください'); return; }

  const items = loadItems().map(item => {
    if (item.id === id) return { ...item, stock: newStock };
    return item;
  });
  saveItems(items);
  render();
}

function getStatus(stock, dailyUse, leadTime) {
  const reorderPoint = leadTime * dailyUse;
  return { reorderPoint, needsOrder: stock <= reorderPoint };
}

function render() {
  const items = loadItems();
  const listEl = document.getElementById('itemList');
  const summaryEl = document.getElementById('summary');
  const alertCountEl = document.getElementById('alertCount');

  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">まだ商品が登録されていません</p>';
    summaryEl.classList.add('hidden');
    return;
  }

  const alertItems = items.filter(item => {
    const { needsOrder } = getStatus(item.stock, item.dailyUse, item.leadTime);
    return needsOrder;
  });

  if (alertItems.length > 0) {
    summaryEl.classList.remove('hidden');
    alertCountEl.textContent = `要発注 ${alertItems.length}件`;
  } else {
    summaryEl.classList.add('hidden');
  }

  listEl.innerHTML = items.map(item => {
    const { reorderPoint, needsOrder } = getStatus(item.stock, item.dailyUse, item.leadTime);
    const cardClass = needsOrder ? 'alert' : 'ok';
    const badgeClass = needsOrder ? 'alert' : 'ok';
    const badgeText = needsOrder ? '要発注' : '余裕あり';
    const daysLeft = item.dailyUse > 0 ? Math.floor(item.stock / item.dailyUse) : '∞';

    return `
      <div class="item-card ${cardClass}">
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-stats">
            <span>在庫：${item.stock}</span>
            <span>消費：${item.dailyUse}/日</span>
            <span>リードタイム：${item.leadTime}日</span>
            <span>残り約${daysLeft}日分</span>
          </div>
        </div>
        <div class="item-right">
          <span class="status-badge ${badgeClass}">${badgeText}</span>
          <span class="reorder-point">発注点：${reorderPoint}</span>
          <div class="update-stock">
            <input type="number" id="update-${item.id}" placeholder="在庫更新" min="0">
            <button class="btn-update" onclick="updateStock(${item.id})">更新</button>
          </div>
          <button class="btn-delete" onclick="deleteItem(${item.id})" title="削除">✕</button>
        </div>
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

document.addEventListener('DOMContentLoaded', render);

document.getElementById('name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});
