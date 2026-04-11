'use strict';

// ===== 定数 =====
const STORAGE_KEY = 'timer-last-setting';

// ===== 要素取得 =====
const app         = document.getElementById('app');
const timeDisplay = document.getElementById('timeDisplay');
const statusMsg   = document.getElementById('statusMsg');
const inputArea   = document.getElementById('inputArea');
const minInput    = document.getElementById('minInput');
const secInput    = document.getElementById('secInput');
const startBtn    = document.getElementById('startBtn');
const pauseBtn    = document.getElementById('pauseBtn');
const resetBtn    = document.getElementById('resetBtn');
const presets     = document.querySelectorAll('.btn-preset');

// ===== 状態 =====
let totalSeconds  = 0;   // セットした合計秒数
let remaining     = 0;   // 残り秒数
let intervalId    = null;
let isRunning     = false;
let isPaused      = false;

// ===== 初期化 =====
loadLastSetting();
updateDisplay(getInputSeconds());

// ===== イベント：スタート =====
startBtn.addEventListener('click', () => {
  if (app.classList.contains('finished')) {
    clearFinished();
  }

  const secs = isPaused ? remaining : getInputSeconds();

  if (secs <= 0) {
    statusMsg.textContent = '時間を設定してください';
    return;
  }

  if (!isPaused) {
    totalSeconds = secs;
    remaining    = secs;
    saveLastSetting();
  }

  startCountdown();
});

// ===== イベント：一時停止 / 再開 =====
pauseBtn.addEventListener('click', () => {
  if (isRunning) {
    pauseCountdown();
  } else if (isPaused) {
    // 再開
    startCountdown();
  }
});

// ===== イベント：リセット =====
resetBtn.addEventListener('click', () => {
  stopCountdown();
  clearFinished();
  remaining = totalSeconds > 0 ? totalSeconds : getInputSeconds();
  updateDisplay(remaining);
  statusMsg.textContent = '';
  setButtonState('idle');
  inputArea.classList.remove('locked');
});

// ===== イベント：プリセット =====
presets.forEach(btn => {
  btn.addEventListener('click', () => {
    const m = parseInt(btn.dataset.min, 10);
    const s = parseInt(btn.dataset.sec, 10);
    minInput.value = m;
    secInput.value = s;
    updateDisplay(m * 60 + s);
    statusMsg.textContent = '';
    if (!isRunning && !isPaused) return;
    stopCountdown();
    clearFinished();
    setButtonState('idle');
    inputArea.classList.remove('locked');
  });
});

// ===== イベント：入力値変化 =====
[minInput, secInput].forEach(input => {
  input.addEventListener('input', () => {
    if (!isRunning && !isPaused) {
      updateDisplay(getInputSeconds());
      statusMsg.textContent = '';
    }
  });
});

// ===== カウントダウン開始 =====
function startCountdown() {
  isRunning = true;
  isPaused  = false;
  inputArea.classList.add('locked');
  setButtonState('running');

  intervalId = setInterval(() => {
    remaining--;
    updateDisplay(remaining);

    if (remaining <= 0) {
      finishTimer();
    }
  }, 1000);
}

// ===== 一時停止 =====
function pauseCountdown() {
  stopCountdown();
  isPaused = true;
  setButtonState('paused');
  statusMsg.textContent = '⏸ 一時停止中';
}

// ===== インターバル停止 =====
function stopCountdown() {
  clearInterval(intervalId);
  intervalId = null;
  isRunning  = false;
}

// ===== 終了処理 =====
function finishTimer() {
  stopCountdown();
  isPaused = false;
  remaining = 0;
  updateDisplay(0);
  app.classList.add('finished');
  statusMsg.textContent = '⏰ 終了！';
  setButtonState('finished');
  inputArea.classList.remove('locked');

  // アラート（少し遅らせて表示を先に反映）
  setTimeout(() => {
    alert('⏰ タイマーが終了しました！');
  }, 100);
}

// ===== 終了状態をクリア =====
function clearFinished() {
  app.classList.remove('finished');
  statusMsg.textContent = '';
}

// ===== 入力値から合計秒数を取得 =====
function getInputSeconds() {
  const m = Math.max(0, parseInt(minInput.value, 10) || 0);
  const s = Math.max(0, Math.min(59, parseInt(secInput.value, 10) || 0));
  return m * 60 + s;
}

// ===== 表示を更新（MM:SS形式）=====
function updateDisplay(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  timeDisplay.textContent =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ===== ボタン状態を切り替え =====
function setButtonState(state) {
  // idle / running / paused / finished
  startBtn.disabled = (state === 'running');
  pauseBtn.disabled = (state === 'idle' || state === 'finished');
  resetBtn.disabled = false;

  if (state === 'paused') {
    pauseBtn.textContent = '再開';
    pauseBtn.disabled = false;
  } else {
    pauseBtn.textContent = '一時停止';
  }

  startBtn.textContent = (state === 'finished') ? 'もう一度' : 'スタート';
}

// ===== localStorage =====
function saveLastSetting() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    min: parseInt(minInput.value, 10) || 0,
    sec: parseInt(secInput.value, 10) || 0
  }));
}

function loadLastSetting() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      minInput.value = saved.min;
      secInput.value = saved.sec;
    }
  } catch {
    // 読み込み失敗時はデフォルト値のまま
  }
}
