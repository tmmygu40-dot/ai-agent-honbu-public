'use strict';

const TEXTS = [
  "The quick brown fox jumps over the lazy dog near the riverbank.",
  "Practice makes perfect, so keep typing every single day.",
  "A journey of a thousand miles begins with a single step.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "To be or not to be, that is the question every programmer must answer.",
  "The best way to predict the future is to invent it yourself.",
  "Technology is best when it brings people together and makes life easier.",
  "Simplicity is the ultimate sophistication in design and engineering.",
  "Code is like humor: when you have to explain it, it is probably bad.",
  "First, solve the problem. Then, write the code to fix it properly.",
  "The only way to do great work is to love what you do every day.",
  "Learning never exhausts the mind, it only feeds curiosity further.",
  "Every expert was once a beginner who refused to give up quickly.",
  "Good code is its own best documentation, clear and concise.",
  "Typing fast is a skill that improves with consistent daily practice.",
];

const DURATION = 60;

let timerInterval = null;
let timeLeft = DURATION;
let isRunning = false;
let currentText = '';
let inputHistory = '';
let totalTyped = 0;
let totalErrors = 0;

const timerEl = document.getElementById('timer');
const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const textDisplay = document.getElementById('textDisplay');
const inputArea = document.getElementById('inputArea');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const resultPanel = document.getElementById('resultPanel');
const finalWpm = document.getElementById('finalWpm');
const finalAccuracy = document.getElementById('finalAccuracy');
const finalChars = document.getElementById('finalChars');
const finalErrors = document.getElementById('finalErrors');
const highScoreEl = document.getElementById('highScore');

function getRandomText() {
  return TEXTS[Math.floor(Math.random() * TEXTS.length)];
}

function renderText(typed) {
  const chars = currentText.split('');
  const typedChars = typed.split('');
  let html = '';
  chars.forEach((ch, i) => {
    let cls = '';
    if (i < typedChars.length) {
      cls = typedChars[i] === ch ? 'correct' : 'incorrect';
    } else if (i === typedChars.length) {
      cls = 'current';
    }
    const escaped = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === ' ' ? '&nbsp;' : ch;
    html += `<span class="char ${cls}">${escaped}</span>`;
  });
  textDisplay.innerHTML = html;
}

function calcWpm(typedLength, elapsedSeconds) {
  if (elapsedSeconds <= 0) return 0;
  const words = typedLength / 5;
  const minutes = elapsedSeconds / 60;
  return Math.round(words / minutes);
}

function calcAccuracy() {
  if (totalTyped === 0) return 100;
  const correct = totalTyped - totalErrors;
  return Math.max(0, Math.round((correct / totalTyped) * 100));
}

function updateStats(typed) {
  const elapsed = DURATION - timeLeft;
  const wpm = calcWpm(typed.length, elapsed);
  const acc = calcAccuracy();
  wpmEl.textContent = wpm;
  accuracyEl.textContent = acc + '%';
}

function startGame() {
  currentText = getRandomText();
  inputHistory = '';
  totalTyped = 0;
  totalErrors = 0;
  timeLeft = DURATION;

  timerEl.textContent = timeLeft;
  timerEl.classList.remove('timer-warning');
  wpmEl.textContent = '0';
  accuracyEl.textContent = '100%';
  resultPanel.style.display = 'none';

  renderText('');
  inputArea.value = '';
  inputArea.disabled = false;
  inputArea.focus();

  startBtn.disabled = true;
  isRunning = true;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 10) timerEl.classList.add('timer-warning');
    updateStats(inputArea.value);
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  clearInterval(timerInterval);
  isRunning = false;
  inputArea.disabled = true;
  startBtn.disabled = false;

  const typed = inputArea.value;
  const wpm = calcWpm(typed.length, DURATION);
  const acc = calcAccuracy();

  finalWpm.textContent = wpm;
  finalAccuracy.textContent = acc + '%';
  finalChars.textContent = typed.length;
  finalErrors.textContent = totalErrors;

  const best = saveHighScore(wpm);
  highScoreEl.textContent = best;
  loadHighScore();

  resultPanel.style.display = 'block';
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetGame() {
  clearInterval(timerInterval);
  isRunning = false;
  timeLeft = DURATION;
  totalTyped = 0;
  totalErrors = 0;

  timerEl.textContent = DURATION;
  timerEl.classList.remove('timer-warning');
  wpmEl.textContent = '0';
  accuracyEl.textContent = '100%';

  currentText = getRandomText();
  renderText('');
  inputArea.value = '';
  inputArea.disabled = true;
  inputArea.placeholder = 'スタートボタンを押してタイピングを始めてください';
  startBtn.disabled = false;
  resultPanel.style.display = 'none';
}

function saveHighScore(wpm) {
  const prev = parseInt(localStorage.getItem('typingBestWpm') || '0', 10);
  const best = Math.max(prev, wpm);
  localStorage.setItem('typingBestWpm', best);
  return best;
}

function loadHighScore() {
  const best = localStorage.getItem('typingBestWpm') || '0';
  highScoreEl.textContent = best;
}

inputArea.addEventListener('input', () => {
  if (!isRunning) return;
  const typed = inputArea.value;
  totalTyped++;

  const pos = typed.length - 1;
  if (pos >= 0 && pos < currentText.length) {
    if (typed[pos] !== currentText[pos]) totalErrors++;
  }

  renderText(typed);
  updateStats(typed);

  if (typed === currentText) {
    endGame();
  }
});

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

// 初期表示
currentText = getRandomText();
renderText('');
loadHighScore();
