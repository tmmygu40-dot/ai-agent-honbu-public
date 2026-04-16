// ---- データ ----
function getProperties() {
  return JSON.parse(localStorage.getItem('properties') || '[]');
}
function saveProperties(data) {
  localStorage.setItem('properties', JSON.stringify(data));
}
function getRecords() {
  return JSON.parse(localStorage.getItem('records') || '[]');
}
function saveRecords(data) {
  localStorage.setItem('records', JSON.stringify(data));
}

// ---- タブ切り替え ----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'income') updatePropertySelects();
    if (tab.dataset.tab === 'summary') renderSummary();
  });
});

// ---- 物件登録 ----
function addProperty() {
  const name = document.getElementById('propName').value.trim();
  const loan = parseInt(document.getElementById('propLoan').value) || 0;
  if (!name) { alert('物件名を入力してください'); return; }

  const props = getProperties();
  props.push({ id: Date.now(), name, loan });
  saveProperties(props);

  document.getElementById('propName').value = '';
  document.getElementById('propLoan').value = '';
  renderPropertyList();
}

function renderPropertyList() {
  const props = getProperties();
  const el = document.getElementById('propertyList');
  if (props.length === 0) {
    el.innerHTML = '<div class="no-data">物件が登録されていません</div>';
    return;
  }
  el.innerHTML = props.map(p => `
    <div class="property-card">
      <div>
        <div class="name">${esc(p.name)}</div>
        <div class="loan">ローン月額：${p.loan.toLocaleString()}円</div>
      </div>
      <button class="btn-delete" onclick="deleteProperty(${p.id})">✕</button>
    </div>
  `).join('');
}

function deleteProperty(id) {
  if (!confirm('この物件を削除しますか？関連する収支データも削除されます。')) return;
  saveProperties(getProperties().filter(p => p.id !== id));
  saveRecords(getRecords().filter(r => r.propertyId !== id));
  renderPropertyList();
}

// ---- 収支入力 ----
function updatePropertySelects() {
  const props = getProperties();
  const opts = props.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  document.getElementById('incomeProperty').innerHTML = opts || '<option value="">（物件を先に登録してください）</option>';

  const filterOpts = '<option value="">全物件</option>' + props.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  document.getElementById('filterProperty').innerHTML = filterOpts;
}

function addRecord() {
  const propertyId = parseInt(document.getElementById('incomeProperty').value);
  const month = document.getElementById('incomeMonth').value;
  const rent = parseInt(document.getElementById('incomeRent').value) || 0;
  const repair = parseInt(document.getElementById('incomeRepair').value) || 0;
  const other = parseInt(document.getElementById('incomeOther').value) || 0;

  if (!propertyId) { alert('物件を選択してください'); return; }
  if (!month) { alert('年月を入力してください'); return; }

  const props = getProperties();
  const prop = props.find(p => p.id === propertyId);
  if (!prop) { alert('物件が見つかりません'); return; }

  const records = getRecords();
  // 同じ物件・同じ月が既にある場合は上書き確認
  const existIdx = records.findIndex(r => r.propertyId === propertyId && r.month === month);
  if (existIdx >= 0) {
    if (!confirm('同じ物件・年月のデータが既にあります。上書きしますか？')) return;
    records.splice(existIdx, 1);
  }

  records.push({ id: Date.now(), propertyId, propertyName: prop.name, month, rent, repair, other, loan: prop.loan });
  saveRecords(records);

  document.getElementById('incomeRent').value = '';
  document.getElementById('incomeRepair').value = '';
  document.getElementById('incomeOther').value = '';
  alert('記録しました');
}

// ---- 収支一覧 ----
function renderSummary() {
  const filterPropId = document.getElementById('filterProperty').value;
  const filterMonth = document.getElementById('filterMonth').value;

  let records = getRecords();
  if (filterPropId) records = records.filter(r => String(r.propertyId) === filterPropId);
  if (filterMonth) records = records.filter(r => r.month === filterMonth);

  records.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.propertyName.localeCompare(b.propertyName)));

  const el = document.getElementById('summaryList');
  const totalEl = document.getElementById('totalRow');

  if (records.length === 0) {
    el.innerHTML = '<div class="no-data">データがありません</div>';
    totalEl.innerHTML = '';
    return;
  }

  let totalBalance = 0;
  const rows = records.map(r => {
    const balance = r.rent - r.loan - r.repair - r.other;
    totalBalance += balance;
    const cls = balance >= 0 ? 'positive' : 'negative';
    return `
      <tr>
        <td>${r.month}</td>
        <td>${esc(r.propertyName)}</td>
        <td class="num">${r.rent.toLocaleString()}</td>
        <td class="num">${r.loan.toLocaleString()}</td>
        <td class="num">${r.repair.toLocaleString()}</td>
        <td class="num">${r.other.toLocaleString()}</td>
        <td class="num ${cls}">${balance >= 0 ? '+' : ''}${balance.toLocaleString()}</td>
        <td><button class="btn-row-delete" onclick="deleteRecord(${r.id})">✕</button></td>
      </tr>
    `;
  }).join('');

  el.innerHTML = `
    <table class="summary-table">
      <thead>
        <tr>
          <th>年月</th>
          <th>物件名</th>
          <th>収入</th>
          <th>ローン</th>
          <th>修繕費</th>
          <th>他支出</th>
          <th>収支</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  const balCls = totalBalance >= 0 ? '' : 'style="color:#ffcdd2"';
  totalEl.innerHTML = `合計収支：${totalBalance >= 0 ? '+' : ''}${totalBalance.toLocaleString()}円`;
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  saveRecords(getRecords().filter(r => r.id !== id));
  renderSummary();
}

// ---- ユーティリティ ----
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---- 初期化 ----
// 今月をデフォルト設定
const today = new Date();
const defaultMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
document.getElementById('incomeMonth').value = defaultMonth;
document.getElementById('filterMonth').value = defaultMonth;

renderPropertyList();
updatePropertySelects();
