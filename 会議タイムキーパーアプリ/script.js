const STORAGE_KEY = 'meeting_timekeep_agendas';

let agendas = [];
let currentIndex = 0;
let timerInterval = null;
let remainingSeconds = 0;
let totalSeconds = 0;
let isRunning = false;

// DOM
const agendaTitleInput = document.getElementById('agendaTitle');
const agendaMinutesInput = document.getElementById('agendaMinutes');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const agendaList = document.getElementById('agendaList');
const emptyMsg = document.getElementById('emptyMsg');
const currentAgendaName = document.getElementById('currentAgendaName');
const timerDisplay = document.getElementById('timerDisplay');
const timerBar = document.getElementById('timerBar');
const startStopBtn = document.getElementById('startStopBtn');
const nextBtn = document.getElementById('nextBtn');
const agendaStatus = document.getElementById('agendaStatus');

// 初期化
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      agendas = JSON.parse(saved);
    } catch {
      agendas = [];
    }
  }
  renderList();
  updateTimer();
}

// 保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agendas));
}

// 議題追加
addBtn.addEventListener('click', addAgenda);
agendaTitleInput.addEventListener('keydown', e => { if (e.key === 'Enter') addAgenda(); });
agendaMinutesInput.addEventListener('keydown', e => { if (e.key === 'Enter') addAgenda(); });

function addAgenda() {
  const title = agendaTitleInput.value.trim();
  const minutes = parseInt(agendaMinutesInput.value, 10);

  if (!title) {
    agendaTitleInput.focus();
    return;
  }
  if (!minutes || minutes < 1) {
    agendaMinutesInput.focus();
    return;
  }

  agendas.push({ title, minutes });
  save();
  agendaTitleInput.value = '';
  agendaMinutesInput.value = '';
  agendaTitleInput.focus();
  renderList();
  updateTimer();
}

// 全削除
clearBtn.addEventListener('click', () => {
  if (!confirm('議題を全削除しますか？')) return;
  stopTimer();
  agendas = [];
  currentIndex = 0;
  save();
  renderList();
  updateTimer();
});

// リスト描画
function renderList() {
  agendaList.innerHTML = '';
  const show = agendas.length > 0;
  emptyMsg.style.display = show ? 'none' : 'block';

  agendas.forEach((a, i) => {
    const li = document.createElement('li');
    if (i === currentIndex) li.classList.add('current');
    if (i < currentIndex) li.classList.add('done');

    li.innerHTML = `
      <span class="agenda-index">${i + 1}</span>
      <span class="agenda-name">${escapeHtml(a.title)}</span>
      <span class="agenda-time">${a.minutes}分</span>
      <button class="btn-delete" data-i="${i}" title="削除">×</button>
    `;
    agendaList.appendChild(li);
  });

  // 削除ボタン
  agendaList.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i, 10);
      deleteAgenda(i);
    });
  });
}

function deleteAgenda(i) {
  stopTimer();
  agendas.splice(i, 1);
  if (currentIndex >= agendas.length) {
    currentIndex = Math.max(0, agendas.length - 1);
  }
  save();
  renderList();
  updateTimer();
}

// タイマー表示更新
function updateTimer() {
  if (agendas.length === 0) {
    currentAgendaName.textContent = '—';
    timerDisplay.textContent = '00:00';
    timerDisplay.className = 'timer-display';
    timerBar.style.width = '100%';
    timerBar.className = 'timer-bar';
    startStopBtn.disabled = true;
    nextBtn.disabled = true;
    agendaStatus.textContent = '';
    return;
  }

  startStopBtn.disabled = false;

  if (currentIndex >= agendas.length) {
    // 全議題終了
    currentAgendaName.textContent = '全議題が終了しました';
    timerDisplay.textContent = '00:00';
    timerDisplay.className = 'timer-display';
    timerBar.style.width = '0%';
    timerBar.className = 'timer-bar';
    startStopBtn.disabled = true;
    nextBtn.disabled = true;
    agendaStatus.textContent = `全 ${agendas.length} 件完了`;
    return;
  }

  const agenda = agendas[currentIndex];
  if (!isRunning) {
    totalSeconds = agenda.minutes * 60;
    remainingSeconds = totalSeconds;
  }

  currentAgendaName.textContent = `${currentIndex + 1}. ${agenda.title}`;
  renderTimerDisplay();
  agendaStatus.textContent = `${currentIndex + 1} / ${agendas.length} 件目`;
  nextBtn.disabled = (currentIndex >= agendas.length - 1 && !isRunning);
  nextBtn.disabled = false;
}

function renderTimerDisplay() {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;
  timerBar.style.width = (ratio * 100) + '%';

  // 色変化
  let state = '';
  if (ratio <= 0) {
    state = 'danger';
  } else if (ratio <= 0.2) {
    state = 'danger';
  } else if (ratio <= 0.4) {
    state = 'warning';
  }

  timerDisplay.className = 'timer-display' + (state ? ' ' + state : '');
  timerBar.className = 'timer-bar' + (state ? ' ' + state : '');
}

// スタート/ストップ
startStopBtn.addEventListener('click', () => {
  if (isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
});

function startTimer() {
  if (currentIndex >= agendas.length) return;
  if (!isRunning) {
    if (remainingSeconds <= 0) {
      totalSeconds = agendas[currentIndex].minutes * 60;
      remainingSeconds = totalSeconds;
    }
  }
  isRunning = true;
  startStopBtn.textContent = '一時停止';
  startStopBtn.classList.add('running');

  timerInterval = setInterval(() => {
    remainingSeconds--;
    renderTimerDisplay();

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      renderTimerDisplay();
      stopTimer();
      onTimeUp();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isRunning = false;
  startStopBtn.textContent = 'スタート';
  startStopBtn.classList.remove('running');
}

function onTimeUp() {
  // 時間切れ通知
  agendaStatus.textContent = `⏰ 時間切れ！次の議題へ進んでください`;
  // 短いビープ（AudioContext）
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (_) { /* AudioContext非対応環境は無視 */ }
}

// 次の議題
nextBtn.addEventListener('click', () => {
  stopTimer();
  currentIndex++;
  remainingSeconds = 0;
  totalSeconds = 0;
  renderList();
  updateTimer();
});

// エスケープ
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
