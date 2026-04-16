const STORAGE_KEY = 'shiftWishes';
const DAY_ORDER = ['月', '火', '水', '木', '金', '土', '日'];

let shifts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let viewMode = 'staff'; // 'staff' or 'day'

function saveShifts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

function addShift() {
  const name = document.getElementById('staffName').value.trim();
  const day = document.getElementById('dayOfWeek').value;
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('スタッフ名を入力してください。');
    document.getElementById('staffName').focus();
    return;
  }

  if (!start || !end) {
    alert('時間帯を入力してください。');
    return;
  }

  if (start >= end) {
    alert('終了時刻は開始時刻より後にしてください。');
    return;
  }

  const shift = {
    id: Date.now(),
    name,
    day,
    start,
    end,
    memo
  };

  shifts.push(shift);
  saveShifts();
  renderList();

  document.getElementById('staffName').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('staffName').focus();
}

function deleteShift(id) {
  shifts = shifts.filter(s => s.id !== id);
  saveShifts();
  renderList();
}

function formatTime(t) {
  // "09:00" -> "9:00" for display
  return t.replace(/^0/, '');
}

function renderList() {
  const container = document.getElementById('listContainer');

  if (shifts.length === 0) {
    container.innerHTML = '<p class="empty-msg">希望はまだ登録されていません。</p>';
    return;
  }

  if (viewMode === 'staff') {
    renderByStaff(container);
  } else {
    renderByDay(container);
  }
}

function renderByStaff(container) {
  // グループ化
  const groups = {};
  shifts.forEach(s => {
    if (!groups[s.name]) groups[s.name] = [];
    groups[s.name].push(s);
  });

  const names = Object.keys(groups).sort();
  let html = '';

  names.forEach(name => {
    html += `<div class="group-block">`;
    html += `<div class="group-title">${escapeHtml(name)}</div>`;

    const sorted = groups[name].slice().sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
    sorted.forEach(s => {
      html += shiftItemHtml(s, `${s.day}曜日`, `${formatTime(s.start)}〜${formatTime(s.end)}${s.memo ? ' (' + escapeHtml(s.memo) + ')' : ''}`);
    });

    html += `</div>`;
  });

  container.innerHTML = html;
}

function renderByDay(container) {
  const groups = {};
  DAY_ORDER.forEach(d => { groups[d] = []; });
  shifts.forEach(s => {
    groups[s.day].push(s);
  });

  let html = '';
  DAY_ORDER.forEach(day => {
    if (groups[day].length === 0) return;
    html += `<div class="group-block">`;
    html += `<div class="group-title">${day}曜日</div>`;

    const sorted = groups[day].slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    sorted.forEach(s => {
      html += shiftItemHtml(s, escapeHtml(s.name), `${formatTime(s.start)}〜${formatTime(s.end)}${s.memo ? ' (' + escapeHtml(s.memo) + ')' : ''}`);
    });

    html += `</div>`;
  });

  container.innerHTML = html;
}

function shiftItemHtml(shift, mainText, subText) {
  return `
    <div class="shift-item">
      <div class="shift-info">
        <span class="shift-main">${mainText}</span>
        <span class="shift-sub">${subText}</span>
      </div>
      <button class="delete-btn" onclick="deleteShift(${shift.id})" title="削除">✕</button>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// イベント
document.getElementById('addBtn').addEventListener('click', addShift);

document.getElementById('staffName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addShift();
});

document.getElementById('viewByStaff').addEventListener('click', () => {
  viewMode = 'staff';
  document.getElementById('viewByStaff').classList.add('active');
  document.getElementById('viewByDay').classList.remove('active');
  renderList();
});

document.getElementById('viewByDay').addEventListener('click', () => {
  viewMode = 'day';
  document.getElementById('viewByDay').classList.add('active');
  document.getElementById('viewByStaff').classList.remove('active');
  renderList();
});

// 初期表示
renderList();
