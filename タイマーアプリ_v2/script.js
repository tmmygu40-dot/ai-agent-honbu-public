'use strict';

const display   = document.getElementById('display');
const startBtn  = document.getElementById('startBtn');
const pauseBtn  = document.getElementById('pauseBtn');
const resetBtn  = document.getElementById('resetBtn');
const minInput  = document.getElementById('minuteInput');
const secInput  = document.getElementById('secondInput');

const LS_KEY = 'timer_v2_last';

let totalSeconds = 0;
let remaining    = 0;
let timerId      = null;
let running      = false;

// localStorage から前回の設定を復元
(function loadLast() {
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    const { m, s } = JSON.parse(saved);
    minInput.value = m;
    secInput.value = s;
  }
})();

function pad(n) {
  return String(n).padStart(2, '0');
}

function updateDisplay(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  display.textContent = pad(m) + ':' + pad(s);
}

function setInputsDisabled(disabled) {
  minInput.disabled = disabled;
  secInput.disabled = disabled;
}

function start() {
  if (!running) {
    // 初回開始：入力値を取得
    if (remaining === 0) {
      const m = parseInt(minInput.value, 10) || 0;
      const s = parseInt(secInput.value, 10) || 0;
      totalSeconds = m * 60 + s;
      remaining = totalSeconds;

      if (remaining <= 0) return;

      // localStorage に保存
      localStorage.setItem(LS_KEY, JSON.stringify({ m, s }));
    }

    running = true;
    setInputsDisabled(true);
    display.className = 'display running';
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    timerId = setInterval(() => {
      remaining--;
      updateDisplay(remaining);

      if (remaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        running = false;
        display.className = 'display finished';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        setInputsDisabled(false);
        alert('タイマー終了！');
      }
    }, 1000);

    updateDisplay(remaining);
  }
}

function pause() {
  if (running) {
    clearInterval(timerId);
    timerId = null;
    running = false;
    display.className = 'display';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

function reset() {
  clearInterval(timerId);
  timerId = null;
  running = false;
  remaining = 0;
  display.className = 'display';
  display.textContent = '00:00';
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  setInputsDisabled(false);
}

startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', pause);
resetBtn.addEventListener('click', reset);
