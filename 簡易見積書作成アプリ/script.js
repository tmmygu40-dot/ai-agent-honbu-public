const STORAGE_KEY = 'estimate_app_data';
let rowCount = 0;

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  loadFromStorage();
  if (document.getElementById('itemsBody').rows.length === 0) {
    addRow();
    addRow();
    addRow();
  }
  calcAll();
});

// 今日の日付をセット
function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const issueEl = document.getElementById('issueDate');
  if (!issueEl.value) issueEl.value = today;
}

// 行追加
function addRow() {
  rowCount++;
  const tbody = document.getElementById('itemsBody');
  const tr = document.createElement('tr');
  tr.dataset.rowId = rowCount;
  tr.innerHTML = `
    <td class="col-no">${tbody.rows.length + 1}</td>
    <td class="col-name"><input type="text" placeholder="品目・内容を入力" onchange="calcAll()"></td>
    <td class="col-qty"><input type="number" value="1" min="0" oninput="calcAll()"></td>
    <td class="col-unit"><input type="text" placeholder="式" value="式"></td>
    <td class="col-price"><input type="number" value="0" min="0" oninput="calcAll()"></td>
    <td class="col-subtotal row-subtotal">¥0</td>
    <td class="col-action no-print"><button class="btn-del" onclick="delRow(this)">削除</button></td>
  `;
  tbody.appendChild(tr);
  renumberRows();
  calcAll();
}

// 行削除
function delRow(btn) {
  const tr = btn.closest('tr');
  tr.remove();
  renumberRows();
  calcAll();
}

// 行番号振り直し
function renumberRows() {
  const rows = document.querySelectorAll('#itemsBody tr');
  rows.forEach((tr, i) => {
    tr.querySelector('.col-no').textContent = i + 1;
  });
}

// 計算
function calcAll() {
  let subtotal = 0;
  const rows = document.querySelectorAll('#itemsBody tr');
  rows.forEach(tr => {
    const qty = parseFloat(tr.querySelector('.col-qty input').value) || 0;
    const price = parseFloat(tr.querySelector('.col-price input').value) || 0;
    const rowSub = qty * price;
    subtotal += rowSub;
    tr.querySelector('.row-subtotal').textContent = formatYen(rowSub);
  });
  const tax = Math.floor(subtotal * 0.1);
  const grand = subtotal + tax;

  document.getElementById('subtotalDisplay').textContent = formatYen(subtotal);
  document.getElementById('taxDisplay').textContent = formatYen(tax);
  document.getElementById('grandTotalDisplay').textContent = formatYen(grand);
  document.getElementById('totalDisplay').textContent = formatYen(grand);
}

// 円フォーマット
function formatYen(num) {
  return '¥' + Math.floor(num).toLocaleString('ja-JP');
}

// localStorage 保存
function saveToStorage() {
  const rows = [];
  document.querySelectorAll('#itemsBody tr').forEach(tr => {
    rows.push({
      name: tr.querySelector('.col-name input').value,
      qty: tr.querySelector('.col-qty input').value,
      unit: tr.querySelector('.col-unit input').value,
      price: tr.querySelector('.col-price input').value,
    });
  });

  const data = {
    issueDate: document.getElementById('issueDate').value,
    estimateNo: document.getElementById('estimateNo').value,
    validDate: document.getElementById('validDate').value,
    clientName: document.getElementById('clientName').value,
    subject: document.getElementById('subject').value,
    fromCompany: document.getElementById('fromCompany').value,
    fromPerson: document.getElementById('fromPerson').value,
    fromTel: document.getElementById('fromTel').value,
    fromEmail: document.getElementById('fromEmail').value,
    remarks: document.getElementById('remarks').value,
    rows,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('保存しました');
}

// localStorage 読み込み
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.issueDate) document.getElementById('issueDate').value = data.issueDate;
    if (data.estimateNo) document.getElementById('estimateNo').value = data.estimateNo;
    if (data.validDate) document.getElementById('validDate').value = data.validDate;
    if (data.clientName) document.getElementById('clientName').value = data.clientName;
    if (data.subject) document.getElementById('subject').value = data.subject;
    if (data.fromCompany) document.getElementById('fromCompany').value = data.fromCompany;
    if (data.fromPerson) document.getElementById('fromPerson').value = data.fromPerson;
    if (data.fromTel) document.getElementById('fromTel').value = data.fromTel;
    if (data.fromEmail) document.getElementById('fromEmail').value = data.fromEmail;
    if (data.remarks) document.getElementById('remarks').value = data.remarks;

    if (data.rows && data.rows.length > 0) {
      data.rows.forEach(row => {
        addRow();
        const rows = document.querySelectorAll('#itemsBody tr');
        const tr = rows[rows.length - 1];
        tr.querySelector('.col-name input').value = row.name || '';
        tr.querySelector('.col-qty input').value = row.qty || 1;
        tr.querySelector('.col-unit input').value = row.unit || '式';
        tr.querySelector('.col-price input').value = row.price || 0;
      });
    }
  } catch (e) {
    // 読み込み失敗は無視
  }
}

// クリア
function clearAll() {
  if (!confirm('内容をすべてクリアしますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById('issueDate').value = '';
  document.getElementById('estimateNo').value = '';
  document.getElementById('validDate').value = '';
  document.getElementById('clientName').value = '';
  document.getElementById('subject').value = '';
  document.getElementById('fromCompany').value = '';
  document.getElementById('fromPerson').value = '';
  document.getElementById('fromTel').value = '';
  document.getElementById('fromEmail').value = '';
  document.getElementById('remarks').value = '';
  document.getElementById('itemsBody').innerHTML = '';
  rowCount = 0;
  setTodayDate();
  addRow(); addRow(); addRow();
  calcAll();
}
