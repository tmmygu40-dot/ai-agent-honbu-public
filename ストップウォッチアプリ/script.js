const timeDisplay = document.getElementById('time');
const startStopBtn = document.getElementById('startStopBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const lapList = document.getElementById('lapList');
const lapHeader = document.getElementById('lapHeader');

let startTime = 0;
let elapsed = 0;
let lapStart = 0;
let timerInterval = null;
let running = false;
let laps = [];

function formatTime(ms) {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function updateDisplay() {
  elapsed = Date.now() - startTime;
  timeDisplay.textContent = formatTime(elapsed);
}

function startStop() {
  if (!running) {
    startTime = Date.now() - elapsed;
    lapStart = startTime + (elapsed - (laps.length === 0 ? elapsed : laps.reduce((s, l) => s + l.lapTime, 0)));
    if (laps.length === 0) lapStart = startTime;
    timerInterval = setInterval(updateDisplay, 10);
    running = true;
    startStopBtn.textContent = 'ストップ';
    startStopBtn.classList.add('running');
    lapBtn.disabled = false;
    resetBtn.disabled = false;
  } else {
    clearInterval(timerInterval);
    elapsed = Date.now() - startTime;
    running = false;
    startStopBtn.textContent = 'スタート';
    startStopBtn.classList.remove('running');
    lapBtn.disabled = true;
  }
}

function recordLap() {
  const now = Date.now();
  const totalElapsed = now - startTime;
  const prevTotal = laps.reduce((s, l) => s + l.lapTime, 0);
  const lapTime = totalElapsed - prevTotal;

  laps.push({ lapTime, totalTime: totalElapsed });
  saveLaps();
  renderLaps();

  lapStart = now;
}

function reset() {
  clearInterval(timerInterval);
  running = false;
  elapsed = 0;
  laps = [];
  timeDisplay.textContent = '00:00.00';
  startStopBtn.textContent = 'スタート';
  startStopBtn.classList.remove('running');
  lapBtn.disabled = true;
  resetBtn.disabled = true;
  lapList.innerHTML = '';
  lapHeader.style.display = 'none';
  localStorage.removeItem('stopwatch_laps');
}

function renderLaps() {
  lapList.innerHTML = '';

  if (laps.length === 0) {
    lapHeader.style.display = 'none';
    return;
  }

  lapHeader.style.display = 'grid';

  const lapTimes = laps.map(l => l.lapTime);
  const minLap = Math.min(...lapTimes);
  const maxLap = Math.max(...lapTimes);

  laps.slice().reverse().forEach((lap, revIdx) => {
    const idx = laps.length - revIdx;
    const li = document.createElement('li');

    if (laps.length > 1) {
      if (lap.lapTime === minLap) li.classList.add('fastest');
      else if (lap.lapTime === maxLap) li.classList.add('slowest');
    }

    li.innerHTML = `
      <span class="lap-num">Lap ${idx}</span>
      <span>${formatTime(lap.lapTime)}</span>
      <span>${formatTime(lap.totalTime)}</span>
    `;
    lapList.appendChild(li);
  });
}

function saveLaps() {
  try {
    localStorage.setItem('stopwatch_laps', JSON.stringify(laps));
  } catch (e) {
    // localStorage 使用不可の場合は無視
  }
}

function loadLaps() {
  try {
    const saved = localStorage.getItem('stopwatch_laps');
    if (saved) {
      laps = JSON.parse(saved);
      if (laps.length > 0) {
        const total = laps.reduce((s, l) => s + l.lapTime, 0);
        elapsed = total;
        timeDisplay.textContent = formatTime(elapsed);
        resetBtn.disabled = false;
        renderLaps();
      }
    }
  } catch (e) {
    laps = [];
  }
}

startStopBtn.addEventListener('click', startStop);
lapBtn.addEventListener('click', recordLap);
resetBtn.addEventListener('click', reset);

loadLaps();
