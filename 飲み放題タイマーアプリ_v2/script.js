const STORAGE_KEY = 'nomihodai_v2_tables';

let tables = [];
let intervalId = null;

function loadTables() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      tables = JSON.parse(saved);
    } catch (e) {
      tables = [];
    }
  }
}

function saveTables() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
}

function setNowTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('startTime').value = `${hh}:${mm}`;
}

function addTable() {
  const tableNum = document.getElementById('tableNum').value.trim();
  const startTimeStr = document.getElementById('startTime').value;
  const duration = parseInt(document.getElementById('duration').value, 10);

  if (!tableNum) {
    alert('テーブル番号を入力してください');
    return;
  }
  if (!startTimeStr) {
    alert('着席時刻を入力してください');
    return;
  }
  if (!duration || duration < 1) {
    alert('制限時間を入力してください');
    return;
  }

  const now = new Date();
  const [hh, mm] = startTimeStr.split(':').map(Number);
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);

  // 翌日0時を跨ぐ場合（例：23:50登録を0:05に確認）は前日とみなさない
  // ただし未来時刻（今より5分以上先）は警告
  const diffMinutes = (startDate - now) / 60000;
  if (diffMinutes > 5) {
    if (!confirm(`着席時刻 ${startTimeStr} は現在より未来です。このまま登録しますか？`)) {
      return;
    }
  }

  const endTime = startDate.getTime() + duration * 60 * 1000;

  const entry = {
    id: Date.now(),
    tableNum,
    startTime: startDate.getTime(),
    duration,
    endTime
  };

  tables.push(entry);
  saveTables();
  renderTables();

  document.getElementById('tableNum').value = '';
  document.getElementById('startTime').value = '';
}

function deleteTable(id) {
  tables = tables.filter(t => t.id !== id);
  saveTables();
  renderTables();
}

function formatRemaining(ms) {
  if (ms <= 0) {
    const over = Math.abs(ms);
    const overMin = Math.floor(over / 60000);
    const overSec = Math.floor((over % 60000) / 1000);
    return { text: `+${String(overMin).padStart(2, '0')}:${String(overSec).padStart(2, '0')}`, status: 'over' };
  }
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const status = min < 10 ? 'warning' : 'ok';
  return { text: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, status };
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderTables() {
  const list = document.getElementById('tableList');
  const emptyMsg = document.getElementById('emptyMsg');

  if (tables.length === 0) {
    list.innerHTML = '<p class="empty-msg" id="emptyMsg">登録されているテーブルはありません</p>';
    return;
  }

  // 残り時間が短い順（超過→残りわずか→余裕）にソート
  const sorted = [...tables].sort((a, b) => a.endTime - b.endTime);

  let html = '';
  const now = Date.now();

  sorted.forEach(t => {
    const remaining = t.endTime - now;
    const { text, status } = formatRemaining(remaining);
    const cardClass = status === 'over' ? 'over' : status === 'warning' ? 'warning' : '';
    const endStr = formatTime(t.endTime);
    const startStr = formatTime(t.startTime);
    const overLabel = status === 'over' ? '<span class="over-badge">超過中</span>' : '';

    html += `
      <div class="table-card ${cardClass}" data-id="${t.id}">
        <div class="table-info">
          <div class="table-num">${escapeHtml(t.tableNum)}</div>
          <div class="table-meta">着席 ${startStr} ／ 終了 ${endStr} （${t.duration}分）${overLabel ? ' ' + overLabel : ''}</div>
        </div>
        <div class="table-timer">
          <div class="timer-label">${status === 'over' ? '超過' : '残り'}</div>
          <div class="timer-value">${text}</div>
        </div>
        <button class="delete-btn" onclick="deleteTable(${t.id})">退席</button>
      </div>
    `;
  });

  list.innerHTML = html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function startInterval() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(renderTables, 1000);
}

// 初期化
document.getElementById('nowBtn').addEventListener('click', setNowTime);
document.getElementById('addBtn').addEventListener('click', addTable);

// Enterキーでも登録
document.getElementById('tableNum').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTable();
});

loadTables();
renderTables();
startInterval();
