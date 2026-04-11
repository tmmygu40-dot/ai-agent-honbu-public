const STORAGE_KEY = 'habit-tracker-data';

// 今日の日付文字列 "YYYY-MM-DD"
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 昨日の日付文字列
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// データ読み込み
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// データ保存
function saveData(habits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

// 今日のリセット処理（日付が変わったらチェックをリセット）
function resetIfNewDay(habits) {
  const today = todayStr();
  return habits.map(h => {
    if (h.lastCheckedDate !== today) {
      // 昨日チェックされていたならストリーク継続、そうでなければリセット
      if (h.lastCheckedDate === yesterdayStr() && h.doneToday) {
        return { ...h, doneToday: false };
      } else if (h.lastCheckedDate !== yesterdayStr() && h.doneToday) {
        // 昨日以前にチェックされていた → ストリーク途切れ
        return { ...h, doneToday: false, streak: 0 };
      }
      return { ...h, doneToday: false };
    }
    return h;
  });
}

let habits = resetIfNewDay(loadData());
saveData(habits);

// 今日の日付表示
document.getElementById('todayLabel').textContent = (() => {
  const d = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
})();

// UI描画
function render() {
  const list = document.getElementById('habitList');
  const emptyMsg = document.getElementById('emptyMsg');

  list.innerHTML = '';

  if (habits.length === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
  }

  habits.forEach((habit, index) => {
    const li = document.createElement('li');
    li.className = 'habit-item' + (habit.doneToday ? ' done' : '');

    const streakText = habit.streak > 0
      ? `🔥 ${habit.streak}日連続達成`
      : '未達成';

    li.innerHTML = `
      <button class="check-btn" data-index="${index}" aria-label="チェック">
        ${habit.doneToday ? '✓' : ''}
      </button>
      <div class="habit-info">
        <div class="habit-name">${escapeHtml(habit.name)}</div>
        <div class="streak">${streakText}</div>
      </div>
      <button class="delete-btn" data-index="${index}" aria-label="削除">×</button>
    `;

    list.appendChild(li);
  });

  updateProgress();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateProgress() {
  const total = habits.length;
  const done = habits.filter(h => h.doneToday).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById('progressText').textContent = `${done} / ${total} 達成（${pct}%）`;
  document.getElementById('progressBar').style.width = `${pct}%`;
}

// 習慣追加
document.getElementById('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('habitInput');
  const name = input.value.trim();
  if (!name) return;

  habits.push({
    id: Date.now(),
    name,
    doneToday: false,
    streak: 0,
    lastCheckedDate: null
  });

  saveData(habits);
  render();
  input.value = '';
  input.focus();
});

// チェック・削除のイベント委譲
document.getElementById('habitList').addEventListener('click', e => {
  const checkBtn = e.target.closest('.check-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (checkBtn) {
    const index = parseInt(checkBtn.dataset.index);
    const habit = habits[index];
    const today = todayStr();

    if (!habit.doneToday) {
      // チェックON
      const wasYesterday = habit.lastCheckedDate === yesterdayStr();
      habit.streak = wasYesterday ? habit.streak + 1 : 1;
      habit.doneToday = true;
      habit.lastCheckedDate = today;
    } else {
      // チェックOFF（取り消し）
      habit.doneToday = false;
      habit.streak = Math.max(0, habit.streak - 1);
    }

    saveData(habits);
    render();
  }

  if (deleteBtn) {
    const index = parseInt(deleteBtn.dataset.index);
    habits.splice(index, 1);
    saveData(habits);
    render();
  }
});

render();
