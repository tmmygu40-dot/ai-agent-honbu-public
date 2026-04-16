const principalInput = document.getElementById('principal');
const rateInput = document.getElementById('rate');
const paymentInput = document.getElementById('payment');
const calcBtn = document.getElementById('calcBtn');
const errorEl = document.getElementById('error');
const summaryEl = document.getElementById('summary');
const tableSectionEl = document.getElementById('tableSection');
const tableBody = document.getElementById('tableBody');
const totalMonthsEl = document.getElementById('totalMonths');
const totalPaymentEl = document.getElementById('totalPayment');
const totalInterestEl = document.getElementById('totalInterest');

// localStorage から入力値を復元
(function loadSaved() {
  const saved = localStorage.getItem('repayment_inputs');
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (data.principal) principalInput.value = data.principal;
    if (data.rate) rateInput.value = data.rate;
    if (data.payment) paymentInput.value = data.payment;
  } catch (e) {}
})();

calcBtn.addEventListener('click', calculate);

[principalInput, rateInput, paymentInput].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') calculate();
  });
});

function fmt(n) {
  return Math.round(n).toLocaleString('ja-JP');
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  summaryEl.classList.add('hidden');
  tableSectionEl.classList.add('hidden');
}

function calculate() {
  errorEl.classList.add('hidden');

  const principal = parseFloat(principalInput.value);
  const annualRate = parseFloat(rateInput.value);
  const monthlyPayment = parseFloat(paymentInput.value);

  if (isNaN(principal) || principal <= 0) {
    showError('借入額を正しく入力してください。');
    return;
  }
  if (isNaN(annualRate) || annualRate < 0) {
    showError('年利を正しく入力してください（0以上の数値）。');
    return;
  }
  if (isNaN(monthlyPayment) || monthlyPayment <= 0) {
    showError('月返済額を正しく入力してください。');
    return;
  }

  const monthlyRate = annualRate / 100 / 12;

  // 利息のみの場合チェック
  const firstInterest = principal * monthlyRate;
  if (monthlyRate > 0 && monthlyPayment <= firstInterest) {
    showError(
      `月返済額が初月の利息（${fmt(firstInterest)}円）以下のため、残高が減りません。月返済額を増やしてください。`
    );
    return;
  }

  // localStorage に保存
  localStorage.setItem('repayment_inputs', JSON.stringify({
    principal: principalInput.value,
    rate: rateInput.value,
    payment: paymentInput.value
  }));

  // 計算
  const rows = [];
  let balance = principal;
  let totalPaid = 0;
  let totalInterestPaid = 0;
  const MAX_MONTHS = 360;

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const interest = balance * monthlyRate;
    let actualPayment = monthlyPayment;

    if (balance + interest <= monthlyPayment) {
      // 最終月：残高＋利息を支払って完済
      actualPayment = balance + interest;
    }

    const principalPaid = actualPayment - interest;
    balance = balance - principalPaid;
    if (balance < 0) balance = 0;

    totalPaid += actualPayment;
    totalInterestPaid += interest;

    rows.push({
      month,
      payment: actualPayment,
      interest,
      principalPaid,
      balance,
      isFinal: balance <= 0
    });

    if (balance <= 0) break;
  }

  const lastRow = rows[rows.length - 1];
  const months = lastRow.month;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  let monthsLabel;
  if (years > 0 && remMonths > 0) {
    monthsLabel = `${months}ヶ月（${years}年${remMonths}ヶ月）`;
  } else if (years > 0) {
    monthsLabel = `${months}ヶ月（${years}年）`;
  } else {
    monthsLabel = `${months}ヶ月`;
  }

  if (months >= MAX_MONTHS && lastRow.balance > 0) {
    monthsLabel = `${MAX_MONTHS}ヶ月以上`;
  }

  totalMonthsEl.textContent = monthsLabel;
  totalPaymentEl.textContent = `${fmt(totalPaid)}円`;
  totalInterestEl.textContent = `${fmt(totalInterestPaid)}円`;

  // テーブル描画
  tableBody.innerHTML = '';
  rows.forEach(row => {
    const tr = document.createElement('tr');
    if (row.isFinal) tr.classList.add('last-row');
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${fmt(row.payment)}</td>
      <td>${fmt(row.interest)}</td>
      <td>${fmt(row.principalPaid)}</td>
      <td>${fmt(row.balance)}</td>
    `;
    tableBody.appendChild(tr);
  });

  summaryEl.classList.remove('hidden');
  tableSectionEl.classList.remove('hidden');
  summaryEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
