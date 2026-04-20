const STORAGE_KEY = 'kinri_simulator_v1';

// 元利均等返済 月返済額 計算 (万円単位で入出力)
function calcMonthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) {
    return principal / months;
  }
  const r = annualRate / 100 / 12;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

function fmt(val) {
  return val.toFixed(2);
}

function calculate() {
  const balance = parseFloat(document.getElementById('balance').value);
  const currentRate = parseFloat(document.getElementById('currentRate').value);
  const years = parseFloat(document.getElementById('remainingMonths').value);
  const rise = parseFloat(document.getElementById('riseAmount').value);

  if (isNaN(balance) || isNaN(currentRate) || isNaN(years) || isNaN(rise)) {
    alert('すべての項目を入力してください');
    return;
  }
  if (balance <= 0 || years <= 0) {
    alert('借入残高・残り返済期間は0より大きい値を入力してください');
    return;
  }

  const months = years * 12;
  const afterRate = currentRate + rise;

  const currentMonthly = calcMonthlyPayment(balance, currentRate, months);
  const afterMonthly = calcMonthlyPayment(balance, afterRate, months);

  const currentTotal = currentMonthly * months;
  const afterTotal = afterMonthly * months;

  const diffMonthly = afterMonthly - currentMonthly;
  const diffTotal = afterTotal - currentTotal;
  const diffAnnual = diffMonthly * 12;

  // Show results
  document.getElementById('rCurrentRate').textContent = currentRate.toFixed(2);
  document.getElementById('rCurrentMonthly').textContent = fmt(currentMonthly);
  document.getElementById('rCurrentTotal').textContent = fmt(currentTotal);

  document.getElementById('rAfterRate').textContent = afterRate.toFixed(2);
  document.getElementById('rAfterMonthly').textContent = fmt(afterMonthly);
  document.getElementById('rAfterTotal').textContent = fmt(afterTotal);

  document.getElementById('diffMonthly').textContent = '+' + fmt(diffMonthly) + ' 万円/月';
  document.getElementById('diffTotal').textContent = '+' + fmt(diffTotal) + ' 万円';
  document.getElementById('diffAnnual').textContent = '+' + fmt(diffAnnual) + ' 万円/年';

  document.getElementById('resultCard').style.display = 'block';

  // Scenario table
  const scenarios = [0.5, 1.0, 1.5, 2.0, 3.0];
  const tbody = document.getElementById('scenarioBody');
  tbody.innerHTML = '';
  scenarios.forEach(r => {
    const aRate = currentRate + r;
    const aMonthly = calcMonthlyPayment(balance, aRate, months);
    const aTotal = aMonthly * months;
    const dM = aMonthly - currentMonthly;
    const dT = aTotal - currentTotal;
    const tr = document.createElement('tr');
    if (Math.abs(r - rise) < 0.001) tr.className = 'highlight';
    tr.innerHTML = `<td>+${r.toFixed(1)}%</td><td>+${fmt(dM)}</td><td>+${fmt(dT)}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('scenarioCard').style.display = 'block';

  // Save to localStorage
  saveInputs();
}

function saveInputs() {
  const data = {
    balance: document.getElementById('balance').value,
    currentRate: document.getElementById('currentRate').value,
    remainingMonths: document.getElementById('remainingMonths').value,
    riseAmount: document.getElementById('riseAmount').value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadInputs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.balance) document.getElementById('balance').value = data.balance;
    if (data.currentRate) document.getElementById('currentRate').value = data.currentRate;
    if (data.remainingMonths) document.getElementById('remainingMonths').value = data.remainingMonths;
    if (data.riseAmount) document.getElementById('riseAmount').value = data.riseAmount;
  } catch (e) {}
}

window.addEventListener('DOMContentLoaded', loadInputs);
