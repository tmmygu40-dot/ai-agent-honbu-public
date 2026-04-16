const STORAGE_KEY = 'saiyo_cost_data';

let records = [];

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { records = JSON.parse(saved); } catch { records = []; }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatNum(n) {
  return n.toLocaleString('ja-JP');
}

function calcUnitCost(cost, hires) {
  if (hires <= 0) return null;
  return Math.round(cost / hires);
}

function renderTable() {
  const tbody = document.getElementById('mediaBody');
  const emptyMsg = document.getElementById('emptyMsg');
  const summary = document.getElementById('summary');
  const table = document.getElementById('mediaTable');

  tbody.innerHTML = '';

  if (records.length === 0) {
    emptyMsg.style.display = 'block';
    table.style.display = 'none';
    summary.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  table.style.display = 'table';

  records.forEach((r, i) => {
    const uc = calcUnitCost(r.cost, r.hires);
    const ucText = uc !== null ? formatNum(uc) + ' 円' : '－';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.name)}</td>
      <td>${formatNum(r.applicants)} 人</td>
      <td>${formatNum(r.hires)} 人</td>
      <td>${formatNum(r.cost)} 円</td>
      <td class="unit-cost">${ucText}</td>
      <td><button class="delete-btn" data-index="${i}">削除</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Summary
  const totalApplicants = records.reduce((s, r) => s + r.applicants, 0);
  const totalHires = records.reduce((s, r) => s + r.hires, 0);
  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const avgUc = calcUnitCost(totalCost, totalHires);

  document.getElementById('totalApplicants').textContent = formatNum(totalApplicants) + ' 人';
  document.getElementById('totalHires').textContent = formatNum(totalHires) + ' 人';
  document.getElementById('totalCost').textContent = formatNum(totalCost) + ' 円';
  document.getElementById('avgCost').textContent = avgUc !== null ? formatNum(avgUc) + ' 円' : '－';

  summary.style.display = 'grid';

  // Delete buttons
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      records.splice(idx, 1);
      saveData();
      renderTable();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addRecord() {
  const nameEl = document.getElementById('mediaName');
  const applicantsEl = document.getElementById('applicants');
  const hiresEl = document.getElementById('hires');
  const costEl = document.getElementById('cost');
  const errorMsg = document.getElementById('errorMsg');

  const name = nameEl.value.trim();
  const applicants = parseInt(applicantsEl.value, 10);
  const hires = parseInt(hiresEl.value, 10);
  const cost = parseInt(costEl.value, 10);

  errorMsg.textContent = '';

  if (!name) { errorMsg.textContent = '媒体名を入力してください'; return; }
  if (isNaN(applicants) || applicants < 0) { errorMsg.textContent = '応募数を正しく入力してください'; return; }
  if (isNaN(hires) || hires < 0) { errorMsg.textContent = '採用数を正しく入力してください'; return; }
  if (isNaN(cost) || cost < 0) { errorMsg.textContent = 'コストを正しく入力してください'; return; }
  if (hires > applicants) { errorMsg.textContent = '採用数は応募数以下にしてください'; return; }

  records.push({ name, applicants, hires, cost });
  saveData();
  renderTable();

  nameEl.value = '';
  applicantsEl.value = '';
  hiresEl.value = '';
  costEl.value = '';
  nameEl.focus();
}

document.getElementById('addBtn').addEventListener('click', addRecord);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement !== document.getElementById('addBtn')) {
    addRecord();
  }
});

loadData();
renderTable();
