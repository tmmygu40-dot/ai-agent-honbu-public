const STORAGE_KEY = 'nouhinData';

let items = [];

// --- 初期化 ---
window.addEventListener('DOMContentLoaded', () => {
  // 今日の日付を自動セット
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('issueDate').value = `${yyyy}-${mm}-${dd}`;

  // localStorage から復元
  load();

  // 入力欄の変更でプレビュー更新
  document.getElementById('invoiceNo').addEventListener('input', updatePreview);
  document.getElementById('issueDate').addEventListener('input', updatePreview);
  document.getElementById('clientName').addEventListener('input', updatePreview);

  // Enterキーで品目追加
  ['itemName', 'itemQty', 'itemPrice'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') addItem();
    });
  });

  updatePreview();
  renderTable();
});

// --- 品目追加 ---
function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const qty = parseInt(document.getElementById('itemQty').value);
  const price = parseInt(document.getElementById('itemPrice').value);

  if (!name) {
    alert('品名を入力してください');
    document.getElementById('itemName').focus();
    return;
  }
  if (isNaN(qty) || qty <= 0) {
    alert('数量を正しく入力してください');
    document.getElementById('itemQty').focus();
    return;
  }
  if (isNaN(price) || price < 0) {
    alert('単価を正しく入力してください');
    document.getElementById('itemPrice').focus();
    return;
  }

  items.push({ name, qty, price });
  save();
  renderTable();
  calcTotal();

  // 入力欄リセット
  document.getElementById('itemName').value = '';
  document.getElementById('itemQty').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('itemName').focus();
}

// --- 品目削除 ---
function deleteItem(index) {
  items.splice(index, 1);
  save();
  renderTable();
  calcTotal();
}

// --- テーブル描画 ---
function renderTable() {
  const tbody = document.getElementById('itemList');
  const emptyRow = document.getElementById('emptyRow');

  // 既存の品目行をクリア（emptyRow以外）
  const rows = tbody.querySelectorAll('tr:not(#emptyRow)');
  rows.forEach(r => r.remove());

  if (items.length === 0) {
    emptyRow.style.display = '';
    return;
  }

  emptyRow.style.display = 'none';

  items.forEach((item, i) => {
    const amount = item.qty * item.price;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td style="text-align:left">${escHtml(item.name)}</td>
      <td>${item.qty}</td>
      <td>${formatNum(item.price)}</td>
      <td>${formatNum(amount)}</td>
      <td class="no-print">
        <button class="btn-delete" onclick="deleteItem(${i})" title="削除">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  calcTotal();
}

// --- 合計計算 ---
function calcTotal() {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  document.getElementById('subtotal').textContent = '¥' + formatNum(subtotal);
  document.getElementById('tax').textContent = '¥' + formatNum(tax);
  document.getElementById('total').textContent = '¥' + formatNum(total);
}

// --- プレビュー更新 ---
function updatePreview() {
  const client = document.getElementById('clientName').value.trim();
  const no = document.getElementById('invoiceNo').value.trim();
  const dateVal = document.getElementById('issueDate').value;

  document.getElementById('previewClient').textContent = client || '　';
  document.getElementById('previewNo').textContent = no || '　';

  if (dateVal) {
    const [y, m, d] = dateVal.split('-');
    document.getElementById('previewDate').textContent = `${y}年${m}月${d}日`;
  } else {
    document.getElementById('previewDate').textContent = '　';
  }
  save();
}

// --- 印刷 ---
function printInvoice() {
  window.print();
}

// --- 全クリア ---
function clearAll() {
  if (!confirm('全ての情報をクリアしますか？')) return;
  items = [];
  document.getElementById('invoiceNo').value = '';
  document.getElementById('clientName').value = '';
  document.getElementById('itemName').value = '';
  document.getElementById('itemQty').value = '';
  document.getElementById('itemPrice').value = '';

  // 今日の日付を再セット
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('issueDate').value = `${yyyy}-${mm}-${dd}`;

  save();
  renderTable();
  updatePreview();
}

// --- localStorage ---
function save() {
  const data = {
    invoiceNo: document.getElementById('invoiceNo').value,
    issueDate: document.getElementById('issueDate').value,
    clientName: document.getElementById('clientName').value,
    items
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.invoiceNo) document.getElementById('invoiceNo').value = data.invoiceNo;
    if (data.issueDate) document.getElementById('issueDate').value = data.issueDate;
    if (data.clientName) document.getElementById('clientName').value = data.clientName;
    if (Array.isArray(data.items)) items = data.items;
  } catch (e) {
    // 破損データは無視
  }
}

// --- ユーティリティ ---
function formatNum(n) {
  return n.toLocaleString('ja-JP');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
