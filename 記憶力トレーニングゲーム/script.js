'use strict';

// ---- 状態 ----
let currentNumber = '';
let currentScore = 0;
let highScore = 0;
let digits = 4;
let displayTime = 3; // 秒
let countdownTimer = null;

// ---- DOM ----
const screens = {
  start: document.getElementById('screen-start'),
  show: document.getElementById('screen-show'),
  input: document.getElementById('screen-input'),
  result: document.getElementById('screen-result'),
};

const digitSelect   = document.getElementById('digit-select');
const timeSelect    = document.getElementById('time-select');
const btnStart      = document.getElementById('btn-start');
const btnSubmit     = document.getElementById('btn-submit');
const btnNext       = document.getElementById('btn-next');
const btnHome       = document.getElementById('btn-home');
const answerInput   = document.getElementById('answer-input');
const numberDisplay = document.getElementById('number-display');
const timerBar      = document.getElementById('timer-bar');
const countdownText = document.getElementById('countdown-text');
const resultIcon    = document.getElementById('result-icon');
const resultLabel   = document.getElementById('result-label');
const correctAnswer = document.getElementById('correct-answer');

const hsEl         = document.getElementById('highscore');
const currentScoreEl = document.getElementById('current-score');
const hsResultEl   = document.getElementById('highscore-result');

// ---- ハイスコア読み込み ----
function loadHighScore() {
  const saved = localStorage.getItem('memoryGame_highScore');
  highScore = saved ? parseInt(saved, 10) : 0;
  updateHighScoreDisplay();
}

function saveHighScore() {
  localStorage.setItem('memoryGame_highScore', highScore.toString());
}

function updateHighScoreDisplay() {
  hsEl.textContent = highScore;
  hsResultEl.textContent = highScore;
}

// ---- 画面切り替え ----
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

// ---- ランダム数字生成 ----
function generateNumber(d) {
  const min = Math.pow(10, d - 1);
  const max = Math.pow(10, d) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

// ---- ゲーム開始 ----
function startGame() {
  digits = parseInt(digitSelect.value, 10);
  displayTime = parseInt(timeSelect.value, 10);
  currentNumber = generateNumber(digits);

  numberDisplay.textContent = currentNumber;
  timerBar.style.transition = 'none';
  timerBar.style.width = '100%';
  countdownText.textContent = `${displayTime}秒後に隠れます`;

  showScreen('show');

  // タイマーバーアニメーション（1フレーム後に開始）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      timerBar.style.transition = `width ${displayTime}s linear`;
      timerBar.style.width = '0%';
    });
  });

  // カウントダウン表示
  let remaining = displayTime;
  countdownText.textContent = `あと ${remaining} 秒`;

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      countdownText.textContent = `あと ${remaining} 秒`;
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      showInputScreen();
    }
  }, 1000);
}

// ---- 入力画面 ----
function showInputScreen() {
  numberDisplay.textContent = '';
  answerInput.value = '';
  showScreen('input');
  // 少し遅延してフォーカス（モバイルキーボード対応）
  setTimeout(() => answerInput.focus(), 100);
}

// ---- 答え判定 ----
function checkAnswer() {
  const userAnswer = answerInput.value.trim();
  if (!userAnswer) return;

  const isCorrect = userAnswer === currentNumber;

  if (isCorrect) {
    currentScore++;
    resultIcon.textContent = '⭕';
    resultLabel.textContent = '正解！';
    resultLabel.className = 'result-label correct';
    correctAnswer.textContent = '';
  } else {
    resultIcon.textContent = '❌';
    resultLabel.textContent = '不正解';
    resultLabel.className = 'result-label wrong';
    correctAnswer.textContent = `正解は「${currentNumber}」でした`;
    currentScore = 0;
  }

  if (currentScore > highScore) {
    highScore = currentScore;
    saveHighScore();
  }

  currentScoreEl.textContent = currentScore;
  updateHighScoreDisplay();

  showScreen('result');
}

// ---- 次の問題 ----
function nextQuestion() {
  startGame();
}

// ---- トップへ ----
function goHome() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  currentScore = 0;
  currentScoreEl.textContent = 0;
  showScreen('start');
}

// ---- イベント ----
btnStart.addEventListener('click', startGame);

btnSubmit.addEventListener('click', checkAnswer);

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkAnswer();
});

btnNext.addEventListener('click', nextQuestion);

btnHome.addEventListener('click', goHome);

// ---- 初期化 ----
loadHighScore();
showScreen('start');
