const STORAGE_KEY = 'urgent_purchase_history';

function getVal(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function fmt(n) {
  return n.toLocaleString('ja-JP') + '円';
}

function calculate() {
  const dailyLoss = getVal('dailyLoss');
  const outOfStockDays = getVal('outOfStockDays');
  const normalPrice = getVal('normalPrice');
  const urgentPrice = getVal('urgentPrice');
  const quantity = getVal('quantity');

  if (dailyLoss === 0 && outOfStockDays === 0 && normalPrice === 0 && urgentPrice === 0 && quantity === 0) {
    alert('数値を入力してください。');
    return;
  }

  const totalOutOfStockLoss = dailyLoss * outOfStockDays;
  const extraCost = (urgentPrice - normalPrice) * quantity;

  const diff = totalOutOfStockLoss - extraCost;
  const isUrgent = diff > 0;

  const resultEl = document.getElementById('result');
  resultEl.classList.remove('hidden');

  let verdictClass = isUrgent ? 'urgent' : 'wait';
  let verdictText = isUrgent
    ? '今すぐ緊急調達すべき'
    : '待っても損失は少ない';

  let diffLabel = isUrgent
    ? '緊急調達のメリット'
    : '待つことのメリット';

  let diffClass = isUrgent ? 'diff-positive' : 'diff-negative';
  let diffValue = Math.abs(diff);

  resultEl.innerHTML = `
    <div class="verdict ${verdictClass}">${verdictText}</div>
    <div class="breakdown">
      <div class="breakdown-row">
        <span class="label">欠品損失合計（${outOfStockDays}日分）</span>
        <span class="value">${fmt(totalOutOfStockLoss)}</span>
      </div>
      <div class="breakdown-row">
        <span class="label">緊急調達の余分コスト</span>
        <span class="value">${fmt(Math.max(0, extraCost))}</span>
      </div>
      <div class="breakdown-row">
        <span class="label ${diffClass}">${diffLabel}</span>
        <span class="value ${diffClass}">${fmt(diffValue)}</span>
      </div>
    </div>
  `;

  saveHistory({
    date: new Date().toLocaleString('ja-JP'),
    isUrgent,
    totalOutOfStockLoss,
    extraCost: Math.max(0, extraCost),
    diff: diffValue,
    dailyLoss,
    outOfStockDays,
    normalPrice,
    urgentPrice,
    quantity
  });

  renderHistory();
}

function resetForm() {
  ['dailyLoss', 'outOfStockDays', 'normalPrice', 'urgentPrice', 'quantity'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('result').classList.add('hidden');
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 20) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function clearHistory() {
  if (!confirm('履歴をすべて削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  const container = document.getElementById('historyList');

  if (history.length === 0) {
    container.innerHTML = '<div class="empty-history">履歴はありません</div>';
    return;
  }

  container.innerHTML = history.map(h => {
    const verdictClass = h.isUrgent ? 'urgent' : 'wait';
    const itemClass = h.isUrgent ? 'urgent-item' : 'wait-item';
    const verdictText = h.isUrgent ? '今すぐ緊急調達すべき' : '待っても損失は少ない';
    const diffLabel = h.isUrgent ? 'メリット' : '待つメリット';

    return `
      <div class="history-item ${itemClass}">
        <div class="h-date">${h.date}</div>
        <div class="h-verdict ${verdictClass}">${verdictText}</div>
        <div class="h-detail">
          欠品損失: ${h.totalOutOfStockLoss.toLocaleString()}円 ／
          余分コスト: ${h.extraCost.toLocaleString()}円 ／
          ${diffLabel}: ${h.diff.toLocaleString()}円
        </div>
      </div>
    `;
  }).join('');
}

renderHistory();
