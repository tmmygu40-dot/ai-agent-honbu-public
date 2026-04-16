// ===== 初期データ =====
const DAYS = ['月', '火', '水', '木', '金', '土', '日'];

let staff = [];       // ['田中', '鈴木', ...]
let timeSlots = [];   // ['朝', '昼', '夜']
let shiftData = {};   // { "2026-W15": { "朝": { "月": ['田中'], "火": [] }, ... } }
let currentWeekOffset = 0; // 0=今週, -1=先週, 1=来週

// ===== 初期化 =====
function init() {
  const saved = localStorage.getItem('shiftApp');
  if (saved) {
    const data = JSON.parse(saved);
    staff = data.staff || [];
    timeSlots = data.timeSlots || ['朝', '昼', '夜'];
    shiftData = data.shiftData || {};
  } else {
    timeSlots = ['朝', '昼', '夜'];
  }
  renderStaff();
  renderTimeSlots();
  renderTable();
}

// ===== 週キー取得 =====
function getWeekKey(offset) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const year = now.getFullYear();
  // ISO週番号
  const tmp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// 週の月曜日を返す
function getMondayOfWeek(offset) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const day = now.getDay() || 7; // 日=7
  now.setDate(now.getDate() - (day - 1));
  return now;
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// ===== スタッフ操作 =====
function addStaff() {
  const input = document.getElementById('staffName');
  const name = input.value.trim();
  if (!name) return;
  if (staff.includes(name)) { alert('同じ名前のスタッフが既にいます'); return; }
  staff.push(name);
  input.value = '';
  renderStaff();
  renderTable();
}

function removeStaff(name) {
  if (!confirm(`${name} を削除しますか？（シフトからも除去されます）`)) return;
  staff = staff.filter(s => s !== name);
  // シフトデータからも除去
  for (const wk in shiftData) {
    for (const slot in shiftData[wk]) {
      for (const day in shiftData[wk][slot]) {
        shiftData[wk][slot][day] = shiftData[wk][slot][day].filter(s => s !== name);
      }
    }
  }
  renderStaff();
  renderTable();
}

function renderStaff() {
  const list = document.getElementById('staffList');
  list.innerHTML = '';
  staff.forEach(name => {
    const tag = document.createElement('div');
    tag.className = 'staff-tag';
    tag.innerHTML = `<span>${name}</span><button class="del-btn" onclick="removeStaff('${escHtml(name)}')">✕</button>`;
    list.appendChild(tag);
  });
}

// ===== 時間帯操作 =====
function addTimeSlot() {
  const input = document.getElementById('timeName');
  const name = input.value.trim();
  if (!name) return;
  if (timeSlots.includes(name)) { alert('同じ時間帯が既にあります'); return; }
  timeSlots.push(name);
  input.value = '';
  renderTimeSlots();
  renderTable();
}

function removeTimeSlot(name) {
  if (!confirm(`時間帯「${name}」を削除しますか？`)) return;
  timeSlots = timeSlots.filter(s => s !== name);
  renderTimeSlots();
  renderTable();
}

function renderTimeSlots() {
  const list = document.getElementById('timeSlotList');
  list.innerHTML = '';
  timeSlots.forEach(name => {
    const tag = document.createElement('div');
    tag.className = 'slot-tag';
    tag.innerHTML = `<span>${name}</span><button class="del-btn" onclick="removeTimeSlot('${escHtml(name)}')">✕</button>`;
    list.appendChild(tag);
  });
}

// ===== テーブル描画 =====
function renderTable() {
  const wk = getWeekKey(currentWeekOffset);
  const monday = getMondayOfWeek(currentWeekOffset);

  // 週ラベル
  const endDay = new Date(monday);
  endDay.setDate(endDay.getDate() + 6);
  document.getElementById('weekLabel').textContent =
    `${formatDate(monday)}（月）〜 ${formatDate(endDay)}（日）  [${wk}]`;

  const table = document.getElementById('shiftTable');
  table.innerHTML = '';

  if (timeSlots.length === 0) {
    table.innerHTML = '<tr><td style="padding:12px;color:#999;">時間帯を追加してください</td></tr>';
    return;
  }

  // ヘッダー
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>時間帯</th>';
  DAYS.forEach((d, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    headerRow.innerHTML += `<th>${d}<br><span style="font-weight:normal;font-size:11px;">${formatDate(date)}</span></th>`;
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ボディ
  const tbody = document.createElement('tbody');

  if (!shiftData[wk]) shiftData[wk] = {};

  timeSlots.forEach(slot => {
    if (!shiftData[wk][slot]) shiftData[wk][slot] = {};
    DAYS.forEach(d => {
      if (!shiftData[wk][slot][d]) shiftData[wk][slot][d] = [];
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="time-label">${escHtml(slot)}</td>`;

    DAYS.forEach(day => {
      const assigned = shiftData[wk][slot][day];
      const td = document.createElement('td');
      td.className = 'shift-cell' + (assigned.length === 0 ? ' empty' : '');

      // 割り当て済みスタッフ表示
      assigned.forEach(name => {
        const span = document.createElement('span');
        span.className = 'cell-staff';
        span.title = 'クリックで除去';
        span.textContent = name;
        span.onclick = () => removeFromCell(wk, slot, day, name);
        td.appendChild(span);
      });

      // スタッフ追加セレクト
      if (staff.length > 0) {
        const sel = document.createElement('select');
        sel.className = 'cell-select';
        sel.innerHTML = '<option value="">＋追加</option>';
        staff.filter(s => !assigned.includes(s)).forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          sel.appendChild(opt);
        });
        sel.onchange = () => {
          if (sel.value) addToCell(wk, slot, day, sel.value);
        };
        td.appendChild(sel);
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

function addToCell(wk, slot, day, name) {
  if (!shiftData[wk][slot][day].includes(name)) {
    shiftData[wk][slot][day].push(name);
  }
  renderTable();
}

function removeFromCell(wk, slot, day, name) {
  shiftData[wk][slot][day] = shiftData[wk][slot][day].filter(s => s !== name);
  renderTable();
}

// ===== 週ナビ =====
function prevWeek() {
  currentWeekOffset--;
  renderTable();
}

function nextWeek() {
  currentWeekOffset++;
  renderTable();
}

// ===== クリア =====
function clearWeekShift() {
  const wk = getWeekKey(currentWeekOffset);
  if (!confirm(`${wk} のシフトをすべてクリアしますか？`)) return;
  delete shiftData[wk];
  renderTable();
}

// ===== 保存 =====
function saveAll() {
  const data = { staff, timeSlots, shiftData };
  localStorage.setItem('shiftApp', JSON.stringify(data));
  showToast('保存しました');
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ===== ユーティリティ =====
function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Enterキーで追加
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('staffName').addEventListener('keydown', e => { if (e.key === 'Enter') addStaff(); });
  document.getElementById('timeName').addEventListener('keydown', e => { if (e.key === 'Enter') addTimeSlot(); });
  init();
});
