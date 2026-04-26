const STORAGE_KEY = 'tenka_cheker_items';

let items = [];

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { items = JSON.parse(saved); } catch(e) { items = []; }
  }
  render();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const name     = document.getElementById('itemName').value.trim();
  const oldCost  = parseFloat(document.getElementById('oldCost').value);
  const newCost  = parseFloat(document.getElementById('newCost').value);
  const oldPrice = parseFloat(document.getElementById('oldPrice').value);
  const newPrice = parseFloat(document.getElementById('newPrice').value);

  if (!name) { alert('品目名を入力してください'); return; }
  if (isNaN(oldCost) || isNaN(newCost) || isNaN(oldPrice) || isNaN(newPrice)) {
    alert('すべての金額を入力してください');
    return;
  }
  if (oldCost <= 0 || newCost <= 0 || oldPrice <= 0 || newPrice <= 0) {
    alert('金額は0より大きい値を入力してください');
    return;
  }

  items.push({ id: Date.now(), name, oldCost, newCost, oldPrice, newPrice });
  save();
  render();

  document.getElementById('itemName').value  = '';
  document.getElementById('oldCost').value   = '';
  document.getElementById('newCost').value   = '';
  document.getElementById('oldPrice').value  = '';
  document.getElementById('newPrice').value  = '';
  document.getElementById('itemName').focus();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  save();
  render();
}

function clearAll() {
  if (items.length === 0) return;
  if (!confirm('全品目を削除しますか？')) return;
  items = [];
  save();
  render();
}

function calcItem(item) {
  const costIncrease = item.newCost - item.oldCost;
  const costIncreaseRate = item.oldCost > 0 ? (costIncrease / item.oldCost) * 100 : 0;
  const requiredTransfer = costIncrease; // 仕入れ値の増加分をそのまま転嫁すべき額
  const actualTransfer = item.newPrice - item.oldPrice;
  const transferGap = actualTransfer - requiredTransfer; // +なら過剰、-なら不足

  let status;
  if (transferGap < -0.005) status = 'shortage';
  else if (transferGap > 0.005) status = 'excess';
  else status = 'adequate';

  const transferRate = requiredTransfer !== 0
    ? (actualTransfer / requiredTransfer) * 100
    : (actualTransfer === 0 ? 100 : Infinity);

  return { costIncrease, costIncreaseRate, requiredTransfer, actualTransfer, transferGap, transferRate, status };
}

function fmt(n) {
  if (!isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + n.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
}

function render() {
  const listEl = document.getElementById('itemList');
  const summarySection = document.getElementById('summarySection');

  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">品目がありません。上のフォームから追加してください。</p>';
    summarySection.style.display = 'none';
    return;
  }

  summarySection.style.display = 'block';

  let shortageCount = 0, adequateCount = 0, excessCount = 0;

  // 転嫁不足を先頭に並べ替え
  const sorted = [...items].sort((a, b) => {
    const order = { shortage: 0, adequate: 1, excess: 2 };
    return order[calcItem(a).status] - order[calcItem(b).status];
  });

  listEl.innerHTML = sorted.map(item => {
    const c = calcItem(item);
    if (c.status === 'shortage') shortageCount++;
    else if (c.status === 'adequate') adequateCount++;
    else excessCount++;

    const statusLabel = c.status === 'shortage' ? '転嫁不足'
                      : c.status === 'excess'   ? '過剰転嫁'
                      : '転嫁済み';
    const gapClass = c.transferGap < 0 ? 'negative' : 'positive';

    return `
      <div class="item-card ${c.status}">
        <button class="delete-btn" onclick="deleteItem(${item.id})" title="削除">×</button>
        <div class="item-name">${escHtml(item.name)}</div>
        <span class="item-status">${statusLabel}</span>
        <div class="item-metrics">
          <div class="metric">
            <div class="metric-label">仕入れ増加額</div>
            <div class="metric-value">${fmt(c.costIncrease)}円</div>
          </div>
          <div class="metric">
            <div class="metric-label">必要転嫁額</div>
            <div class="metric-value">${fmt(c.requiredTransfer)}円</div>
          </div>
          <div class="metric">
            <div class="metric-label">実際の転嫁額</div>
            <div class="metric-value">${fmt(c.actualTransfer)}円</div>
          </div>
          <div class="metric">
            <div class="metric-label">転嫁過不足</div>
            <div class="metric-value ${gapClass}">${fmt(c.transferGap)}円</div>
          </div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('totalCount').textContent    = items.length;
  document.getElementById('shortageCount').textContent = shortageCount;
  document.getElementById('adequateCount').textContent = adequateCount;
  document.getElementById('excessCount').textContent   = excessCount;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Enter キーで追加
document.addEventListener('DOMContentLoaded', () => {
  ['itemName','oldCost','newCost','oldPrice','newPrice'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem();
    });
  });
  load();
});
