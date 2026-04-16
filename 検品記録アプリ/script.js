'use strict';

const STORAGE_KEY = 'inspection_records';

let records = [];

// --- DOM ---
const productNameEl = document.getElementById('productName');
const failReasonEl  = document.getElementById('failReason');
const reasonGroup   = document.getElementById('reasonGroup');
const addBtn        = document.getElementById('addBtn');
const clearBtn      = document.getElementById('clearBtn');
const recordList    = document.getElementById('recordList');
const statsSection  = document.getElementById('statsSection');
const statsTable    = document.getElementById('statsTable');
const totalCountEl  = document.getElementById('totalCount');
const passCountEl   = document.getElementById('passCount');
const failCountEl   = document.getElementById('failCount');
const failRateEl    = document.getElementById('failRate');

// --- 初期化 ---
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { records = JSON.parse(saved); } catch (_) { records = []; }
  }
  render();
  bindEvents();
}

function bindEvents() {
  // 合格/不良ラジオで不良理由欄の表示切替
  document.querySelectorAll('input[name="result"]').forEach(radio => {
    radio.addEventListener('change', () => {
      reasonGroup.style.display = radio.value === 'fail' ? 'block' : 'none';
      if (radio.value === 'pass') failReasonEl.value = '';
    });
  });

  addBtn.addEventListener('click', addRecord);

  productNameEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') addRecord();
  });

  clearBtn.addEventListener('click', () => {
    if (records.length === 0) return;
    if (confirm('全件削除しますか？')) {
      records = [];
      save();
      render();
    }
  });
}

function getResult() {
  const checked = document.querySelector('input[name="result"]:checked');
  return checked ? checked.value : 'pass';
}

function addRecord() {
  const name = productNameEl.value.trim();
  if (!name) {
    productNameEl.focus();
    productNameEl.style.borderColor = '#dc3545';
    setTimeout(() => { productNameEl.style.borderColor = ''; }, 1000);
    return;
  }

  const result = getResult();
  const reason = result === 'fail' ? failReasonEl.value.trim() : '';

  const record = {
    id: Date.now(),
    product: name,
    result,
    reason,
    time: new Date().toLocaleString('ja-JP', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  };

  records.unshift(record);
  save();
  render();

  // フォームリセット
  productNameEl.value = '';
  failReasonEl.value = '';
  document.querySelector('input[name="result"][value="pass"]').checked = true;
  reasonGroup.style.display = 'none';
  productNameEl.focus();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  save();
  render();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function render() {
  renderSummary();
  renderStats();
  renderList();
}

function renderSummary() {
  const total = records.length;
  const pass  = records.filter(r => r.result === 'pass').length;
  const fail  = records.filter(r => r.result === 'fail').length;
  const rate  = total > 0 ? ((fail / total) * 100).toFixed(1) : '0.0';

  totalCountEl.textContent = total;
  passCountEl.textContent  = pass;
  failCountEl.textContent  = fail;
  failRateEl.textContent   = rate + '%';
}

function renderStats() {
  if (records.length === 0) {
    statsSection.style.display = 'none';
    return;
  }

  // 製品別集計
  const map = {};
  records.forEach(r => {
    if (!map[r.product]) map[r.product] = { pass: 0, fail: 0 };
    if (r.result === 'pass') map[r.product].pass++;
    else map[r.product].fail++;
  });

  const rows = Object.entries(map)
    .sort((a, b) => (b[1].fail + b[1].pass) - (a[1].fail + a[1].pass))
    .map(([name, counts]) => {
      const total = counts.pass + counts.fail;
      const rate  = ((counts.fail / total) * 100).toFixed(1);
      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td style="color:#28a745;font-weight:600;">${counts.pass}</td>
        <td style="color:#dc3545;font-weight:600;">${counts.fail}</td>
        <td>${total}</td>
        <td style="color:#e67e22;font-weight:600;">${rate}%</td>
      </tr>`;
    }).join('');

  statsTable.innerHTML = `
    <table class="stats-table">
      <thead>
        <tr><th>製品名</th><th>合格</th><th>不良</th><th>合計</th><th>不良率</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  statsSection.style.display = 'block';
}

function renderList() {
  if (records.length === 0) {
    recordList.innerHTML = '<p class="empty-msg">記録はまだありません</p>';
    return;
  }

  recordList.innerHTML = records.map(r => `
    <div class="record-item ${r.result}">
      <span class="record-badge">${r.result === 'pass' ? '合格' : '不良'}</span>
      <div class="record-info">
        <div class="record-product">${escapeHtml(r.product)}</div>
        ${r.reason ? `<div class="record-reason">理由：${escapeHtml(r.reason)}</div>` : ''}
        <div class="record-time">${escapeHtml(r.time)}</div>
      </div>
      <button class="btn-delete" onclick="deleteRecord(${r.id})" title="削除">✕</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// グローバル公開（onclick用）
window.deleteRecord = deleteRecord;

init();
