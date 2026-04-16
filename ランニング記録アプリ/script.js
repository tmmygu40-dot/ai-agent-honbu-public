const STORAGE_KEY = 'running_records';

const distanceInput = document.getElementById('distance');
const hoursInput = document.getElementById('hours');
const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const memoInput = document.getElementById('memo');
const pacePreview = document.getElementById('pace-preview');
const paceValue = document.getElementById('pace-value');
const addBtn = document.getElementById('add-btn');
const recordList = document.getElementById('record-list');
const emptyMessage = document.getElementById('empty-message');
const recordCount = document.getElementById('record-count');
const statsEl = document.getElementById('stats');
const totalDistanceEl = document.getElementById('total-distance');
const avgPaceEl = document.getElementById('avg-pace');

let records = loadRecords();

// ---- Utility ----

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function calcPace(distanceKm, totalSeconds) {
  if (!distanceKm || distanceKm <= 0 || totalSeconds <= 0) return null;
  const paceSeconds = totalSeconds / distanceKm;
  const paceMin = Math.floor(paceSeconds / 60);
  const paceSec = Math.round(paceSeconds % 60);
  return { paceMin, paceSec, paceSeconds };
}

function formatPace(paceMin, paceSec) {
  return `${paceMin}'${String(paceSec).padStart(2, '0')}"/km`;
}

function formatTime(h, m, s) {
  const parts = [];
  if (h > 0) parts.push(`${h}時間`);
  if (m > 0 || h > 0) parts.push(`${m}分`);
  parts.push(`${s}秒`);
  return parts.join('');
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ---- Pace preview ----

function updatePacePreview() {
  const dist = parseFloat(distanceInput.value);
  const h = parseInt(hoursInput.value) || 0;
  const m = parseInt(minutesInput.value) || 0;
  const s = parseInt(secondsInput.value) || 0;
  const totalSec = h * 3600 + m * 60 + s;

  const pace = calcPace(dist, totalSec);
  if (pace) {
    paceValue.textContent = formatPace(pace.paceMin, pace.paceSec);
    pacePreview.classList.remove('hidden');
  } else {
    pacePreview.classList.add('hidden');
  }
}

[distanceInput, hoursInput, minutesInput, secondsInput].forEach(el => {
  el.addEventListener('input', updatePacePreview);
});

// ---- Add record ----

addBtn.addEventListener('click', () => {
  const dist = parseFloat(distanceInput.value);
  const h = parseInt(hoursInput.value) || 0;
  const m = parseInt(minutesInput.value) || 0;
  const s = parseInt(secondsInput.value) || 0;
  const totalSec = h * 3600 + m * 60 + s;
  const memo = memoInput.value.trim();

  if (!dist || dist <= 0) {
    alert('距離を入力してください。');
    distanceInput.focus();
    return;
  }
  if (totalSec <= 0) {
    alert('タイムを入力してください。');
    minutesInput.focus();
    return;
  }

  const pace = calcPace(dist, totalSec);
  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    distance: dist,
    hours: h,
    minutes: m,
    seconds: s,
    totalSeconds: totalSec,
    paceMin: pace.paceMin,
    paceSec: pace.paceSec,
    paceSeconds: pace.paceSeconds,
    memo,
  };

  records.unshift(record);
  saveRecords();
  renderRecords();

  // Clear inputs
  distanceInput.value = '';
  hoursInput.value = '';
  minutesInput.value = '';
  secondsInput.value = '';
  memoInput.value = '';
  pacePreview.classList.add('hidden');
});

// ---- Delete record ----

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderRecords();
}

// ---- Render ----

function renderRecords() {
  recordList.innerHTML = '';

  if (records.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-message';
    li.innerHTML = '記録がありません。<br>距離とタイムを入力して記録してみましょう。';
    recordList.appendChild(li);
    recordCount.textContent = '0件';
    statsEl.classList.add('hidden');
    return;
  }

  recordCount.textContent = `${records.length}件`;

  // Stats
  const totalDist = records.reduce((sum, r) => sum + r.distance, 0);
  const avgPaceSec = records.reduce((sum, r) => sum + r.paceSeconds, 0) / records.length;
  const avgMin = Math.floor(avgPaceSec / 60);
  const avgSec = Math.round(avgPaceSec % 60);
  totalDistanceEl.textContent = `${totalDist.toFixed(2)} km`;
  avgPaceEl.textContent = formatPace(avgMin, avgSec);
  statsEl.classList.remove('hidden');

  records.forEach(record => {
    const li = document.createElement('li');
    li.className = 'record-item';

    const paceStr = formatPace(record.paceMin, record.paceSec);
    const timeStr = formatTime(record.hours, record.minutes, record.seconds);
    const dateStr = formatDate(record.date);
    const memoHtml = record.memo ? `<div class="record-memo">📝 ${escapeHtml(record.memo)}</div>` : '';

    li.innerHTML = `
      <div class="record-info">
        <div class="record-main">
          <span class="record-distance">${record.distance} km</span>
          <span class="record-time">${timeStr}</span>
          <span class="record-pace">${paceStr}</span>
        </div>
        <div class="record-meta">${dateStr}</div>
        ${memoHtml}
      </div>
      <button class="delete-btn" aria-label="削除">✕</button>
    `;

    li.querySelector('.delete-btn').addEventListener('click', () => deleteRecord(record.id));
    recordList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---- Init ----
renderRecords();
