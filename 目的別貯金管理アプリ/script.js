// データ管理
let goals = [];

function loadData() {
  const saved = localStorage.getItem('savings_goals');
  if (saved) {
    goals = JSON.parse(saved);
  }
}

function saveData() {
  localStorage.setItem('savings_goals', JSON.stringify(goals));
}

// 目標を追加
function addGoal() {
  const nameEl = document.getElementById('goalName');
  const amountEl = document.getElementById('goalAmount');
  const name = nameEl.value.trim();
  const target = parseInt(amountEl.value, 10);

  if (!name) {
    alert('目標名を入力してください');
    return;
  }
  if (!target || target <= 0) {
    alert('目標金額を正しく入力してください');
    return;
  }

  const goal = {
    id: Date.now(),
    name,
    target,
    saved: 0,
    history: []
  };

  goals.push(goal);
  saveData();
  renderGoals();
  nameEl.value = '';
  amountEl.value = '';
  nameEl.focus();
}

// 積立を追加
function addDeposit(id) {
  const inputEl = document.getElementById('deposit-' + id);
  const amount = parseInt(inputEl.value, 10);

  if (!amount || amount <= 0) {
    alert('積立金額を入力してください');
    return;
  }

  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  goal.saved += amount;
  goal.history.push({
    amount,
    date: new Date().toLocaleDateString('ja-JP')
  });

  saveData();
  renderGoals();
}

// 目標を削除
function deleteGoal(id) {
  if (!confirm('この目標を削除しますか？')) return;
  goals = goals.filter(g => g.id !== id);
  saveData();
  renderGoals();
}

// 履歴の表示切替
function toggleHistory(id) {
  const el = document.getElementById('history-' + id);
  el.classList.toggle('open');
}

// 金額のフォーマット
function formatYen(n) {
  return '¥' + n.toLocaleString('ja-JP');
}

// 目標一覧を描画
function renderGoals() {
  const container = document.getElementById('goalsContainer');

  if (goals.length === 0) {
    container.innerHTML = '<p class="no-goals">目標がまだありません。上のフォームから追加してください。</p>';
    return;
  }

  container.innerHTML = goals.map(goal => {
    const rate = Math.min(100, Math.floor((goal.saved / goal.target) * 100));
    const remaining = Math.max(0, goal.target - goal.saved);
    const isComplete = goal.saved >= goal.target;

    const historyHtml = goal.history.length > 0
      ? goal.history.slice().reverse().map(h =>
          `<div class="history-item">
            <span>${h.date}</span>
            <span>+${formatYen(h.amount)}</span>
          </div>`
        ).join('')
      : '<div style="color:#aaa;padding:4px 0;">履歴なし</div>';

    return `
      <div class="goal-card">
        <div class="goal-header">
          <span class="goal-name">${escapeHtml(goal.name)}</span>
          <button class="delete-btn" onclick="deleteGoal(${goal.id})" title="削除">✕</button>
        </div>
        <div class="goal-amounts">
          <span class="amount-saved">貯金済み：${formatYen(goal.saved)}</span>
          <span class="amount-target">目標：${formatYen(goal.target)}</span>
          <span class="amount-remaining ${isComplete ? 'done' : ''}">
            ${isComplete ? '達成！' : '残り：' + formatYen(remaining)}
          </span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar ${isComplete ? 'complete' : ''}" style="width:${rate}%"></div>
        </div>
        <div class="progress-label">${rate}%</div>
        <div class="deposit-row">
          <input type="number" id="deposit-${goal.id}" placeholder="積立金額（円）" min="1">
          <button onclick="addDeposit(${goal.id})">積立</button>
        </div>
        <button class="history-toggle" onclick="toggleHistory(${goal.id})">履歴を見る（${goal.history.length}件）</button>
        <div class="history-list" id="history-${goal.id}">
          ${historyHtml}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Enter キーで目標追加
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderGoals();

  document.getElementById('goalName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('goalAmount').focus();
  });
  document.getElementById('goalAmount').addEventListener('keydown', e => {
    if (e.key === 'Enter') addGoal();
  });
});
