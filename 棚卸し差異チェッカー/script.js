const STORAGE_KEY = 'stockcheck_items';

let items = [];

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      items = JSON.parse(saved);
    } catch (e) {
      items = [];
    }
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatCurrency(val) {
  return '¥' + Math.abs(val).toLocaleString();
}

function render() {
  const tbody = document.getElementById('itemTableBody');
  const summarySection = document.getElementById('summarySection');
  const listSection = document.getElementById('listSection');
  const emptyState = document.getElementById('emptyState');

  tbody.innerHTML = '';

  if (items.length === 0) {
    summarySection.style.display = 'none';
    listSection.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  summarySection.style.display = 'flex';
  listSection.style.display = 'block';
  emptyState.style.display = 'none';

  let totalLoss = 0;

  items.forEach((item, index) => {
    const diff = item.bookQty - item.actualQty;
    const loss = diff * item.unitPrice;
    totalLoss += loss;

    const tr = document.createElement('tr');

    let diffClass = 'diff-zero';
    let diffText = '0';
    if (diff > 0) {
      diffClass = 'diff-plus';
      diffText = '+' + diff;
    } else if (diff < 0) {
      diffClass = 'diff-minus';
      diffText = String(diff);
    }

    const lossClass = loss !== 0 ? 'loss-amount loss-nonzero' : 'loss-amount';
    const lossText = loss === 0 ? '¥0' : (loss > 0 ? '+' + formatCurrency(loss) : '-' + formatCurrency(loss));

    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${item.bookQty}</td>
      <td>${item.actualQty}</td>
      <td class="${diffClass}">${diffText}</td>
      <td>¥${item.unitPrice.toLocaleString()}</td>
      <td class="${lossClass}">${lossText}</td>
      <td><button class="btn-delete" onclick="deleteItem(${index})" aria-label="削除">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('totalLoss').textContent = totalLoss === 0 ? '¥0' : (totalLoss > 0 ? '+¥' + totalLoss.toLocaleString() : '-¥' + Math.abs(totalLoss).toLocaleString());
  document.getElementById('itemCount').textContent = items.length + '件';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

function addItem() {
  const nameEl = document.getElementById('itemName');
  const bookEl = document.getElementById('bookQty');
  const actualEl = document.getElementById('actualQty');
  const priceEl = document.getElementById('unitPrice');

  const name = nameEl.value.trim();
  const bookQty = parseInt(bookEl.value, 10);
  const actualQty = parseInt(actualEl.value, 10);
  const unitPrice = parseInt(priceEl.value, 10);

  if (!name) {
    nameEl.focus();
    return;
  }
  if (isNaN(bookQty) || bookQty < 0) {
    bookEl.focus();
    return;
  }
  if (isNaN(actualQty) || actualQty < 0) {
    actualEl.focus();
    return;
  }
  if (isNaN(unitPrice) || unitPrice < 0) {
    priceEl.focus();
    return;
  }

  items.push({ name, bookQty, actualQty, unitPrice });
  saveItems();
  render();

  nameEl.value = '';
  bookEl.value = '';
  actualEl.value = '';
  priceEl.value = '';
  nameEl.focus();
}

function deleteItem(index) {
  items.splice(index, 1);
  saveItems();
  render();
}

function clearAll() {
  if (!confirm('全件削除しますか？')) return;
  items = [];
  saveItems();
  render();
}

document.getElementById('addBtn').addEventListener('click', addItem);
document.getElementById('clearBtn').addEventListener('click', clearAll);

document.getElementById('unitPrice').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addItem();
});

loadItems();
render();
