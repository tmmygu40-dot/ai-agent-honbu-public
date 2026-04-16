// ========== データ管理 ==========

const STORAGE_KEY = 'shift_app_data';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { staffList: [], offDays: {} };
    return JSON.parse(raw);
  } catch (e) {
    return { staffList: [], offDays: {} };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ========== ユーティリティ ==========

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function parseYearMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return { year: y, month: m - 1 };
}

function formatYearMonth(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// ========== スタッフ管理 ==========

function renderStaffList() {
  const data = loadData();
  const ul = document.getElementById('staffList');
  ul.innerHTML = '';
  data.staffList.forEach((name, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${name}</span><button class="del-btn" data-index="${i}" title="削除">×</button>`;
    ul.appendChild(li);
  });

  ul.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteStaff(Number(btn.dataset.index));
    });
  });

  updateStaffSelect();
}

function addStaff() {
  const input = document.getElementById('staffName');
  const name = input.value.trim();
  if (!name) return;
  const data = loadData();
  if (data.staffList.includes(name)) {
    alert('同名のスタッフがすでに存在します');
    return;
  }
  data.staffList.push(name);
  saveData(data);
  input.value = '';
  renderStaffList();
}

function deleteStaff(index) {
  const data = loadData();
  const name = data.staffList[index];
  if (!confirm(`「${name}」を削除しますか？関連する希望休データも削除されます。`)) return;
  data.staffList.splice(index, 1);
  // 関連する希望休を削除
  Object.keys(data.offDays).forEach(key => {
    if (key.startsWith(name + '_')) {
      delete data.offDays[key];
    }
  });
  saveData(data);
  renderStaffList();
}

function updateStaffSelect() {
  const data = loadData();
  const sel = document.getElementById('targetStaff');
  const current = sel.value;
  sel.innerHTML = '<option value="">スタッフを選択</option>';
  data.staffList.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ========== 希望休登録カレンダー ==========

function renderCalendarInput() {
  const staffName = document.getElementById('targetStaff').value;
  const monthStr = document.getElementById('targetMonth').value;
  const container = document.getElementById('calendarInput');

  if (!staffName || !monthStr) {
    container.innerHTML = '<p style="color:#aaa;font-size:13px;">スタッフと対象月を選んでください</p>';
    return;
  }

  const { year, month } = parseYearMonth(monthStr);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const data = loadData();
  const key = `${staffName}_${monthStr}`;
  const offSet = new Set(data.offDays[key] || []);

  let html = '';
  // ヘッダー（日〜土）
  DAY_NAMES.forEach(d => {
    html += `<div class="day-header">${d}</div>`;
  });

  // 先頭の空マス
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="day-cell empty"><label></label></div>`;
  }

  // 日付マス
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (firstDay + d - 1) % 7;
    const isOff = offSet.has(d);
    const dayName = DAY_NAMES[dow];
    html += `
      <div class="day-cell">
        <label class="${isOff ? 'off' : ''}">
          <input type="checkbox" value="${d}" ${isOff ? 'checked' : ''}>
          <span>${d}</span>
          <span class="day-name">${dayName}</span>
        </label>
      </div>`;
  }

  container.innerHTML = html;

  // チェック切り替えで見た目更新
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const label = cb.closest('label');
      if (cb.checked) {
        label.classList.add('off');
      } else {
        label.classList.remove('off');
      }
    });
  });
}

function saveOffDays() {
  const staffName = document.getElementById('targetStaff').value;
  const monthStr = document.getElementById('targetMonth').value;
  if (!staffName || !monthStr) {
    alert('スタッフと対象月を選択してください');
    return;
  }

  const checked = document.querySelectorAll('#calendarInput input[type="checkbox"]:checked');
  const offDaysList = Array.from(checked).map(cb => Number(cb.value));

  const data = loadData();
  const key = `${staffName}_${monthStr}`;
  if (offDaysList.length === 0) {
    delete data.offDays[key];
  } else {
    data.offDays[key] = offDaysList.sort((a, b) => a - b);
  }
  saveData(data);
  alert(`${staffName} の希望休を保存しました（${monthStr}）`);
}

// ========== シフト表生成 ==========

function generateShiftTable() {
  const monthStr = document.getElementById('shiftMonth').value;
  if (!monthStr) {
    alert('シフト月を選択してください');
    return;
  }

  const data = loadData();
  if (data.staffList.length === 0) {
    alert('スタッフを登録してください');
    return;
  }

  const { year, month } = parseYearMonth(monthStr);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // テーブル作成
  let html = `<table class="shift-table">`;

  // ヘッダー行：名前列 + 日付列
  html += `<thead><tr><th>スタッフ</th>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = (firstDay + d - 1) % 7;
    let cls = '';
    if (dow === 0) cls = 'weekend-sun';
    if (dow === 6) cls = 'weekend-sat';
    html += `<th class="${cls}">${d}<br><span style="font-size:10px;font-weight:normal;">${DAY_NAMES[dow]}</span></th>`;
  }
  html += `</tr></thead><tbody>`;

  // スタッフ行
  data.staffList.forEach(name => {
    const key = `${name}_${monthStr}`;
    const offSet = new Set(data.offDays[key] || []);
    html += `<tr><td class="staff-name">${name}</td>`;
    for (let d = 1; d <= daysInMonth; d++) {
      if (offSet.has(d)) {
        html += `<td class="cell-off">休</td>`;
      } else {
        html += `<td class="cell-work">出</td>`;
      }
    }
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  const wrap = document.getElementById('shiftTable');
  wrap.innerHTML = html;

  document.getElementById('printBtn').style.display = 'inline-block';
}

// ========== 初期化 ==========

function initMonthInputs() {
  const now = new Date();
  const thisMonth = formatYearMonth(now.getFullYear(), now.getMonth());
  document.getElementById('targetMonth').value = thisMonth;
  document.getElementById('shiftMonth').value = thisMonth;
}

document.addEventListener('DOMContentLoaded', () => {
  initMonthInputs();
  renderStaffList();
  renderCalendarInput();

  document.getElementById('addStaffBtn').addEventListener('click', addStaff);
  document.getElementById('staffName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addStaff();
  });

  document.getElementById('targetStaff').addEventListener('change', renderCalendarInput);
  document.getElementById('targetMonth').addEventListener('change', renderCalendarInput);

  document.getElementById('saveOffBtn').addEventListener('click', saveOffDays);
  document.getElementById('generateBtn').addEventListener('click', generateShiftTable);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
});
