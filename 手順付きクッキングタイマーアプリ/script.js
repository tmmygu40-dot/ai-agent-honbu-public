// 工程データ
let steps = [];
let currentStepIndex = 0;
let remainingSeconds = 0;
let timerInterval = null;
let isRunning = false;

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  renderStepList();
  renderTimer();
});

// localStorage 保存
function saveToStorage() {
  localStorage.setItem('cookingSteps', JSON.stringify(steps));
}

function loadFromStorage() {
  const saved = localStorage.getItem('cookingSteps');
  if (saved) {
    steps = JSON.parse(saved);
  }
}

// 工程追加
function addStep() {
  const nameInput = document.getElementById('stepName');
  const minInput = document.getElementById('stepMin');
  const secInput = document.getElementById('stepSec');

  const name = nameInput.value.trim();
  const min = parseInt(minInput.value) || 0;
  const sec = parseInt(secInput.value) || 0;

  if (!name) {
    nameInput.focus();
    nameInput.style.borderColor = '#e74c3c';
    setTimeout(() => { nameInput.style.borderColor = ''; }, 1500);
    return;
  }

  const totalSec = min * 60 + sec;
  if (totalSec <= 0) {
    minInput.focus();
    minInput.style.borderColor = '#e74c3c';
    secInput.style.borderColor = '#e74c3c';
    setTimeout(() => {
      minInput.style.borderColor = '';
      secInput.style.borderColor = '';
    }, 1500);
    return;
  }

  steps.push({ name, totalSec });
  saveToStorage();

  // フォームリセット
  nameInput.value = '';
  minInput.value = 0;
  secInput.value = 0;
  nameInput.focus();

  renderStepList();
  updateTimerDisplay();
}

// 工程削除
function deleteStep(index) {
  if (isRunning) return;
  steps.splice(index, 1);
  saveToStorage();

  if (currentStepIndex >= steps.length) {
    currentStepIndex = Math.max(0, steps.length - 1);
  }
  resetTimer();
  renderStepList();
}

// 全削除
function clearAllSteps() {
  if (isRunning) return;
  if (steps.length === 0) return;
  if (!confirm('全工程を削除しますか？')) return;
  steps = [];
  saveToStorage();
  resetTimer();
  renderStepList();
}

// 工程リスト描画
function renderStepList() {
  const list = document.getElementById('stepList');
  const emptyMsg = document.getElementById('emptyMsg');

  if (steps.length === 0) {
    list.innerHTML = '<li class="empty-msg" id="emptyMsg">工程を追加してください</li>';
    return;
  }

  list.innerHTML = steps.map((step, i) => {
    let cls = 'step-item';
    if (i === currentStepIndex && (isRunning || remainingSeconds > 0)) {
      cls += ' active';
    } else if (i < currentStepIndex) {
      cls += ' done';
    }

    const doneIcon = i < currentStepIndex ? '✓' : (i + 1);

    return `
      <li class="${cls}" id="step-${i}">
        <div class="step-num">${doneIcon}</div>
        <div class="step-info">
          <div class="step-name">${escHtml(step.name)}</div>
          <div class="step-time">${formatTime(step.totalSec)}</div>
        </div>
        ${!isRunning ? `<button class="btn-delete" onclick="deleteStep(${i})" title="削除">×</button>` : ''}
      </li>
    `;
  }).join('');
}

// タイマー表示更新
function updateTimerDisplay() {
  const display = document.getElementById('timerDisplay');
  const stepName = document.getElementById('currentStepName');
  const stepProgress = document.getElementById('stepProgress');

  if (steps.length === 0) {
    display.textContent = '00:00';
    stepName.textContent = '-';
    stepProgress.textContent = '';
    return;
  }

  if (currentStepIndex < steps.length) {
    const sec = remainingSeconds > 0 ? remainingSeconds : steps[currentStepIndex].totalSec;
    display.textContent = formatTime(sec);
    stepName.textContent = steps[currentStepIndex].name;
    stepProgress.textContent = `工程 ${currentStepIndex + 1} / ${steps.length}`;
  }
}

// タイマーレンダリング（初回）
function renderTimer() {
  currentStepIndex = 0;
  remainingSeconds = steps.length > 0 ? steps[0].totalSec : 0;
  updateTimerDisplay();
}

// タイマースタート
function startTimer() {
  if (steps.length === 0) return;
  if (isRunning) return;

  if (remainingSeconds === 0) {
    if (currentStepIndex >= steps.length) {
      // 全工程終わっていたらリセット
      currentStepIndex = 0;
    }
    remainingSeconds = steps[currentStepIndex].totalSec;
  }

  isRunning = true;
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('pauseBtn').style.display = 'inline-block';
  document.getElementById('finishMsg').style.display = 'none';

  renderStepList();

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      onStepFinished();
    }
  }, 1000);
}

// 一時停止
function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);

  document.getElementById('startBtn').style.display = 'inline-block';
  document.getElementById('pauseBtn').style.display = 'none';
  renderStepList();
}

// リセット
function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  currentStepIndex = 0;
  remainingSeconds = steps.length > 0 ? steps[0].totalSec : 0;

  document.getElementById('startBtn').style.display = 'inline-block';
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('finishMsg').style.display = 'none';

  updateTimerDisplay();
  renderStepList();
}

// 工程完了時
function onStepFinished() {
  playBeep();
  clearInterval(timerInterval);
  isRunning = false;

  currentStepIndex++;

  if (currentStepIndex >= steps.length) {
    // 全工程完了
    document.getElementById('timerDisplay').textContent = '00:00';
    document.getElementById('currentStepName').textContent = '完了！';
    document.getElementById('stepProgress').textContent = `全 ${steps.length} 工程完了`;
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('finishMsg').style.display = 'block';
    renderStepList();
    return;
  }

  // 次の工程へ
  remainingSeconds = steps[currentStepIndex].totalSec;
  updateTimerDisplay();
  renderStepList();

  // 自動で次の工程を開始
  isRunning = true;
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('pauseBtn').style.display = 'inline-block';

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      onStepFinished();
    }
  }, 1000);
}

// ビープ音（Web Audio API）
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);
  } catch (e) {
    // 音が鳴らない環境ではスキップ
  }
}

// 時間フォーマット（秒 → MM:SS）
function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// HTMLエスケープ
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
