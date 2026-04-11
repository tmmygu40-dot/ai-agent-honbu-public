const MODES = {
  work:  { label: '作業（25分）', seconds: 25 * 60, cls: 'work'  },
  short: { label: '休憩（5分）',  seconds:  5 * 60, cls: 'short' },
  long:  { label: '長休憩（15分）', seconds: 15 * 60, cls: 'long' },
};

let currentMode = 'work';
let totalSeconds = MODES.work.seconds;
let remaining   = totalSeconds;
let timerId     = null;
let running     = false;

const display      = document.getElementById('timer-display');
const progressBar  = document.getElementById('progress-bar');
const btnStart     = document.getElementById('btn-start');
const sessionCount = document.getElementById('session-count');

// セッション数をlocalStorageから読み込む
let sessions = parseInt(localStorage.getItem('pomodoroSessions') || '0', 10);
sessionCount.textContent = sessions;

function setMode(mode) {
  if (running) return; // 実行中はモード切替不可
  currentMode = mode;
  totalSeconds = MODES[mode].seconds;
  remaining = totalSeconds;
  document.body.className = MODES[mode].cls;

  // ボタンのactive切替
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + mode).classList.add('active');

  updateDisplay();
  updateProgress();
  updateTitle();
}

function startPause() {
  if (running) {
    clearInterval(timerId);
    timerId = null;
    running = false;
    btnStart.textContent = 'スタート';
  } else {
    if (remaining === 0) return;
    running = true;
    btnStart.textContent = '一時停止';
    timerId = setInterval(tick, 1000);
  }
}

function tick() {
  remaining--;
  updateDisplay();
  updateProgress();
  updateTitle();
  if (remaining <= 0) {
    clearInterval(timerId);
    timerId = null;
    running = false;
    btnStart.textContent = 'スタート';
    onTimerEnd();
  }
}

function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  running = false;
  btnStart.textContent = 'スタート';
  remaining = totalSeconds;
  updateDisplay();
  updateProgress();
  updateTitle();
}

function onTimerEnd() {
  playBeep();
  if (currentMode === 'work') {
    sessions++;
    localStorage.setItem('pomodoroSessions', sessions);
    sessionCount.textContent = sessions;
  }
  // タイトルでも通知
  document.title = '✅ 完了！ - ポモドーロタイマー';
  setTimeout(() => updateTitle(), 3000);
}

function resetSessions() {
  sessions = 0;
  localStorage.setItem('pomodoroSessions', 0);
  sessionCount.textContent = 0;
}

function updateDisplay() {
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  display.textContent = m + ':' + s;
}

function updateProgress() {
  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
  progressBar.style.width = pct + '%';
}

function updateTitle() {
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  document.title = m + ':' + s + ' - ポモドーロタイマー';
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beepTimes = [0, 0.4, 0.8];
    beepTimes.forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch (e) {
    // AudioContext非対応環境ではスキップ
  }
}

// 初期化
document.body.className = 'work';
updateDisplay();
updateProgress();
updateTitle();
