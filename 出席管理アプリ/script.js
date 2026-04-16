'use strict';

// ---------- データ管理 ----------
const STORAGE_MEMBERS = 'attendance_members';
const STORAGE_RECORDS = 'attendance_records';

function loadMembers() {
  return JSON.parse(localStorage.getItem(STORAGE_MEMBERS) || '[]');
}

function saveMembers(members) {
  localStorage.setItem(STORAGE_MEMBERS, JSON.stringify(members));
}

function loadRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_RECORDS) || '{}');
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_RECORDS, JSON.stringify(records));
}

// ---------- メンバー管理 ----------
function renderMembers() {
  const members = loadMembers();
  const list = document.getElementById('memberList');
  list.innerHTML = '';
  members.forEach((name, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(name)}</span>
      <button class="delete-btn" data-idx="${idx}">削除</button>
    `;
    list.appendChild(li);
  });
  renderAttendanceForm();
  renderStats();
}

document.getElementById('addMemberBtn').addEventListener('click', () => {
  const input = document.getElementById('memberName');
  const name = input.value.trim();
  if (!name) return;
  const members = loadMembers();
  if (members.includes(name)) {
    alert('同じ名前がすでに登録されています');
    return;
  }
  members.push(name);
  saveMembers(members);
  input.value = '';
  renderMembers();
});

document.getElementById('memberName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addMemberBtn').click();
});

document.getElementById('memberList').addEventListener('click', (e) => {
  if (!e.target.classList.contains('delete-btn')) return;
  const idx = parseInt(e.target.dataset.idx, 10);
  const members = loadMembers();
  const name = members[idx];
  if (!confirm(`「${name}」を削除しますか？\n出欠記録も削除されます。`)) return;
  members.splice(idx, 1);
  saveMembers(members);

  // 記録からも削除
  const records = loadRecords();
  Object.keys(records).forEach(date => {
    delete records[date][name];
  });
  saveRecords(records);
  renderMembers();
});

// ---------- 出欠フォーム ----------
const statusMap = {
  present: '出席',
  absent: '欠席',
  late: '遅刻'
};

// 選択中の出欠状態（date → { name: status }）
let currentSelections = {};

function renderAttendanceForm() {
  const members = loadMembers();
  const dateInput = document.getElementById('recordDate');
  const date = dateInput.value;
  const form = document.getElementById('attendanceForm');
  form.innerHTML = '';

  if (members.length === 0) {
    form.innerHTML = '<p class="no-data">メンバーを登録してください</p>';
    return;
  }

  // 既存の記録を読み込む
  const records = loadRecords();
  const dayRecord = (date && records[date]) ? records[date] : {};

  // currentSelectionsをその日の記録で初期化
  if (date) {
    currentSelections[date] = currentSelections[date] || {};
    members.forEach(name => {
      if (dayRecord[name] && !currentSelections[date][name]) {
        currentSelections[date][name] = dayRecord[name];
      }
    });
  }

  members.forEach(name => {
    const currentStatus = (date && currentSelections[date]) ? currentSelections[date][name] : null;

    const row = document.createElement('div');
    row.className = 'attendance-row';
    row.innerHTML = `
      <span class="member-label">${escapeHtml(name)}</span>
      <div class="status-group">
        ${['present', 'absent', 'late'].map(s => `
          <button class="status-btn ${currentStatus === s ? 'active-' + s : ''}"
                  data-name="${escapeAttr(name)}" data-status="${s}">
            ${statusMap[s]}
          </button>
        `).join('')}
      </div>
    `;
    form.appendChild(row);
  });
}

document.getElementById('attendanceForm').addEventListener('click', (e) => {
  const btn = e.target.closest('.status-btn');
  if (!btn) return;
  const date = document.getElementById('recordDate').value;
  if (!date) {
    alert('日付を選択してください');
    return;
  }
  const name = btn.dataset.name;
  const status = btn.dataset.status;

  if (!currentSelections[date]) currentSelections[date] = {};
  // 同じボタンを再クリックで解除
  if (currentSelections[date][name] === status) {
    delete currentSelections[date][name];
  } else {
    currentSelections[date][name] = status;
  }
  renderAttendanceForm();
});

document.getElementById('recordDate').addEventListener('change', () => {
  renderAttendanceForm();
});

document.getElementById('saveAttendanceBtn').addEventListener('click', () => {
  const date = document.getElementById('recordDate').value;
  if (!date) {
    alert('日付を選択してください');
    return;
  }
  const sel = currentSelections[date] || {};
  const records = loadRecords();
  records[date] = { ...sel };
  saveRecords(records);
  renderStats();
  alert(`${date} の出欠を保存しました`);
});

// ---------- 月別出席率 ----------
function renderStats() {
  const monthInput = document.getElementById('selectedMonth');
  const month = monthInput.value; // "YYYY-MM"
  const tableDiv = document.getElementById('statsTable');

  if (!month) {
    tableDiv.innerHTML = '<p class="no-data">月を選択してください</p>';
    return;
  }

  const members = loadMembers();
  if (members.length === 0) {
    tableDiv.innerHTML = '<p class="no-data">メンバーを登録してください</p>';
    return;
  }

  const records = loadRecords();

  // 対象月の日付を抽出
  const dates = Object.keys(records).filter(d => d.startsWith(month)).sort();

  if (dates.length === 0) {
    tableDiv.innerHTML = '<p class="no-data">この月の記録はありません</p>';
    return;
  }

  // 集計: 出席(present/late)=出席扱い、absent=欠席
  const stats = members.map(name => {
    let presentCount = 0;
    let recordedCount = 0;
    dates.forEach(date => {
      const s = records[date][name];
      if (s) {
        recordedCount++;
        if (s === 'present' || s === 'late') presentCount++;
      }
    });
    const rate = recordedCount > 0 ? Math.round((presentCount / recordedCount) * 100) : null;
    return { name, presentCount, recordedCount, rate };
  });

  let html = `
    <table class="stats-table">
      <thead>
        <tr>
          <th>氏名</th>
          <th>出席日数</th>
          <th>記録日数</th>
          <th>出席率</th>
        </tr>
      </thead>
      <tbody>
  `;

  stats.forEach(({ name, presentCount, recordedCount, rate }) => {
    let rateClass = '';
    let rateText = '-';
    if (rate !== null) {
      rateText = rate + '%';
      if (rate >= 80) rateClass = 'rate-high';
      else if (rate >= 60) rateClass = 'rate-mid';
      else rateClass = 'rate-low';
    }
    html += `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${presentCount}</td>
        <td>${recordedCount}</td>
        <td class="${rateClass}">${rateText}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tableDiv.innerHTML = html;
}

document.getElementById('selectedMonth').addEventListener('change', renderStats);

// ---------- ユーティリティ ----------
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- 初期化 ----------
(function init() {
  // 今日の日付をデフォルト設定
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('recordDate').value = today;

  // 今月をデフォルト設定
  const thisMonth = today.slice(0, 7);
  document.getElementById('selectedMonth').value = thisMonth;

  renderMembers();
  renderStats();
})();
