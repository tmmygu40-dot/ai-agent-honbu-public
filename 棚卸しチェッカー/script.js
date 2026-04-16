const STORAGE_KEY = 'tanaoroshi_items';

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
  const nameEl = document.getElementById('itemName');
  const bookEl = document.getElementById('bookQty');
  const actualEl = document.getElementById('actualQty');
  const priceEl = document.getElementById('unitPrice');

  const name = nameEl.value.trim();
  const book = parseInt(bookEl.value, 10);
  const actual = parseInt(actualEl.value, 10);
  const price = parseInt(priceEl.value, 10) || 0;

  if (!name) { alert('品目名を入力してください'); nameEl.focus(); return; }
  if (isNaN(book) || book < 0) { alert('帳簿数を正しく入力してください'); bookEl.focus(); return; }
  if (isNaN(actual) || actual < 0) { alert('実数を正しく入力してください'); actualEl.focus(); return; }

  items.push({ id: Date.now(), name, book, actual, price });
  save();
  render();

  nameEl.value = '';
  bookEl.value = '';
  actualEl.value = '';
  priceEl.value = '';
  nameEl.focus();
}

function deleteItem(id) {
  items = items.filter(it => it.id !== id);
  save();
  render();
}

function clearAll() {
  if (items.length === 0) return;
  if (!confirm('全件削除しますか？')) return;
  items = [];
  save();
  render();
}

function resetSession() {
  if (!confirm('セッションをリセットします（全データ削除）。よろしいですか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  items = [];
  render();
}

function fmt(n) {
  return n.toLocaleString();
}

function render() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');
  const listHeader = document.getElementById('listHeader');
  const summarySection = document.getElementById('summarySection');

  if (items.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    listHeader.style.display = 'none';
    summarySection.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  listHeader.style.display = 'flex';
  summarySection.style.display = 'flex';

  let totalDiff = 0;
  let totalLoss = 0;

  list.innerHTML = items.map(it => {
    const diff = it.actual - it.book;
    const loss = diff * it.price;
    totalDiff += diff;
    totalLoss += loss;

    const diffClass = diff > 0 ? 'diff-plus' : diff < 0 ? 'diff-minus' : 'diff-zero';
    const diffSign = diff > 0 ? '+' : '';
    const lossClass = loss < 0 ? 'loss-minus' : 'loss-zero';
    const lossSign = loss > 0 ? '+' : '';
    const lossStr = it.price > 0 ? `${lossSign}¥${fmt(loss)}` : '—';
    const priceStr = it.price > 0 ? `¥${fmt(it.price)}` : '—';

    return `
      <div class="item-row">
        <span class="col-name">${escHtml(it.name)}</span>
        <span class="col-num">${fmt(it.book)}</span>
        <span class="col-num">${fmt(it.actual)}</span>
        <span class="col-num ${diffClass}">${diffSign}${fmt(diff)}</span>
        <span class="col-price">${priceStr}</span>
        <span class="col-price ${lossClass}">${lossStr}</span>
        <span class="col-action">
          <button class="btn-delete" onclick="deleteItem(${it.id})" title="削除">✕</button>
        </span>
      </div>
    `;
  }).join('');

  const totalDiffEl = document.getElementById('totalDiff');
  const totalLossEl = document.getElementById('totalLoss');

  const diffSign = totalDiff > 0 ? '+' : '';
  totalDiffEl.textContent = `${diffSign}${fmt(totalDiff)}`;
  totalDiffEl.style.color = totalDiff < 0 ? '#e74c3c' : totalDiff > 0 ? '#2ecc71' : '#fff';

  const lossSign = totalLoss > 0 ? '+' : '';
  totalLossEl.textContent = `${lossSign}¥${fmt(totalLoss)}`;
  totalLossEl.style.color = totalLoss < 0 ? '#e74c3c' : totalLoss > 0 ? '#2ecc71' : '#fff';
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Enterキーで登録
document.addEventListener('DOMContentLoaded', () => {
  ['itemName', 'bookQty', 'actualQty', 'unitPrice'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem();
    });
  });
  load();
});
