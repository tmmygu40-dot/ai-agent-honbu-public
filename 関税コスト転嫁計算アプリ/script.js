const STORAGE_KEY = 'tariff_items';

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

function fmt(num) {
  return num.toLocaleString('ja-JP', { maximumFractionDigits: 0 }) + '円';
}

function calcValues(costPrice, tariffRate, profitRate) {
  const tariffCost = costPrice * (tariffRate / 100);
  const totalCost = costPrice + tariffCost;
  const sellPrice = profitRate < 100 ? totalCost / (1 - profitRate / 100) : 0;
  return { tariffCost, totalCost, sellPrice };
}

function calculate() {
  const name = document.getElementById('itemName').value.trim();
  const costPrice = parseFloat(document.getElementById('costPrice').value);
  const tariffRate = parseFloat(document.getElementById('tariffRate').value);
  const profitRate = parseFloat(document.getElementById('profitRate').value) || 30;

  if (!name) {
    alert('品目名を入力してください');
    return;
  }
  if (isNaN(costPrice) || costPrice < 0) {
    alert('仕入れ値を正しく入力してください');
    return;
  }
  if (isNaN(tariffRate) || tariffRate < 0 || tariffRate > 100) {
    alert('関税率を0〜100の範囲で入力してください');
    return;
  }

  const { tariffCost, totalCost, sellPrice } = calcValues(costPrice, tariffRate, profitRate);

  // プレビュー表示
  document.getElementById('prevCost').textContent = fmt(costPrice);
  document.getElementById('prevTariff').textContent = '+' + fmt(tariffCost) + '（+' + tariffRate + '%）';
  document.getElementById('prevTotal').textContent = fmt(totalCost);
  document.getElementById('prevSellPrice').textContent = fmt(Math.ceil(sellPrice));
  document.getElementById('previewSection').style.display = 'block';

  // 品目追加
  const item = {
    id: Date.now(),
    name,
    costPrice,
    tariffRate,
    profitRate,
    tariffCost,
    totalCost,
    sellPrice: Math.ceil(sellPrice)
  };
  items.unshift(item);
  saveItems();
  renderList();

  // フォームリセット（品目名・仕入れ値・関税率のみ）
  document.getElementById('itemName').value = '';
  document.getElementById('costPrice').value = '';
  document.getElementById('tariffRate').value = '';
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  saveItems();
  renderList();
}

function clearAll() {
  if (!confirm('全品目を削除しますか？')) return;
  items = [];
  saveItems();
  renderList();
  document.getElementById('previewSection').style.display = 'none';
}

function renderList() {
  const container = document.getElementById('itemList');
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-msg">品目を追加すると一覧に表示されます</p>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="item-card">
      <div class="item-name">${escHtml(item.name)}</div>
      <div class="item-values">
        <div class="item-val">
          <span class="lbl">仕入れ値</span>
          <span class="val">${fmt(item.costPrice)}</span>
        </div>
        <div class="item-val">
          <span class="lbl">関税率</span>
          <span class="val">${item.tariffRate}%</span>
        </div>
        <div class="item-val">
          <span class="lbl">関税コスト増加</span>
          <span class="val red">+${fmt(item.tariffCost)}</span>
        </div>
        <div class="item-val">
          <span class="lbl">関税後コスト</span>
          <span class="val">${fmt(item.totalCost)}</span>
        </div>
        <div class="item-val">
          <span class="lbl">目標粗利率</span>
          <span class="val">${item.profitRate}%</span>
        </div>
        <div class="item-val">
          <span class="lbl">必要売価</span>
          <span class="val orange">${fmt(item.sellPrice)}</span>
        </div>
      </div>
      <button class="btn-delete" onclick="deleteItem(${item.id})" title="削除">×</button>
    </div>
  `).join('');
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 初期表示
renderList();
