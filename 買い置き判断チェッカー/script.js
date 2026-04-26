const STORAGE_KEY = 'stockup_items';

let currentResult = null;

function checkStockup() {
  const name = document.getElementById('itemName').value.trim();
  const price = parseFloat(document.getElementById('currentPrice').value);
  const riseRate = parseFloat(document.getElementById('riseRate').value);
  const monthlyUse = parseFloat(document.getElementById('monthlyUse').value);
  const stockCount = parseInt(document.getElementById('stockCount').value);

  if (!name) {
    alert('品目名を入力してください');
    return;
  }
  if (isNaN(price) || price <= 0) {
    alert('現在の単価を正しく入力してください');
    return;
  }
  if (isNaN(riseRate) || riseRate < 0) {
    alert('値上がり率を正しく入力してください');
    return;
  }
  if (isNaN(monthlyUse) || monthlyUse <= 0) {
    alert('月間消費量を正しく入力してください');
    return;
  }
  if (isNaN(stockCount) || stockCount < 1) {
    alert('買い置きできる数を1以上で入力してください');
    return;
  }

  const priceAfter = price * (1 + riseRate / 100);
  const priceIncrease = priceAfter - price;
  // 値上がり後の消費額（買い置き分）
  const savingPerUnit = priceIncrease;
  const totalSaving = savingPerUnit * stockCount;
  // 買い置き分が何ヶ月分か
  const monthsCovered = stockCount / monthlyUse;
  // 現在の買い置き費用
  const stockupCost = price * stockCount;
  // 値上がり後に同数買った場合の費用
  const normalCost = priceAfter * stockCount;
  // 節約金額（値上がり前に買う vs 値上がり後に買う の差）
  const savedAmount = normalCost - stockupCost;

  // 判定：値上がり率が0超で、かつ買い置き分 >= 0.5ヶ月分 → 推奨
  const isRecommend = riseRate > 0 && savedAmount > 0 && monthsCovered >= 0.5;

  currentResult = {
    name,
    price,
    riseRate,
    monthlyUse,
    stockCount,
    priceAfter: Math.round(priceAfter),
    savedAmount: Math.round(savedAmount),
    monthsCovered: Math.round(monthsCovered * 10) / 10,
    stockupCost: Math.round(stockupCost),
    isRecommend,
    date: new Date().toLocaleDateString('ja-JP')
  };

  showResult(currentResult);
}

function showResult(r) {
  const section = document.getElementById('resultSection');
  const card = document.getElementById('resultCard');
  const verdict = document.getElementById('verdict');
  const details = document.getElementById('resultDetails');

  section.classList.remove('hidden');
  card.className = 'result-card ' + (r.isRecommend ? 'recommend' : 'skip');

  if (r.isRecommend) {
    verdict.textContent = '✅ 今すぐ買い置き推奨！';
  } else if (r.riseRate === 0) {
    verdict.textContent = '⏸ 値上がりなし・判定不要';
  } else {
    verdict.textContent = '⛔ 買い置きの効果は小さい';
  }

  details.innerHTML = `
    <table>
      <tr><td>品目名</td><td>${escapeHtml(r.name)}</td></tr>
      <tr><td>現在の単価</td><td>${r.price.toLocaleString()} 円</td></tr>
      <tr><td>値上がり後の単価</td><td>${r.priceAfter.toLocaleString()} 円（+${r.riseRate}%）</td></tr>
      <tr><td>買い置き数</td><td>${r.stockCount} 個分（約 ${r.monthsCovered} ヶ月分）</td></tr>
      <tr><td>今買った場合の費用</td><td>${r.stockupCost.toLocaleString()} 円</td></tr>
      <tr><td>値上がり後に買う場合</td><td>${(r.priceAfter * r.stockCount).toLocaleString()} 円</td></tr>
      <tr><td>節約できる金額</td><td><strong>${r.savedAmount.toLocaleString()} 円</strong></td></tr>
    </table>
    <div class="result-actions">
      <button class="btn-save" onclick="saveCurrentResult()">この結果を保存する</button>
    </div>
  `;

  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveCurrentResult() {
  if (!currentResult) return;
  const items = loadItems();
  items.unshift(currentResult);
  saveItems(items);
  renderSavedList();
  alert('保存しました');
}

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderSavedList() {
  const items = loadItems();
  const container = document.getElementById('savedList');

  if (items.length === 0) {
    container.innerHTML = '<p class="empty-msg">保存された品目はありません</p>';
    return;
  }

  container.innerHTML = items.map((item, i) => `
    <div class="saved-item ${item.isRecommend ? 'recommend' : 'skip'}">
      <div class="saved-item-info">
        <div class="saved-item-name">${escapeHtml(item.name)}</div>
        <div class="saved-item-meta">
          単価 ${item.price}円 → ${item.priceAfter}円（+${item.riseRate}%）
          節約 ${item.savedAmount.toLocaleString()}円
          ${item.date}
        </div>
      </div>
      <div class="saved-item-verdict">${item.isRecommend ? '推奨' : '不要'}</div>
      <button class="btn-delete" onclick="deleteItem(${i})" title="削除">✕</button>
    </div>
  `).join('');
}

function deleteItem(index) {
  const items = loadItems();
  items.splice(index, 1);
  saveItems(items);
  renderSavedList();
}

function clearAll() {
  if (!confirm('保存済み一覧をすべて削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderSavedList();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 初期表示
renderSavedList();
