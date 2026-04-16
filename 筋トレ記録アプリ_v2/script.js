'use strict';

const STORAGE_KEY = 'workout_records_v2';

// --- データ管理 ---
function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// --- 自己ベスト計算 ---
function calcBests(records) {
  const bests = {};
  records.forEach(r => {
    if (!bests[r.exercise] || r.weight > bests[r.exercise].weight) {
      bests[r.exercise] = { weight: r.weight, date: r.date };
    }
  });
  return bests;
}

// --- 描画：自己ベスト ---
function renderBests(records) {
  const el = document.getElementById('bestList');
  const bests = calcBests(records);
  const exercises = Object.keys(bests);

  if (exercises.length === 0) {
    el.innerHTML = '<p class="empty-msg">記録がまだありません</p>';
    return;
  }

  el.innerHTML = exercises
    .sort()
    .map(ex => {
      const b = bests[ex];
      return `
        <div class="best-card">
          <div class="exercise-name">${escHtml(ex)}</div>
          <div class="best-weight">${b.weight}<span> kg</span></div>
          <div class="best-date">${b.date}</div>
        </div>
      `;
    })
    .join('');
}

// --- 描画：履歴 ---
function renderHistory(records, filterExercise) {
  const el = document.getElementById('historyList');
  const bests = calcBests(records);

  let filtered = filterExercise
    ? records.filter(r => r.exercise === filterExercise)
    : records;

  // 新しい順
  filtered = [...filtered].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.id - a.id;
  });

  if (filtered.length === 0) {
    el.innerHTML = '<p class="empty-msg">記録がまだありません</p>';
    return;
  }

  el.innerHTML = filtered
    .map(r => {
      const isBest = bests[r.exercise] && bests[r.exercise].weight === r.weight
        && bests[r.exercise].date === r.date;
      const bestBadge = isBest ? '<span class="badge-best">自己ベスト</span>' : '';
      const memo = r.memo ? `<div class="record-memo">📝 ${escHtml(r.memo)}</div>` : '';
      return `
        <div class="record-item" data-id="${r.id}">
          <div class="record-info">
            <div class="record-exercise">${escHtml(r.exercise)}${bestBadge}</div>
            <div class="record-detail">
              <span class="record-weight-big">${r.weight} kg</span>
              × ${r.reps}回 × ${r.sets}セット
            </div>
            ${memo}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
            <div class="record-date">${r.date}</div>
            <button class="btn-delete" data-id="${r.id}" title="削除">✕</button>
          </div>
        </div>
      `;
    })
    .join('');

  // 削除ボタン
  el.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteRecord(Number(btn.dataset.id));
    });
  });
}

// --- 描画：フィルター選択肢 ---
function renderFilter(records) {
  const sel = document.getElementById('filterExercise');
  const current = sel.value;
  const exercises = [...new Set(records.map(r => r.exercise))].sort();

  sel.innerHTML = '<option value="">すべて</option>' +
    exercises.map(ex => `<option value="${escHtml(ex)}"${ex === current ? ' selected' : ''}>${escHtml(ex)}</option>`).join('');
}

// --- 全体再描画 ---
function renderAll() {
  const records = loadRecords();
  renderBests(records);
  renderFilter(records);
  const filterVal = document.getElementById('filterExercise').value;
  renderHistory(records, filterVal);
}

// --- 追加 ---
document.getElementById('recordForm').addEventListener('submit', e => {
  e.preventDefault();

  const exercise = document.getElementById('exercise').value.trim();
  const date = document.getElementById('date').value;
  const weight = parseFloat(document.getElementById('weight').value);
  const sets = parseInt(document.getElementById('sets').value, 10);
  const reps = parseInt(document.getElementById('reps').value, 10);
  const memo = document.getElementById('memo').value.trim();

  if (!exercise || !date || isNaN(weight) || isNaN(sets) || isNaN(reps)) return;

  const records = loadRecords();
  const newRecord = {
    id: Date.now(),
    exercise,
    date,
    weight,
    sets,
    reps,
    memo,
  };
  records.push(newRecord);
  saveRecords(records);

  e.target.reset();
  document.getElementById('date').value = todayStr();
  renderAll();
});

// --- 削除 ---
function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderAll();
}

// --- フィルター変更 ---
document.getElementById('filterExercise').addEventListener('change', () => {
  const records = loadRecords();
  const filterVal = document.getElementById('filterExercise').value;
  renderHistory(records, filterVal);
});

// --- ユーティリティ ---
function todayStr() {
  return new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 初期化 ---
document.getElementById('date').value = todayStr();
renderAll();
