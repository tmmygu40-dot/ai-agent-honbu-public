'use strict';

const scriptInput = document.getElementById('script-input');
const charCountEl = document.getElementById('char-count');
const speedSlider = document.getElementById('speed-slider');
const speedNumber = document.getElementById('speed-number');
const resultTime = document.getElementById('result-time');
const resultDetail = document.getElementById('result-detail');
const presetBtns = document.querySelectorAll('.preset-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');

function calcTime() {
  const text = scriptInput.value;
  const charCount = text.length;
  const speed = parseInt(speedSlider.value, 10) || 300;

  charCountEl.textContent = charCount.toLocaleString();

  if (charCount === 0) {
    resultTime.textContent = '0 分 0 秒';
    resultDetail.textContent = '（0.0 分）';
    return;
  }

  const totalMinutes = charCount / speed;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);

  const displayMin = seconds === 60 ? minutes + 1 : minutes;
  const displaySec = seconds === 60 ? 0 : seconds;

  resultTime.textContent = `${displayMin} 分 ${displaySec} 秒`;
  resultDetail.textContent = `（${totalMinutes.toFixed(1)} 分）`;

  saveToStorage();
}

function syncSliderToNumber() {
  let v = parseInt(speedNumber.value, 10);
  if (isNaN(v)) v = 300;
  v = Math.max(100, Math.min(600, v));
  speedNumber.value = v;
  speedSlider.value = v;
  updatePresetActive(v);
  calcTime();
}

function syncNumberToSlider() {
  speedNumber.value = speedSlider.value;
  updatePresetActive(parseInt(speedSlider.value, 10));
  calcTime();
}

function updatePresetActive(speed) {
  presetBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.speed, 10) === speed);
  });
}

function saveToStorage() {
  try {
    localStorage.setItem('genkoChecker_text', scriptInput.value);
    localStorage.setItem('genkoChecker_speed', speedSlider.value);
  } catch (e) {}
}

function loadFromStorage() {
  try {
    const savedText = localStorage.getItem('genkoChecker_text');
    const savedSpeed = localStorage.getItem('genkoChecker_speed');
    if (savedText !== null) scriptInput.value = savedText;
    if (savedSpeed !== null) {
      const s = parseInt(savedSpeed, 10);
      speedSlider.value = s;
      speedNumber.value = s;
      updatePresetActive(s);
    }
  } catch (e) {}
  calcTime();
}

scriptInput.addEventListener('input', calcTime);

speedSlider.addEventListener('input', syncNumberToSlider);

speedNumber.addEventListener('change', syncSliderToNumber);
speedNumber.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') syncSliderToNumber();
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const s = parseInt(btn.dataset.speed, 10);
    speedSlider.value = s;
    speedNumber.value = s;
    updatePresetActive(s);
    calcTime();
  });
});

clearBtn.addEventListener('click', () => {
  scriptInput.value = '';
  calcTime();
  scriptInput.focus();
});

copyBtn.addEventListener('click', () => {
  const charCount = scriptInput.value.length;
  const speed = parseInt(speedSlider.value, 10);
  const text = resultTime.textContent;
  const copyText = `【原稿時間チェッカー】\n文字数：${charCount.toLocaleString()}文字\n読み上げ速度：${speed}文字/分\n所要時間：${text}`;

  navigator.clipboard.writeText(copyText).then(() => {
    copyBtn.textContent = 'コピーしました！';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = '結果をコピー';
      copyBtn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    copyBtn.textContent = 'コピー失敗';
    setTimeout(() => { copyBtn.textContent = '結果をコピー'; }, 2000);
  });
});

loadFromStorage();
