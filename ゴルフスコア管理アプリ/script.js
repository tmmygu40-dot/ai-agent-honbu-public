const STORAGE_KEY = 'golf_rounds';

// --- データ管理 ---
function loadRounds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRounds(rounds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
}

// --- 統計計算 ---
function calcStats(rounds) {
  if (rounds.length === 0) return { best: null, avg: null };
  const scores = rounds.map(r => r.score);
  const best = Math.min(...scores);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
  return { best, avg };
}

// --- UI更新 ---
function updateSummary(rounds) {
  const { best, avg } = calcStats(rounds);
  document.getElementById('best-score').textContent = best !== null ? best : '--';
  document.getElementById('avg-score').textContent = avg !== null ? avg : '--';
  document.getElementById('round-count').textContent = rounds.length;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

function renderHistory(rounds) {
  const list = document.getElementById('history-list');
  const countEl = document.getElementById('history-count');

  if (rounds.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだラウンドが登録されていません</p>';
    countEl.textContent = '';
    return;
  }

  const { best } = calcStats(rounds);
  countEl.textContent = `全${rounds.length}件`;

  // 新しい順に表示
  const sorted = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));

  list.innerHTML = sorted.map((r, idx) => {
    const isBest = r.score === best;
    const originalIdx = rounds.indexOf(r);
    return `
      <div class="history-item${isBest ? ' best' : ''}" data-id="${r.id}">
        ${isBest ? '<span class="best-badge">自己ベスト</span>' : ''}
        <div class="score-badge">${r.score}</div>
        <div class="item-info">
          <div class="item-course">${escapeHtml(r.course || '(コース名なし)')}</div>
          <div class="item-date">${formatDate(r.date)}</div>
          ${r.memo ? `<div class="item-memo">${escapeHtml(r.memo)}</div>` : ''}
        </div>
        <button class="delete-btn" onclick="deleteRound('${r.id}')" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAll() {
  const rounds = loadRounds();
  updateSummary(rounds);
  renderHistory(rounds);
}

// --- 登録 ---
document.getElementById('add-btn').addEventListener('click', () => {
  const dateEl = document.getElementById('date');
  const courseEl = document.getElementById('course');
  const scoreEl = document.getElementById('score');
  const memoEl = document.getElementById('memo');

  const date = dateEl.value;
  const course = courseEl.value.trim();
  const scoreRaw = scoreEl.value.trim();
  const memo = memoEl.value.trim();

  if (!date) {
    alert('日付を入力してください');
    dateEl.focus();
    return;
  }
  if (!scoreRaw) {
    alert('スコアを入力してください');
    scoreEl.focus();
    return;
  }
  const score = parseInt(scoreRaw, 10);
  if (isNaN(score) || score < 18 || score > 250) {
    alert('スコアは18〜250の整数で入力してください');
    scoreEl.focus();
    return;
  }

  const rounds = loadRounds();
  rounds.push({
    id: Date.now().toString(),
    date,
    course,
    score,
    memo
  });
  saveRounds(rounds);
  renderAll();

  // フォームリセット（日付は維持）
  courseEl.value = '';
  scoreEl.value = '';
  memoEl.value = '';
  scoreEl.focus();
});

// --- 削除 ---
function deleteRound(id) {
  if (!confirm('このラウンドを削除しますか？')) return;
  const rounds = loadRounds().filter(r => r.id !== id);
  saveRounds(rounds);
  renderAll();
}

// --- 初期表示 ---
// 日付フィールドに今日の日付をセット
(function setTodayDefault() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${y}-${m}-${d}`;
})();

renderAll();
