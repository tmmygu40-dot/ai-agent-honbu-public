const STORAGE_KEY = 'medical_expense_records';

let records = [];

// --- ストレージ ---
function load() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    records = data ? JSON.parse(data) : [];
  } catch {
    records = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// --- 年度リスト ---
function getYears() {
  const years = [...new Set(records.map(r => r.date.slice(0, 4)))].sort((a, b) => b - a);
  const thisYear = String(new Date().getFullYear());
  if (!years.includes(thisYear)) years.unshift(thisYear);
  return years;
}

function getCurrentYear() {
  return document.getElementById('filterYear').value || String(new Date().getFullYear());
}

// --- フィルター対象のレコード ---
function getFilteredRecords() {
  const year = getCurrentYear();
  const member = document.getElementById('filterMember').value;
  const hospital = document.getElementById('filterHospital').value;
  return records.filter(r => {
    if (r.date.slice(0, 4) !== year) return false;
    if (member && r.member !== member) return false;
    if (hospital && r.hospital !== hospital) return false;
    return true;
  });
}

// --- 年度セレクト更新 ---
function updateYearSelect() {
  const sel = document.getElementById('filterYear');
  const cur = sel.value || String(new Date().getFullYear());
  const years = getYears();
  sel.innerHTML = years.map(y => `<option value="${y}"${y === cur ? ' selected' : ''}>${y}年</option>`).join('');
}

// --- フィルタードロップダウン更新 ---
function updateFilterOptions() {
  const year = getCurrentYear();
  const yearRecords = records.filter(r => r.date.slice(0, 4) === year);

  const members = [...new Set(yearRecords.map(r => r.member))].sort();
  const hospitals = [...new Set(yearRecords.map(r => r.hospital))].sort();

  const memberSel = document.getElementById('filterMember');
  const hospitalSel = document.getElementById('filterHospital');
  const curMember = memberSel.value;
  const curHospital = hospitalSel.value;

  memberSel.innerHTML = '<option value="">すべての家族</option>' +
    members.map(m => `<option value="${esc(m)}"${m === curMember ? ' selected' : ''}>${esc(m)}</option>`).join('');
  hospitalSel.innerHTML = '<option value="">すべての病院</option>' +
    hospitals.map(h => `<option value="${esc(h)}"${h === curHospital ? ' selected' : ''}>${esc(h)}</option>`).join('');
}

// --- 集計カード更新 ---
function updateSummary() {
  const year = getCurrentYear();
  const yearRecords = records.filter(r => r.date.slice(0, 4) === year);
  const area = document.getElementById('summaryArea');

  if (yearRecords.length === 0) {
    area.innerHTML = '';
    document.getElementById('yearTotal').textContent = '¥0';
    return;
  }

  const total = yearRecords.reduce((s, r) => s + r.amount, 0);
  document.getElementById('yearTotal').textContent = '¥' + total.toLocaleString();

  // 家族別集計
  const byMember = {};
  yearRecords.forEach(r => {
    byMember[r.member] = (byMember[r.member] || 0) + r.amount;
  });

  // 病院別集計
  const byHospital = {};
  yearRecords.forEach(r => {
    byHospital[r.hospital] = (byHospital[r.hospital] || 0) + r.amount;
  });

  let html = '';
  Object.entries(byMember).sort((a, b) => b[1] - a[1]).forEach(([name, amt]) => {
    html += `<div class="summary-card type-member">
      <div class="label">家族</div>
      <div class="name" title="${esc(name)}">${esc(name)}</div>
      <div class="amount">¥${amt.toLocaleString()}</div>
    </div>`;
  });
  Object.entries(byHospital).sort((a, b) => b[1] - a[1]).forEach(([name, amt]) => {
    html += `<div class="summary-card type-hospital">
      <div class="label">病院</div>
      <div class="name" title="${esc(name)}">${esc(name)}</div>
      <div class="amount">¥${amt.toLocaleString()}</div>
    </div>`;
  });
  area.innerHTML = html;
}

// --- 記録一覧更新 ---
function updateList() {
  const filtered = getFilteredRecords().sort((a, b) => b.date.localeCompare(a.date));
  const list = document.getElementById('recordList');

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  list.innerHTML = filtered.map(r => `
    <div class="record-item" data-id="${r.id}">
      <div class="record-info">
        <div class="record-main">
          <span class="tag-member">${esc(r.member)}</span>
          <span class="tag-hospital">${esc(r.hospital)}</span>
          <span class="record-amount">¥${r.amount.toLocaleString()}</span>
        </div>
        <div class="record-meta">${esc(r.date)}</div>
        ${r.memo ? `<div class="record-memo">${esc(r.memo)}</div>` : ''}
      </div>
      <button class="btn-delete" data-id="${r.id}">削除</button>
    </div>
  `).join('');
}

// --- 全体更新 ---
function render() {
  updateYearSelect();
  updateFilterOptions();
  updateSummary();
  updateList();
}

// --- 追加 ---
document.getElementById('btnAdd').addEventListener('click', () => {
  const date = document.getElementById('inputDate').value.trim();
  const member = document.getElementById('inputMember').value.trim();
  const hospital = document.getElementById('inputHospital').value.trim();
  const amountRaw = document.getElementById('inputAmount').value.trim();
  const memo = document.getElementById('inputMemo').value.trim();

  if (!date || !member || !hospital || !amountRaw) {
    alert('日付・家族名・病院名・金額は必須です');
    return;
  }

  const amount = parseInt(amountRaw, 10);
  if (isNaN(amount) || amount < 0) {
    alert('金額には0以上の整数を入力してください');
    return;
  }

  records.push({ id: Date.now(), date, member, hospital, amount, memo });
  save();

  // 入力リセット
  document.getElementById('inputMember').value = '';
  document.getElementById('inputHospital').value = '';
  document.getElementById('inputAmount').value = '';
  document.getElementById('inputMemo').value = '';

  // 追加した年に切り替え
  document.getElementById('filterYear').value = date.slice(0, 4);
  render();
});

// --- 削除 ---
document.getElementById('recordList').addEventListener('click', e => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  save();
  render();
});

// --- 年度・フィルター変更 ---
document.getElementById('filterYear').addEventListener('change', render);
document.getElementById('filterMember').addEventListener('change', updateList);
document.getElementById('filterHospital').addEventListener('change', updateList);

// --- ユーティリティ ---
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 初期化 ---
(function init() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('inputDate').value = today;
  load();
  render();
})();
