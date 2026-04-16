// テーブルデータ: { id, tableNo, persons, startTs, limitMs }
let tables = [];
let intervalId = null;

// 初期化
(function init() {
  const saved = localStorage.getItem('nomihoudai_tables');
  if (saved) {
    tables = JSON.parse(saved);
  }
  setDefaultStartTime();
  render();
  startTick();
})();

function setDefaultStartTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('startTime').value = `${hh}:${mm}`;
}

function addTable() {
  const tableNo = document.getElementById('tableNo').value.trim();
  const persons = parseInt(document.getElementById('persons').value, 10);
  const limitMin = parseInt(document.getElementById('limitMin').value, 10);
  const startTimeStr = document.getElementById('startTime').value;

  if (!tableNo) {
    alert('テーブル番号を入力してください');
    return;
  }
  if (!startTimeStr) {
    alert('開始時刻を入力してください');
    return;
  }
  if (isNaN(limitMin) || limitMin < 1) {
    alert('制限時間を入力してください');
    return;
  }

  const today = new Date();
  const [hh, mm] = startTimeStr.split(':').map(Number);
  const startTs = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm, 0, 0).getTime();

  const table = {
    id: Date.now(),
    tableNo,
    persons: isNaN(persons) ? 1 : persons,
    startTs,
    limitMs: limitMin * 60 * 1000
  };

  tables.push(table);
  save();
  render();

  // フォームリセット
  document.getElementById('tableNo').value = '';
  document.getElementById('persons').value = '2';
  document.getElementById('limitMin').value = '90';
  setDefaultStartTime();
}

function deleteTable(id) {
  tables = tables.filter(t => t.id !== id);
  save();
  render();
}

function save() {
  localStorage.setItem('nomihoudai_tables', JSON.stringify(tables));
}

function startTick() {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(render, 1000);
}

function render() {
  const container = document.getElementById('tableCards');
  const countEl = document.getElementById('tableCount');
  countEl.textContent = `${tables.length}件`;

  if (tables.length === 0) {
    container.innerHTML = '<p class="empty-msg">テーブルがまだありません</p>';
    return;
  }

  const now = Date.now();
  // 残り時間でソート（少ない順）
  const sorted = [...tables].sort((a, b) => {
    const ra = a.startTs + a.limitMs - now;
    const rb = b.startTs + b.limitMs - now;
    return ra - rb;
  });

  container.innerHTML = sorted.map(t => {
    const remaining = t.startTs + t.limitMs - now;
    const isTimeUp = remaining <= 0;
    const pct = isTimeUp ? 0 : Math.max(0, Math.min(100, (remaining / t.limitMs) * 100));

    let statusClass = '';
    let timerText = '';

    if (isTimeUp) {
      statusClass = 'timeup';
      timerText = 'TIME UP';
    } else {
      const totalSec = Math.ceil(remaining / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) {
        timerText = `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      } else {
        timerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      }

      const remMin = remaining / 60000;
      if (remMin <= 5) {
        statusClass = 'danger';
      } else if (remMin <= 15) {
        statusClass = 'warn';
      }
    }

    const startDate = new Date(t.startTs);
    const startStr = `${String(startDate.getHours()).padStart(2,'0')}:${String(startDate.getMinutes()).padStart(2,'0')}`;
    const limitStr = Math.round(t.limitMs / 60000);
    const endDate = new Date(t.startTs + t.limitMs);
    const endStr = `${String(endDate.getHours()).padStart(2,'0')}:${String(endDate.getMinutes()).padStart(2,'0')}`;

    return `
      <div class="card ${statusClass}">
        <div class="card-top">
          <div>
            <div class="card-title">${escHtml(t.tableNo)}</div>
            <div class="card-sub">${t.persons}名　${startStr}開始 / ${limitStr}分制限（〜${endStr}）</div>
          </div>
          <button class="btn-delete" onclick="deleteTable(${t.id})" title="削除">✕</button>
        </div>
        <div class="timer-display">${timerText}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct.toFixed(1)}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
