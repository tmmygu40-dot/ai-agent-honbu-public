'use strict';

const display = document.getElementById('display');
const expression = document.getElementById('expression');

let currentValue = '0';
let operator = null;
let prevValue = null;
let shouldResetDisplay = false;
let expressionStr = '';

function updateDisplay(val) {
  // 長すぎる数値は指数表記
  const num = parseFloat(val);
  if (!isNaN(num) && val.toString().replace('-', '').replace('.', '').length > 9) {
    display.textContent = num.toPrecision(8).replace(/\.?0+$/, '');
  } else {
    display.textContent = val;
  }
}

function handleNumber(value) {
  if (shouldResetDisplay) {
    currentValue = value;
    shouldResetDisplay = false;
  } else {
    if (currentValue === '0' && value !== '.') {
      currentValue = value;
    } else {
      if (currentValue.length >= 12) return;
      currentValue += value;
    }
  }
  updateDisplay(currentValue);
}

function handleDecimal() {
  if (shouldResetDisplay) {
    currentValue = '0.';
    shouldResetDisplay = false;
    updateDisplay(currentValue);
    return;
  }
  if (!currentValue.includes('.')) {
    currentValue += '.';
    updateDisplay(currentValue);
  }
}

function handleOperator(op) {
  // 演算子ボタンのアクティブ表示
  document.querySelectorAll('.btn-orange').forEach(b => b.classList.remove('active'));
  const opMap = { '÷': '÷', '×': '×', '−': '−', '＋': '＋' };
  document.querySelectorAll('.btn-orange').forEach(b => {
    if (b.dataset.value === op) b.classList.add('active');
  });

  if (prevValue !== null && !shouldResetDisplay) {
    calculate();
  }
  prevValue = currentValue;
  operator = op;
  expressionStr = currentValue + ' ' + op;
  expression.textContent = expressionStr;
  shouldResetDisplay = true;
}

function calculate() {
  if (prevValue === null || operator === null) return;
  const a = parseFloat(prevValue);
  const b = parseFloat(currentValue);
  let result;
  switch (operator) {
    case '÷': result = b !== 0 ? a / b : 'エラー'; break;
    case '×': result = a * b; break;
    case '−': result = a - b; break;
    case '＋': result = a + b; break;
    default: return;
  }

  expressionStr = prevValue + ' ' + operator + ' ' + currentValue + ' =';
  expression.textContent = expressionStr;

  if (result === 'エラー') {
    currentValue = 'エラー';
  } else {
    // 浮動小数点誤差対策
    currentValue = parseFloat(result.toPrecision(12)).toString();
  }
  updateDisplay(currentValue);
  prevValue = null;
  operator = null;
  shouldResetDisplay = true;
  document.querySelectorAll('.btn-orange').forEach(b => b.classList.remove('active'));
}

function handleClear() {
  currentValue = '0';
  prevValue = null;
  operator = null;
  expressionStr = '';
  shouldResetDisplay = false;
  expression.textContent = '';
  updateDisplay('0');
  document.querySelectorAll('.btn-orange').forEach(b => b.classList.remove('active'));
}

function handleToggleSign() {
  if (currentValue === '0' || currentValue === 'エラー') return;
  if (currentValue.startsWith('-')) {
    currentValue = currentValue.slice(1);
  } else {
    currentValue = '-' + currentValue;
  }
  updateDisplay(currentValue);
}

function handlePercent() {
  const num = parseFloat(currentValue);
  if (isNaN(num)) return;
  currentValue = (num / 100).toString();
  updateDisplay(currentValue);
}

// ボタンクリック
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value;
    switch (action) {
      case 'number':   handleNumber(value); break;
      case 'decimal':  handleDecimal(); break;
      case 'operator': handleOperator(value); break;
      case 'equals':   calculate(); break;
      case 'clear':    handleClear(); break;
      case 'toggle-sign': handleToggleSign(); break;
      case 'percent':  handlePercent(); break;
    }
  });
});

// キーボード対応
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') { handleNumber(e.key); return; }
  switch (e.key) {
    case '.': handleDecimal(); break;
    case '+': handleOperator('＋'); break;
    case '-': handleOperator('−'); break;
    case '*': handleOperator('×'); break;
    case '/': e.preventDefault(); handleOperator('÷'); break;
    case 'Enter':
    case '=': calculate(); break;
    case 'Escape':
    case 'c':
    case 'C': handleClear(); break;
    case 'Backspace':
      if (!shouldResetDisplay && currentValue.length > 1) {
        currentValue = currentValue.slice(0, -1);
        updateDisplay(currentValue);
      } else if (currentValue !== '0') {
        currentValue = '0';
        updateDisplay('0');
      }
      break;
  }
});
