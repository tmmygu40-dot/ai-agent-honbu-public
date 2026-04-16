// --- データ管理 ---
const STORAGE_KEY_RECORDS = 'tempRecords';
const STORAGE_KEY_THRESHOLDS = 'tempThresholds';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS)) || [];
  } catch { return []; }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
}

function loadThresholds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_THRESHOLDS)) || {};
  } catch { return {}; }
}

function saveThresholds(thresholds) {
  localStorage.setItem(STORAGE_KEY_THRESHOLDS, JSON.stringify(thresholds));
}

// --- 基準値 ---
function renderThresholds() {
  const thresholds = loadThresholds();
  const list = document.getElementById('thresholdList');
  const locationSelect = document.getElementById('locationSelect');
  const filterSelect = document.getElementById('filterLocation');

  list.innerHTML = '';
  locationSelect.innerHTML = '<option value="">場所を選択</option>';
  filterSelect.innerHTML = '<option value="">すべての場所</option>';

  const locations = Object.keys(thresholds);
  if (locations.length === 0) {
    list.innerHTML = '<li class="empty-msg">基準値が登録されていません</li>';
    return;
  }

  locations.forEach(loc => {
    const li = document.createElement('li');
    li.className = 'threshold-item';
    li.innerHTML = `
      <span><span class="loc-name">${escHtml(loc)}</span>
      <span class="threshold-val">　基準：${thresholds[loc]}℃ 以下</span></span>
      <button class="btn-icon" data-loc="${escHtml(loc)}" title="削除">✕</button>
    `;
    list.appendChild(li);

    const opt1 = document.createElement('option');
    opt1.value = loc;
    opt1.textContent = loc;
    locationSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = loc;
    opt2.textContent = loc;
    filterSelect.appendChild(opt2);
  });

  list.querySelectorAll('.btn-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      const loc = btn.dataset.loc;
      const t = loadThresholds();
      delete t[loc];
      saveThresholds(t);
      renderThresholds();
      renderRecords();
    });
  });
}

document.getElementById('addThresholdBtn').addEventListener('click', () => {
  const loc = document.getElementById('thresholdLocation').value.trim();
  const val = parseFloat(document.getElementById('thresholdValue').value);
  if (!loc) { alert('場所名を入力してください'); return; }
  if (isNaN(val)) { alert('基準値を入力してください'); return; }

  const t = loadThresholds();
  t[loc] = val;
  saveThresholds(t);
  document.getElementById('thresholdLocation').value = '';
  document.getElementById('thresholdValue').value = '';
  renderThresholds();
  renderRecords();
});

// --- 記録追加 ---
function getLocation() {
  const sel = document.getElementById('locationSelect').value;
  const manual = document.getElementById('locationManual').value.trim();
  return manual || sel;
}

function isAlert(location, temp) {
  const thresholds = loadThresholds();
  if (thresholds[location] !== undefined) {
    return temp > thresholds[location];
  }
  return false;
}

document.getElementById('addRecordBtn').addEventListener('click', () => {
  const location = getLocation();
  const temp = parseFloat(document.getElementById('tempInput').value);
  const datetime = document.getElementById('datetimeInput').value;
  const memo = document.getElementById('memoInput').value.trim();

  if (!location) { alert('場所を選択または入力してください'); return; }
  if (isNaN(temp)) { alert('温度を入力してください'); return; }
  if (!datetime) { alert('日時を入力してください'); return; }

  const records = loadRecords();
  records.unshift({
    id: Date.now(),
    location,
    temp,
    datetime,
    memo,
    alert: isAlert(location, temp)
  });
  saveRecords(records);

  document.getElementById('tempInput').value = '';
  document.getElementById('memoInput').value = '';
  document.getElementById('locationManual').value = '';

  renderRecords();
});

// --- 記録一覧 ---
function renderRecords() {
  const records = loadRecords();
  const thresholds = loadThresholds();

  // フィルター
  const filterLoc = document.getElementById('filterLocation').value;
  const filterAlert = document.getElementById('filterAlert').value;

  let filtered = records.map(r => ({
    ...r,
    alert: isAlert(r.location, r.temp)
  }));

  if (filterLoc) {
    filtered = filtered.filter(r => r.location === filterLoc);
  }
  if (filterAlert === 'alert') {
    filtered = filtered.filter(r => r.alert);
  } else if (filterAlert === 'normal') {
    filtered = filtered.filter(r => !r.alert);
  }

  const alertCount = filtered.filter(r => r.alert).length;
  const countEl = document.getElementById('recordCount');
  countEl.innerHTML = `全${filtered.length}件` +
    (alertCount > 0 ? `　<span class="alert-count">⚠️ 基準超え ${alertCount}件</span>` : '');

  const list = document.getElementById('recordList');
  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg">記録がありません</li>';
    return;
  }

  list.innerHTML = '';
  filtered.forEach(r => {
    const li = document.createElement('li');
    li.className = 'record-item' + (r.alert ? ' alert' : '');

    const dt = formatDatetime(r.datetime);
    const alertBadge = r.alert ? '<span class="alert-badge">基準超え</span>' : '';
    const thStr = thresholds[r.location] !== undefined
      ? `<span style="font-size:0.78rem;color:#718096;">基準:${thresholds[r.location]}℃</span>`
      : '';

    li.innerHTML = `
      <div class="record-info">
        <div class="record-location">${escHtml(r.location)} ${thStr}</div>
        <div class="record-temp">${r.temp}℃ ${alertBadge}</div>
        <div class="record-datetime">📅 ${escHtml(dt)}</div>
        ${r.memo ? `<div class="record-memo">📝 ${escHtml(r.memo)}</div>` : ''}
      </div>
      <div class="record-actions">
        <button class="btn-icon" data-id="${r.id}" title="削除">🗑️</button>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.btn-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const recs = loadRecords().filter(r => r.id !== id);
      saveRecords(recs);
      renderRecords();
    });
  });
}

// --- 全削除 ---
document.getElementById('clearAllBtn').addEventListener('click', () => {
  if (!confirm('すべての記録を削除しますか？')) return;
  saveRecords([]);
  renderRecords();
});

// --- フィルター変更 ---
document.getElementById('filterLocation').addEventListener('change', renderRecords);
document.getElementById('filterAlert').addEventListener('change', renderRecords);

// --- ユーティリティ ---
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDatetime(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  if (isNaN(d)) return dtStr;
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- 日時の初期値をセット ---
function setDefaultDatetime() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('datetimeInput').value = local;
}

// --- 初期化 ---
setDefaultDatetime();
renderThresholds();
renderRecords();
