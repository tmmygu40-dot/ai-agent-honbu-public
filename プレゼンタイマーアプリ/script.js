'use strict';

const STORAGE_KEY = 'presentationTimer_slides';

let slides = [];       // [{name, seconds}]
let currentIndex = 0;
let elapsed = 0;       // 現在スライドの経過秒数
let timer = null;
let running = false;
let practiceMode = false;

// --- DOM ---
const slideName = () => document.getElementById('slideName');
const slideMin  = () => document.getElementById('slideMin');
const slideSec  = () => document.getElementById('slideSec');
const addBtn    = document.getElementById('addBtn');
const slideList = document.getElementById('slideList');
const totalTimeEl = document.getElementById('totalTime');
const clearBtn  = document.getElementById('clearBtn');
const practiceBtn = document.getElementById('practiceBtn');
const timerSection = document.getElementById('timerSection');
const progressLabel = document.getElementById('progressLabel');
const totalRemain   = document.getElementById('totalRemain');
const currentSlideNameEl = document.getElementById('currentSlideName');
const timerDisplay = document.getElementById('timerDisplay');
const timeBar   = document.getElementById('timeBar');
const startBtn  = document.getElementById('startBtn');
const nextBtn   = document.getElementById('nextBtn');
const resetBtn  = document.getElementById('resetBtn');

// --- 初期化 ---
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { slides = JSON.parse(saved); } catch(e) { slides = []; }
  }
  renderList();
}

// --- スライドリスト保存 ---
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
}

