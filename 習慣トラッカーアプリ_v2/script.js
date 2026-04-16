// ストレージキー
const STORAGE_KEY = 'habit_tracker_v2';

// 今日の日付文字列 (YYYY-MM-DD)
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ストレージから習慣データを取得
function loadHabits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// ストレージに保存
function saveHabits(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

// ストリークを計算する
// checkDates: チェック済み日付の配列 (YYYY-MM-DD)
function calcStreak(checkDates) {
  if (!checkDates || checkDates.length === 0) return 0;

  const sorted = [...new Set(checkDates)].sort();
  const today = todayStr();

  // 最新が今日または昨日でなければストリーク切れ
  const last = sorted[sorted.length - 1];
  if (last !== today && last !== prevDay(today)) return 0;

  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i] === nextDay(sorted[i - 1])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function prevDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nextDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// UI 描画
function render() {
  const habits = loadHabits();
  const list = document.getElementById('habitList');
  const emptyMsg = document.getElementById('emptyMsg');
  const today = todayStr();

  list.innerHTML = '';

  if (habits.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  habits.forEach((habit, idx) => {
    const isChecked = habit.checkDates && habit.checkDates.includes(today);
    const streak = calcStreak(habit.checkDates || []);

    const li = document.createElement('li');
    li.className = 'habit-item' + (isChecked ? ' checked' : '');

    li.innerHTML = `
      <button class="check-btn" data-idx="${idx}" title="達成切り替え">✓</button>
      <div class="habit-info">
        <div class="habit-name">${escapeHtml(habit.name)}</div>
        <div class="habit-streak">${streakLabel(streak, isChecked)}</div>
      </div>
      <button class="delete-btn" data-idx="${idx}" title="削除">✕</button>
    `;

    list.appendChild(li);
  });

  // イベント設定
  list.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleCheck(Number(btn.dataset.idx)));
  });
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteHabit(Number(btn.dataset.idx)));
  });
}

function streakLabel(streak, isChecked) {
  if (streak === 0) return isChecked ? '今日達成！' : '今日まだ未達成';
  return `🔥 ${streak}日連続${isChecked ? '（今日も達成！）' : '（今日はまだ）'}`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 習慣を追加
function addHabit() {
  const input = document.getElementById('habitInput');
  const name = input.value.trim();
  if (!name) return;

  const habits = loadHabits();
  habits.push({ name, checkDates: [] });
  saveHabits(habits);
  input.value = '';
  render();
}

// チェックを切り替え
function toggleCheck(idx) {
  const habits = loadHabits();
  const today = todayStr();
  if (!habits[idx]) return;

  habits[idx].checkDates = habits[idx].checkDates || [];
  const dateIdx = habits[idx].checkDates.indexOf(today);
  if (dateIdx === -1) {
    habits[idx].checkDates.push(today);
  } else {
    habits[idx].checkDates.splice(dateIdx, 1);
  }
  saveHabits(habits);
  render();
}

// 習慣を削除
function deleteHabit(idx) {
  const habits = loadHabits();
  habits.splice(idx, 1);
  saveHabits(habits);
  render();
}

// 今日のラベルを表示
function setTodayLabel() {
  const d = new Date();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  document.getElementById('todayLabel').textContent =
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`;
}

// 初期化
document.getElementById('addBtn').addEventListener('click', addHabit);
document.getElementById('habitInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addHabit();
});

setTodayLabel();
render();
