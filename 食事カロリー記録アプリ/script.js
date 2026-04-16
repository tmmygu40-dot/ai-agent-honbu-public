// 今日の日付キー (YYYY-MM-DD)
function getTodayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// 表示用日付
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

const TODAY = getTodayKey();

// データ取得
function getData() {
  const raw = localStorage.getItem('calorie_data_' + TODAY);
  return raw ? JSON.parse(raw) : [];
}

function saveData(records) {
  localStorage.setItem('calorie_data_' + TODAY, JSON.stringify(records));
}

function getGoal() {
  return parseInt(localStorage.getItem('calorie_goal') || '2000', 10);
}

function saveGoal(val) {
  localStorage.setItem('calorie_goal', String(val));
}

// 描画
function render() {
  const records = getData();
  const goal = getGoal();
  const total = records.reduce((sum, r) => sum + r.cal, 0);
  const remaining = goal - total;

  // 今日の日付
  document.getElementById('today-date').textContent = formatDate(TODAY);

  // 目標入力欄に現在値
  document.getElementById('goal-input').value = goal;

  // 合計・目標
  document.getElementById('total-cal').textContent = total;
  document.getElementById('goal-cal').textContent = goal;

  // プログレスバー
  const pct = goal > 0 ? Math.min((total / goal) * 100, 100) : 0;
  const bar = document.getElementById('progress-bar');
  bar.style.width = pct + '%';
  bar.classList.toggle('over', total > goal);

  // 残りテキスト
  const remEl = document.getElementById('remaining-text');
  if (total === 0) {
    remEl.textContent = `目標まで残り ${goal} kcal`;
    remEl.style.color = '#555';
  } else if (remaining > 0) {
    remEl.textContent = `残り ${remaining} kcal`;
    remEl.style.color = '#555';
  } else if (remaining === 0) {
    remEl.textContent = '目標ちょうど達成！';
    remEl.style.color = '#2e7d32';
  } else {
    remEl.textContent = `目標を ${Math.abs(remaining)} kcal オーバー`;
    remEl.style.color = '#e53935';
  }

  // リスト
  const list = document.getElementById('meal-list');
  const emptyMsg = document.getElementById('empty-msg');
  list.innerHTML = '';

  if (records.length === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
    records.forEach((r, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="meal-name">${escapeHtml(r.name)}</span>
        <span class="meal-cal-badge">${r.cal} kcal</span>
        <button class="delete-btn" data-index="${i}" title="削除">✕</button>
      `;
      list.appendChild(li);
    });
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 食事追加
document.getElementById('add-btn').addEventListener('click', () => {
  const nameEl = document.getElementById('meal-name');
  const calEl = document.getElementById('meal-cal');
  const name = nameEl.value.trim();
  const cal = parseInt(calEl.value, 10);

  if (!name) {
    nameEl.focus();
    return;
  }
  if (isNaN(cal) || cal < 0) {
    calEl.focus();
    return;
  }

  const records = getData();
  records.push({ name, cal });
  saveData(records);
  nameEl.value = '';
  calEl.value = '';
  nameEl.focus();
  render();
});

// Enterキーで追加
document.getElementById('meal-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('meal-cal').focus();
});
document.getElementById('meal-cal').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-btn').click();
});

// 削除
document.getElementById('meal-list').addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  const idx = parseInt(btn.dataset.index, 10);
  const records = getData();
  records.splice(idx, 1);
  saveData(records);
  render();
});

// 目標保存
document.getElementById('save-goal-btn').addEventListener('click', () => {
  const val = parseInt(document.getElementById('goal-input').value, 10);
  if (isNaN(val) || val < 0) return;
  saveGoal(val);
  render();
});

document.getElementById('goal-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('save-goal-btn').click();
});

// 初期描画
render();
