const STORAGE_KEY = 'stealth_price_checker';

let currentResult = null;

function getUnit() {
  const u = document.getElementById('unit').value.trim();
  return u || 'g';
}

function updateUnitLabel() {
  document.getElementById('unitLabel').textContent = getUnit();
}

document.getElementById('unit').addEventListener('input', updateUnitLabel);

function calculate() {
  const name = document.getElementById('productName').value.trim();
  const oldAmt = parseFloat(document.getElementById('oldAmount').value);
  const newAmt = parseFloat(document.getElementById('newAmount').value);
  const oldPrice = parseFloat(document.getElementById('oldPrice').value);
  const newPrice = parseFloat(document.getElementById('newPrice').value);
  const unit = getUnit();

  if (!name) {
    alert('商品名を入力してください');
    return;
  }
  if (isNaN(oldAmt) || isNaN(newAmt) || isNaN(oldPrice) || isNaN(newPrice)) {
    alert('すべての数値を入力してください');
    return;
  }
  if (oldAmt <= 0 || newAmt <= 0 || oldPrice <= 0 || newPrice <= 0) {
    alert('0より大きい値を入力してください');
    return;
  }

  const oldUnitPrice = oldPrice / oldAmt;
  const newUnitPrice = newPrice / newAmt;
  const rateChange = ((newUnitPrice - oldUnitPrice) / oldUnitPrice) * 100;
  const priceChange = ((newPrice - oldPrice) / oldPrice) * 100;
  const amountChange = ((newAmt - oldAmt) / oldAmt) * 100;

  currentResult = {
    name,
    oldAmt, newAmt, oldPrice, newPrice, unit,
    oldUnitPrice, newUnitPrice, rateChange, priceChange, amountChange,
    date: new Date().toLocaleDateString('ja-JP')
  };

  renderResult(currentResult);
}

function renderResult(r) {
  const card = document.getElementById('resultCard');
  const content = document.getElementById('resultContent');

  const rateClass = r.rateChange > 0 ? 'danger' : 'ok';
  const rateSign = r.rateChange > 0 ? '+' : '';

  let verdict = '';
  if (r.rateChange > 0 && r.priceChange <= 0) {
    verdict = `<div class="verdict stealth">⚠️ ステルス値上げ検出！価格は据え置き（または値下げ）なのに内容量が減っています</div>`;
  } else if (r.rateChange > 0) {
    verdict = `<div class="verdict price-up">📈 実質値上がりしています（価格も内容量も変化）</div>`;
  } else {
    verdict = `<div class="verdict same">✅ 実質的な値上がりはありません</div>`;
  }

  content.innerHTML = `
    <div class="result-row">
      <span class="result-label">商品名</span>
      <span class="result-value">${escHtml(r.name)}</span>
    </div>
    <div class="result-row">
      <span class="result-label">内容量の変化</span>
      <span class="result-value">${r.oldAmt}${r.unit} → ${r.newAmt}${r.unit}（${r.amountChange >= 0 ? '+' : ''}${r.amountChange.toFixed(1)}%）</span>
    </div>
    <div class="result-row">
      <span class="result-label">価格の変化</span>
      <span class="result-value">${r.oldPrice}円 → ${r.newPrice}円（${r.priceChange >= 0 ? '+' : ''}${r.priceChange.toFixed(1)}%）</span>
    </div>
    <div class="result-row">
      <span class="result-label">旧単価</span>
      <span class="result-value">${r.oldUnitPrice.toFixed(2)}円/${r.unit}</span>
    </div>
    <div class="result-row">
      <span class="result-label">新単価</span>
      <span class="result-value">${r.newUnitPrice.toFixed(2)}円/${r.unit}</span>
    </div>
    <div class="result-row">
      <span class="result-label">実質値上がり率</span>
      <span class="result-value ${rateClass}">${rateSign}${r.rateChange.toFixed(1)}%</span>
    </div>
    ${verdict}
  `;

  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveRecord() {
  if (!currentResult) return;
  const records = loadRecords();
  records.unshift(currentResult);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  renderHistory();
  document.getElementById('resultCard').classList.add('hidden');
  resetForm();
}

function resetForm() {
  document.getElementById('productName').value = '';
  document.getElementById('oldAmount').value = '';
  document.getElementById('newAmount').value = '';
  document.getElementById('oldPrice').value = '';
  document.getElementById('newPrice').value = '';
  currentResult = null;
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const records = loadRecords();

  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ保存されたデータはありません</p>';
    return;
  }

  list.innerHTML = records.map((r, i) => {
    const rateClass = r.rateChange > 0 ? 'danger' : 'ok';
    const rateSign = r.rateChange > 0 ? '+' : '';
    let tag = '';
    if (r.rateChange > 0 && r.priceChange <= 0) tag = '⚠️ ステルス値上げ';
    else if (r.rateChange > 0) tag = '📈 実質値上がり';
    else tag = '✅ 変化なし';

    return `
      <div class="history-item">
        <div class="history-item-header">
          <span class="history-item-name">${escHtml(r.name)}</span>
          <span class="history-item-date">${r.date}</span>
        </div>
        <div class="history-item-detail">
          ${r.oldAmt}${r.unit}→${r.newAmt}${r.unit} / ${r.oldPrice}円→${r.newPrice}円<br>
          単価：${r.oldUnitPrice.toFixed(2)}→${r.newUnitPrice.toFixed(2)}円/${r.unit}
        </div>
        <div class="history-item-footer">
          <span>${tag} &nbsp;<span class="history-item-rate ${rateClass}">${rateSign}${r.rateChange.toFixed(1)}%</span></span>
          <button class="btn-delete" onclick="deleteRecord(${i})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function deleteRecord(index) {
  const records = loadRecords();
  records.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  renderHistory();
}

function clearAll() {
  if (!confirm('履歴をすべて削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 初期表示
renderHistory();
