const STORAGE_KEY = 'workout_records';

let records = [];

function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    records = data ? JSON.parse(data) : [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function getDateKey(isoStr) {
  return new Date(isoStr).toLocaleDateString('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit' });
}

function getPreviousRecord(exercise, excludeId) {
  const same = records
    .filter(r => r.exercise === exercise && r.id !== excludeId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return same[0] || null;
}

function diffBadge(curr, prev, unit) {
  const diff = curr - prev;
  if (diff === 0) return `<span class="diff-badge diff-same">→ 同じ</span>`;
  const sign = diff > 0 ? '+' : '';
  const cls = diff > 0 ? 'diff-up' : 'diff-down';
  return `<span class="diff-badge ${cls}">${sign}${diff}${unit}</span>`;
}

function showCompare(record) {
  const prev = getPreviousRecord(record.exercise, record.id);
  const section = document.getElementById('compare-section');
  const content = document.getElementById('compare-content');

  if (!prev) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  content.innerHTML = `
    <div class="compare-card">
      <div class="exercise-name">${escHtml(record.exercise)}</div>
      <div class="compare-row">
        <div class="compare-box">
          <div class="label">セット数</div>
          <div class="value">${record.sets}</div>
          ${diffBadge(record.sets, prev.sets, 'set')}
        </div>
        <div class="compare-box">
          <div class="label">重量 (kg)</div>
          <div class="value">${record.weight}</div>
          ${diffBadge(record.weight, prev.weight, 'kg')}
        </div>
        <div class="compare-box">
          <div class="label">回数</div>
          <div class="value">${record.reps}</div>
          ${diffBadge(record.reps, prev.reps, 'rep')}
        </div>
      </div>
      <p style="font-size:0.78rem;color:#6b7280;margin-top:8px;">前回：${formatDate(prev.timestamp)} ${formatTime(prev.timestamp)}</p>
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateExerciseList() {
  const exercises = [...new Set(records.map(r => r.exercise))];
  const datalist = document.getElementById('exercise-list');
  datalist.innerHTML = exercises.map(e => `<option value="${escHtml(e)}">`).join('');
}

function renderRecords() {
  const list = document.getElementById('records-list');
  const filterExercise = document.getElementById('filter-exercise').value.trim().toLowerCase();
  const filterDate = document.getElementById('filter-date').value;

  let filtered = [...records].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (filterExercise) {
    filtered = filtered.filter(r => r.exercise.toLowerCase().includes(filterExercise));
  }
  if (filterDate) {
    filtered = filtered.filter(r => r.timestamp.startsWith(filterDate));
  }

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  // group by date
  const groups = {};
  filtered.forEach(r => {
    const key = formatDate(r.timestamp);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  list.innerHTML = Object.entries(groups).map(([date, recs]) => `
    <div class="date-group">
      <div class="date-label">${date}</div>
      ${recs.map(r => `
        <div class="record-card">
          <div class="record-info">
            <div class="record-exercise">${escHtml(r.exercise)}</div>
            <div class="record-stats">
              <span>${r.sets} セット</span>
              <span>${r.weight} kg</span>
              <span>${r.reps} 回</span>
            </div>
            ${r.note ? `<div class="record-note">${escHtml(r.note)}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div class="record-time">${formatTime(r.timestamp)}</div>
            <button class="btn-delete" data-id="${r.id}" title="削除">×</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id));
  });
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  updateExerciseList();
  renderRecords();
}

function addRecord() {
  const exercise = document.getElementById('exercise').value.trim();
  const sets = parseInt(document.getElementById('sets').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const reps = parseInt(document.getElementById('reps').value);
  const note = document.getElementById('note').value.trim();

  if (!exercise) { alert('種目名を入力してください'); return; }
  if (!sets || sets < 1) { alert('セット数を入力してください'); return; }
  if (isNaN(weight) || weight < 0) { alert('重量を入力してください'); return; }
  if (!reps || reps < 1) { alert('回数を入力してください'); return; }

  const record = {
    id: generateId(),
    exercise,
    sets,
    weight,
    reps,
    note,
    timestamp: new Date().toISOString()
  };

  records.unshift(record);
  saveRecords();

  showCompare(record);
  updateExerciseList();
  renderRecords();

  // reset form
  document.getElementById('sets').value = '';
  document.getElementById('weight').value = '';
  document.getElementById('reps').value = '';
  document.getElementById('note').value = '';
  document.getElementById('exercise').focus();
}

// init
document.addEventListener('DOMContentLoaded', () => {
  loadRecords();
  updateExerciseList();
  renderRecords();

  document.getElementById('add-btn').addEventListener('click', addRecord);

  document.getElementById('exercise').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('sets').focus();
  });

  document.getElementById('filter-exercise').addEventListener('input', renderRecords);
  document.getElementById('filter-date').addEventListener('change', renderRecords);

  document.getElementById('clear-filter-btn').addEventListener('click', () => {
    document.getElementById('filter-exercise').value = '';
    document.getElementById('filter-date').value = '';
    renderRecords();
  });
});
