'use strict';

const STORAGE_KEY_TASKS = 'otetsudai_tasks';
const STORAGE_KEY_REWARD = 'otetsudai_reward';

let tasks = [];
let reward = { name: '', target: 100 };

// --- 初期化 ---
function init() {
  const savedTasks = localStorage.getItem(STORAGE_KEY_TASKS);
  if (savedTasks) tasks = JSON.parse(savedTasks);

  const savedReward = localStorage.getItem(STORAGE_KEY_REWARD);
  if (savedReward) reward = JSON.parse(savedReward);

  renderReward();
  renderTaskList();
}

// --- イベントバインド ---
function bindEvents() {
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('taskNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  document.getElementById('editRewardBtn').addEventListener('click', toggleRewardForm);
  document.getElementById('saveRewardBtn').addEventListener('click', saveReward);

  document.getElementById('resetBtn').addEventListener('click', resetAll);
}

// --- お手伝い追加 ---
function addTask() {
  const nameInput = document.getElementById('taskNameInput');
  const pointInput = document.getElementById('taskPointInput');

  const name = nameInput.value.trim();
  const point = parseInt(pointInput.value, 10);

  if (!name) {
    nameInput.focus();
    return;
  }
  if (!point || point < 1) {
    pointInput.focus();
    return;
  }

  const task = {
    id: Date.now(),
    name,
    point,
    date: formatDate(new Date()),
  };

  tasks.unshift(task);
  saveTasks();
  renderTaskList();
  renderReward();

  nameInput.value = '';
  nameInput.focus();
}

// --- タスク削除 ---
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTaskList();
  renderReward();
}

// --- タスク一覧描画 ---
function renderTaskList() {
  const list = document.getElementById('taskList');
  if (tasks.length === 0) {
    list.innerHTML = '<li class="empty-msg">まだ記録がありません</li>';
    return;
  }

  list.innerHTML = tasks
    .map(
      (t) => `
    <li class="task-item">
      <div class="task-info">
        <div class="task-name">${escapeHtml(t.name)}</div>
        <div class="task-date">${t.date}</div>
      </div>
      <div class="task-point">+${t.point} pt</div>
      <button class="btn-delete" data-id="${t.id}" title="削除">✕</button>
    </li>`
    )
    .join('');

  list.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteTask(Number(btn.dataset.id)));
  });
}

// --- ご褒美表示更新 ---
function renderReward() {
  const total = tasks.reduce((sum, t) => sum + t.point, 0);
  const target = reward.target || 100;
  const pct = Math.min(Math.round((total / target) * 100), 100);

  document.getElementById('currentPoints').textContent = total;
  document.getElementById('targetPoints').textContent = target;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = pct + '%';
  document.getElementById('rewardName').textContent =
    reward.name || 'ご褒美を設定してください';

  const banner = document.getElementById('achievedBanner');
  if (total >= target && reward.name) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// --- ご褒美フォーム切り替え ---
function toggleRewardForm() {
  const form = document.getElementById('rewardForm');
  const isHidden = form.classList.contains('hidden');
  if (isHidden) {
    document.getElementById('rewardNameInput').value = reward.name;
    document.getElementById('rewardPointInput').value = reward.target;
    form.classList.remove('hidden');
    document.getElementById('editRewardBtn').textContent = 'キャンセル';
  } else {
    form.classList.add('hidden');
    document.getElementById('editRewardBtn').textContent = '編集';
  }
}

// --- ご褒美保存 ---
function saveReward() {
  const nameVal = document.getElementById('rewardNameInput').value.trim();
  const pointVal = parseInt(document.getElementById('rewardPointInput').value, 10);

  reward.name = nameVal;
  reward.target = pointVal > 0 ? pointVal : 100;

  localStorage.setItem(STORAGE_KEY_REWARD, JSON.stringify(reward));
  toggleRewardForm();
  renderReward();
}

// --- 全リセット ---
function resetAll() {
  if (!confirm('お手伝い履歴をすべて削除してポイントをリセットしますか？')) return;
  tasks = [];
  saveTasks();
  renderTaskList();
  renderReward();
}

// --- localStorage保存 ---
function saveTasks() {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
}

// --- ユーティリティ ---
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// init() is called from index.html DOMContentLoaded
