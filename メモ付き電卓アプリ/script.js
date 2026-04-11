// ===== 電卓ロジック =====
let currentInput = '';
let expression = '';
let justCalculated = false;

const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');

function updateDisplay() {
  resultEl.textContent = currentInput || '0';
}

function inputNum(num) {
  if (justCalculated) {
    currentInput = '';
    expression = '';
    justCalculated = false;
  }
  // 先頭の0を除去（小数点の場合を除く）
  if (currentInput === '0' && num !== '.') {
    currentInput = num;
  } else {
    currentInput += num;
  }
  updateDisplay();
}

function inputDot() {
  if (justCalculated) {
    currentInput = '0';
    expression = '';
    justCalculated = false;
  }
  if (!currentInput) {
    currentInput = '0';
  }
  if (!currentInput.includes('.')) {
    currentInput += '.';
  }
  updateDisplay();
}

function inputOp(op) {
  justCalculated = false;
  if (currentInput === '' && expression === '') return;

  const opSymbol = { '+': '＋', '-': '−', '*': '×', '/': '÷' }[op];

  if (currentInput !== '') {
    expression += currentInput + ' ' + opSymbol + ' ';
    currentInput = '';
  } else {
    // 演算子の置き換え（末尾の演算子を差し替え）
    expression = expression.replace(/[＋−×÷] $/, opSymbol + ' ');
  }
  expressionEl.textContent = expression;
  resultEl.textContent = '0';
}

function calculate() {
  if (currentInput === '' && expression === '') return;

  const fullExpr = expression + currentInput;
  if (!fullExpr) return;

  // 式を安全に評価するため、表示用記号を演算子に変換
  const evalExpr = (expression + currentInput)
    .replace(/＋/g, '+')
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/');

  try {
    // 安全評価：数字・演算子・スペース・ドットのみ許可
    if (!/^[\d\s+\-*/.]+$/.test(evalExpr)) throw new Error('invalid');
    const value = Function('"use strict"; return (' + evalExpr + ')')();
    if (!isFinite(value)) {
      currentInput = 'エラー';
      expression = '';
      expressionEl.textContent = '';
      resultEl.textContent = 'エラー';
      justCalculated = true;
      return;
    }
    const rounded = parseFloat(value.toFixed(10));
    expressionEl.textContent = fullExpr + ' =';
    currentInput = String(rounded);
    expression = '';
    updateDisplay();
    justCalculated = true;
  } catch (e) {
    currentInput = 'エラー';
    expression = '';
    expressionEl.textContent = '';
    resultEl.textContent = 'エラー';
    justCalculated = true;
  }
}

function clearAll() {
  currentInput = '';
  expression = '';
  justCalculated = false;
  expressionEl.textContent = '';
  resultEl.textContent = '0';
}

function backspace() {
  if (justCalculated) {
    clearAll();
    return;
  }
  if (currentInput.length > 0) {
    currentInput = currentInput.slice(0, -1);
    updateDisplay();
  }
}

// ===== メモロジック =====
const STORAGE_KEY = 'memo-calc-list';

function loadMemos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

function renderMemos() {
  const memos = loadMemos();
  const list = document.getElementById('memoList');
  const emptyMsg = document.getElementById('emptyMsg');

  list.innerHTML = '';

  if (memos.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  memos.forEach((memo, index) => {
    const li = document.createElement('li');
    li.className = 'memo-item';
    li.innerHTML = `
      <div class="memo-item-body">
        <div class="memo-item-label">${escapeHtml(memo.label || '（ラベルなし）')}</div>
        <div class="memo-item-value">${escapeHtml(memo.value)}</div>
      </div>
      <div class="memo-item-time">${memo.time}</div>
      <button class="memo-item-del" onclick="deleteMemo(${index})" title="削除">✕</button>
    `;
    list.appendChild(li);
  });
}

function saveMemo() {
  const value = resultEl.textContent;
  if (!value || value === '0' || value === 'エラー') {
    alert('保存する計算結果がありません');
    return;
  }
  const label = document.getElementById('labelInput').value.trim();
  const now = new Date();
  const time = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const memos = loadMemos();
  memos.unshift({ label, value, time });
  saveMemos(memos);
  document.getElementById('labelInput').value = '';
  renderMemos();
}

function deleteMemo(index) {
  const memos = loadMemos();
  memos.splice(index, 1);
  saveMemos(memos);
  renderMemos();
}

function clearAllMemos() {
  if (loadMemos().length === 0) return;
  if (confirm('保存したメモを全件削除しますか？')) {
    saveMemos([]);
    renderMemos();
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
renderMemos();