// --- リスト描画 ---
function renderList() {
  slideList.innerHTML = '';
  if (slides.length === 0) {
    slideList.innerHTML = '<li style="color:#aaa;font-size:0.9rem;padding:8px 6px;">スライドがありません</li>';
  } else {
    slides.forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="slide-num">${i + 1}</span>
        <span class="slide-title" title="${esc(s.name)}">${esc(s.name)}</span>
        <span class="slide-dur">${fmtDur(s.seconds)}</span>
        <button class="del-btn" data-i="${i}" title="削除">✕</button>
      `;
      slideList.appendChild(li);
    });
  }
  updateTotal();
  practiceBtn.disabled = slides.length === 0;
}

function esc(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function fmtDur(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function fmtElapsed(sec) {
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const str = `${m}:${String(s).padStart(2,'0')}`;
  return sec < 0 ? `+${str}` : str;
}

function updateTotal() {
  const total = slides.reduce((a, s) => a + s.seconds, 0);
  totalTimeEl.textContent = `合計：${fmtDur(total)}`;
}

// --- 追加 ---
addBtn.addEventListener('click', addSlide);
[slideName(), slideMin(), slideSec()].forEach(el => {
  el && el.addEventListener('keydown', e => { if (e.key === 'Enter') addSlide(); });
});

function addSlide() {
  const name = slideName().value.trim();
  const min  = parseInt(slideMin().value, 10) || 0;
  const sec  = parseInt(slideSec().value, 10) || 0;
  const total = min * 60 + sec;
  if (!name) { slideName().focus(); return; }
  if (total <= 0) { alert('持ち時間を1秒以上に設定してください'); return; }
  slides.push({ name, seconds: total });
  save();
  renderList();
  slideName().value = '';
  slideMin().value = '0';
  slideSec().value = '30';
  slideName().focus();
}

// --- 削除 ---
slideList.addEventListener('click', e => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  const i = parseInt(btn.dataset.i, 10);
  slides.splice(i, 1);
  save();
  renderList();
});

// --- クリア ---
clearBtn.addEventListener('click', () => {
  if (!confirm('スライドをすべて削除しますか？')) return;
  slides = [];
  save();
  renderList();
  stopPractice();
});

// --- 練習開始 ---
practiceBtn.addEventListener('click', () => {
  if (slides.length === 0) return;
  startPractice();
});

function startPractice() {
  practiceMode = true;
  currentIndex = 0;
  elapsed = 0;
  running = false;
  timerSection.style.display = 'block';
  practiceBtn.textContent = 'リセット';
  practiceBtn.onclick = () => {
    stopPractice();
    startPractice();
  };
  updateTimerUI();
  timerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stopPractice() {
  clearInterval(timer);
  timer = null;
  running = false;
  practiceMode = false;
  timerSection.style.display = 'none';
  practiceBtn.textContent = '練習開始';
  practiceBtn.onclick = null;
  practiceBtn.addEventListener('click', () => {
    if (slides.length === 0) return;
    startPractice();
  });
}

// --- タイマー制御 ---
startBtn.addEventListener('click', () => {
  if (!practiceMode) return;
  if (running) {
    pauseTimer();
  } else {
    resumeTimer();
  }
});

nextBtn.addEventListener('click', () => {
  if (!practiceMode) return;
  goNext();
});

resetBtn.addEventListener('click', () => {
  clearInterval(timer);
  timer = null;
  running = false;
  currentIndex = 0;
  elapsed = 0;
  updateTimerUI();
  startBtn.textContent = '▶ スタート';
  startBtn.classList.remove('running');
});

function resumeTimer() {
  running = true;
  startBtn.textContent = '⏸ 一時停止';
  startBtn.classList.add('running');
  timer = setInterval(tick, 1000);
}

function pauseTimer() {
  running = false;
  clearInterval(timer);
  timer = null;
  startBtn.textContent = '▶ スタート';
  startBtn.classList.remove('running');
}

function tick() {
  elapsed++;
  updateTimerUI();
}

function goNext() {
  clearInterval(timer);
  timer = null;
  running = false;
  startBtn.textContent = '▶ スタート';
  startBtn.classList.remove('running');

  if (currentIndex < slides.length - 1) {
    currentIndex++;
    elapsed = 0;
    updateTimerUI();
  } else {
    showFinish();
  }
}

function updateTimerUI() {
  if (!practiceMode || slides.length === 0) return;

  const slide = slides[currentIndex];
  const alloc = slide.seconds;
  const remain = alloc - elapsed;

  // スライド名
  currentSlideNameEl.textContent = slide.name;

  // 進捗ラベル
  progressLabel.textContent = `スライド ${currentIndex + 1} / ${slides.length}`;

  // 合計残り時間（現在スライドの残り + 以降のスライド合計）
  const futureTotal = slides.slice(currentIndex + 1).reduce((a, s) => a + s.seconds, 0);
  const totalRemainingRaw = Math.max(0, remain) + futureTotal;
  totalRemain.textContent = `残り合計：${fmtDur(totalRemainingRaw)}`;

  // タイマー表示（超過したらマイナス表示）
  timerDisplay.textContent = fmtElapsed(remain);
  if (remain < 0) {
    timerDisplay.classList.add('over');
  } else {
    timerDisplay.classList.remove('over');
  }

  // バー
  const pct = alloc > 0 ? Math.max(0, Math.min(1, remain / alloc)) : 0;
  timeBar.style.width = (pct * 100) + '%';
  if (remain < 0) {
    timeBar.classList.add('over');
  } else {
    timeBar.classList.remove('over');
  }
}

function showFinish() {
  practiceMode = false;
  clearInterval(timer);
  timer = null;
  running = false;

  currentSlideNameEl.textContent = '練習完了！';
  timerDisplay.textContent = '終了';
  timerDisplay.style.color = '#2ecc71';
  timerDisplay.classList.remove('over');
  timeBar.style.width = '0';
  progressLabel.textContent = `${slides.length} / ${slides.length}`;
  totalRemain.textContent = '残り合計：0:00';
  startBtn.disabled = true;
  nextBtn.disabled = true;
  setTimeout(() => {
    startBtn.disabled = false;
    nextBtn.disabled = false;
    timerDisplay.style.color = '';
  }, 3000);
}

// --- 起動 ---
init();
