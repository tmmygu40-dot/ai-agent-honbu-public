const STORAGE_KEY = 'metronome_bpm';
const BPM_MIN = 40;
const BPM_MAX = 240;

let bpm = 120;
let isRunning = false;
let nextBeatTime = 0;
let beatCount = 0;
let schedulerTimer = null;
let audioCtx = null;

const beatCircle = document.getElementById('beatCircle');
const bpmDisplay = document.getElementById('bpmDisplay');
const bpmSlider = document.getElementById('bpmSlider');
const bpmInput = document.getElementById('bpmInput');
const btnStart = document.getElementById('btnStart');
const beatCounter = document.getElementById('beatCounter');
const btnMinus10 = document.getElementById('btnMinus10');
const btnMinus1 = document.getElementById('btnMinus1');
const btnPlus1 = document.getElementById('btnPlus1');
const btnPlus10 = document.getElementById('btnPlus10');

// --- BPM 管理 ---

function clampBPM(val) {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(val)));
}

function setBPM(val) {
  bpm = clampBPM(val);
  bpmDisplay.textContent = bpm;
  bpmSlider.value = bpm;
  bpmInput.value = bpm;
  localStorage.setItem(STORAGE_KEY, bpm);
}

function loadBPM() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    setBPM(parseInt(saved, 10));
  }
}

// --- 音 ---

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function scheduleClick(time, isAccent) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = isAccent ? 1000 : 800;
  gain.gain.setValueAtTime(isAccent ? 0.6 : 0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

  osc.start(time);
  osc.stop(time + 0.08);
}

// --- ビジュアル点滅 ---

let visualTimer = null;

function flashBeat(isAccent) {
  if (isAccent) {
    beatCircle.classList.add('accent');
  } else {
    beatCircle.classList.add('active');
  }
  clearTimeout(visualTimer);
  visualTimer = setTimeout(() => {
    beatCircle.classList.remove('active', 'accent');
  }, 80);
}

// --- スケジューラ（Web Audio APIのclockを使った高精度スケジューリング） ---

const LOOKAHEAD = 0.1;   // 先読み秒数
const SCHEDULE_INTERVAL = 25; // スケジューラ呼び出し間隔(ms)

function scheduler() {
  const ctx = getAudioContext();
  const beatsPerSecond = bpm / 60;
  const beatInterval = 1 / beatsPerSecond;

  while (nextBeatTime < ctx.currentTime + LOOKAHEAD) {
    const isAccent = (beatCount % 4 === 0);
    scheduleClick(nextBeatTime, isAccent);

    // ビジュアルは AudioContext のタイマーで近似タイミングで発火
    const delay = (nextBeatTime - ctx.currentTime) * 1000;
    const capturedIsAccent = isAccent;
    setTimeout(() => {
      if (isRunning) {
        flashBeat(capturedIsAccent);
        beatCount++;
        beatCounter.textContent = `ビート ${beatCount}`;
      }
    }, Math.max(0, delay));

    nextBeatTime += beatInterval;
  }

  schedulerTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
}

function startMetronome() {
  const ctx = getAudioContext();
  // iOSでAudioContextがsuspendedの場合はresumeする
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  beatCount = 0;
  nextBeatTime = ctx.currentTime + 0.05;
  scheduler();
}

function stopMetronome() {
  clearTimeout(schedulerTimer);
  schedulerTimer = null;
  beatCircle.classList.remove('active', 'accent');
  clearTimeout(visualTimer);
  beatCounter.textContent = '-';
}

// --- UI イベント ---

btnStart.addEventListener('click', () => {
  if (isRunning) {
    isRunning = false;
    stopMetronome();
    btnStart.textContent = 'スタート';
    btnStart.classList.remove('running');
  } else {
    isRunning = true;
    startMetronome();
    btnStart.textContent = 'ストップ';
    btnStart.classList.add('running');
  }
});

bpmSlider.addEventListener('input', () => {
  setBPM(parseInt(bpmSlider.value, 10));
  if (isRunning) restartMetronome();
});

bpmInput.addEventListener('change', () => {
  setBPM(parseInt(bpmInput.value, 10));
  if (isRunning) restartMetronome();
});

bpmInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    setBPM(parseInt(bpmInput.value, 10));
    if (isRunning) restartMetronome();
  }
});

btnMinus10.addEventListener('click', () => { setBPM(bpm - 10); if (isRunning) restartMetronome(); });
btnMinus1.addEventListener('click',  () => { setBPM(bpm - 1);  if (isRunning) restartMetronome(); });
btnPlus1.addEventListener('click',   () => { setBPM(bpm + 1);  if (isRunning) restartMetronome(); });
btnPlus10.addEventListener('click',  () => { setBPM(bpm + 10); if (isRunning) restartMetronome(); });

function restartMetronome() {
  stopMetronome();
  startMetronome();
}

// --- 初期化 ---
loadBPM();
