const STORAGE_KEY = 'estimate_items';

let items = [];

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      items = JSON.parse(saved);
    }
  } catch (e) {
    items = [];
  }
  if (items.length === 0) {
    items = [createItem()];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function createItem() {
  return { id: Date.now() + Math.random(), name: '', qty: '', price: '' };
}

function calcSubtotal(item) {
  const qty = parseFloat(item.qty) || 0;
  const price = parseFloat(item.price) || 0;
  return qty * price;
}

function calcTotal() {
  return items.reduce((sum, item) => sum + calcSubtotal(item), 0);
}

function formatYen(num) {
  return '¥' + num.toLocaleString('ja-JP');
}

function renderTable() {
  const tbody = document.getElementById('item-list');
  tbody.innerHTML = '';

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="input-name" placeholder="品目名" value="${escHtml(item.name)}" data-idx="${index}" data-field="name"></td>
      <td><input type="number" placeholder="0" value="${escHtml(item.qty)}" data-idx="${index}" data-field="qty" min="0"></td>
      <td><input type="number" placeholder="0" value="${escHtml(item.price)}" data-idx="${index}" data-field="price" min="0"></td>
      <td class="subtotal-cell">${formatYen(calcSubtotal(item))}</td>
      <td><button class="delete-btn" data-idx="${index}" title="削除">✕</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('total-amount').textContent = formatYen(calcTotal());
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function handleInputChange(e) {
  const idx = parseInt(e.target.dataset.idx, 10);
  const field = e.target.dataset.field;
  if (field === undefined || idx === undefined || isNaN(idx)) return;
  items[idx][field] = e.target.value;
  saveToStorage();
  renderTable();

  // フォーカスを維持
  const inputs = document.querySelectorAll(`[data-idx="${idx}"][data-field="${field}"]`);
  if (inputs.length > 0) {
    const el = inputs[0];
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }
}

function handleDelete(e) {
  const idx = parseInt(e.target.dataset.idx, 10);
  if (isNaN(idx)) return;
  items.splice(idx, 1);
  if (items.length === 0) items.push(createItem());
  saveToStorage();
  renderTable();
}

function buildCopyText() {
  const lines = ['【見積もり内訳】'];
  items.forEach((item) => {
    const name = item.name || '（品目未入力）';
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.price) || 0;
    const sub = calcSubtotal(item);
    lines.push(`${name}　${qty}点 × ¥${price.toLocaleString('ja-JP')} = ¥${sub.toLocaleString('ja-JP')}`);
  });
  lines.push('');
  lines.push(`合計金額：${formatYen(calcTotal())}`);
  return lines.join('\n');
}

function showCopyMsg() {
  const msg = document.getElementById('copy-msg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 2000);
}

document.getElementById('add-row-btn').addEventListener('click', () => {
  items.push(createItem());
  saveToStorage();
  renderTable();
  // 新しい行の品目入力にフォーカス
  const inputs = document.querySelectorAll('[data-field="name"]');
  if (inputs.length > 0) inputs[inputs.length - 1].focus();
});

document.getElementById('item-list').addEventListener('input', (e) => {
  if (e.target.dataset.field !== undefined) {
    handleInputChange(e);
  }
});

document.getElementById('item-list').addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-btn')) {
    handleDelete(e);
  }
});

document.getElementById('copy-btn').addEventListener('click', () => {
  const text = buildCopyText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopyMsg).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
});

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showCopyMsg();
  } catch (e) {
    alert('コピーできませんでした。手動でコピーしてください。\n\n' + text);
  }
  document.body.removeChild(ta);
}

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('すべての入力をリセットしますか？')) return;
  items = [createItem()];
  saveToStorage();
  renderTable();
});

// 初期化
loadFromStorage();
renderTable();
