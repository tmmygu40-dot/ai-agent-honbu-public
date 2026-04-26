const STORAGE_KEY = 'fukugyo_history';

const calcBtn = document.getElementById('calcBtn');
const resultCard = document.getElementById('resultCard');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

calcBtn.addEventListener('click', calculate);
clearHistoryBtn.addEventListener('click', clearHistory);

function calculate() {
  const monthlyRevenue = parseFloat(document.getElementById('monthlyRevenue').value) || 0;
  const monthlyExpense = parseFloat(document.getElementById('monthlyExpense').value) || 0;
  const incomeTaxRate  = parseFloat(document.getElementById('incomeTaxRate').value)  || 0;
  const residentTaxRate = parseFloat(document.getElementById('residentTaxRate').value) || 0;

  if (monthlyRevenue <= 0) {
    alert('月収を入力してください。');
    return;
  }

  // 月間計算
  const monthlyIncome   = Math.max(monthlyRevenue - monthlyExpense, 0);
  const totalTaxRate    = (incomeTaxRate + residentTaxRate) / 100;
  const monthlyTax      = Math.round(monthlyIncome * totalTaxRate);
  const monthlyTakeHome = monthlyIncome - monthlyTax;

  // 年間計算
  const annualIncome   = monthlyIncome * 12;
  const annualTax      = monthlyTax * 12;
  const annualTakeHome = monthlyTakeHome * 12;

  // 確定申告要否（副業所得20万円ルール）
  // 年間所得が20万円超 → 要申告
  // 年間所得が20万円以下 → 原則不要（ただし住民税は申告必要）
  let judgmentClass = '';
  let judgmentText  = '';
  let judgmentNote  = '';

  if (annualIncome > 200000) {
    judgmentClass = 'required';
    judgmentText  = '確定申告が必要です';
    judgmentNote  = `年間副業所得が ${fmt(annualIncome)}（20万円超）のため、\n確定申告が必要です。`;
  } else if (annualIncome > 0) {
    judgmentClass = 'check';
    judgmentText  = '原則不要（住民税に注意）';
    judgmentNote  = `年間副業所得が ${fmt(annualIncome)}（20万円以下）のため、\n所得税の確定申告は原則不要です。\nただし住民税の申告が必要な場合があります。`;
  } else {
    judgmentClass = 'not-required';
    judgmentText  = '申告の必要なし';
    judgmentNote  = '副業所得が0円のため申告不要です。';
  }

  // DOM更新
  document.getElementById('monthlyIncome').textContent   = fmt(monthlyIncome);
  document.getElementById('monthlyTax').textContent      = fmt(monthlyTax);
  document.getElementById('monthlyTakeHome').textContent = fmt(monthlyTakeHome);
  document.getElementById('annualIncome').textContent    = fmt(annualIncome);
  document.getElementById('annualTax').textContent       = fmt(annualTax);
  document.getElementById('annualTakeHome').textContent  = fmt(annualTakeHome);

  const judgmentBox = document.getElementById('judgmentBox');
  judgmentBox.className = `judgment ${judgmentClass}`;
  document.getElementById('judgmentResult').textContent = judgmentText;
  document.getElementById('judgmentNote').textContent   = judgmentNote;

  resultCard.style.display = 'block';

  // 履歴保存
  saveHistory({
    date: now(),
    monthlyRevenue,
    monthlyExpense,
    monthlyTakeHome,
    annualTakeHome,
    judgment: judgmentText
  });
  renderHistory();
}

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

function now() {
  const d = new Date();
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function saveHistory(entry) {
  const list = loadHistory();
  list.unshift(entry);
  if (list.length > 20) list.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function clearHistory() {
  if (!confirm('履歴を全て削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function renderHistory() {
  const list = loadHistory();
  const ul = document.getElementById('historyList');
  if (list.length === 0) {
    ul.innerHTML = '<li class="no-history">履歴はありません</li>';
    return;
  }
  ul.innerHTML = list.map(e => `
    <li class="history-item">
      <div class="h-date">${e.date}</div>
      <div class="h-main">月収 ¥${e.monthlyRevenue.toLocaleString()} / 経費 ¥${e.monthlyExpense.toLocaleString()} → 月手取り +${fmt(e.monthlyTakeHome)}</div>
      <div class="h-sub">年間手取り増加 ${fmt(e.annualTakeHome)} ／ ${e.judgment}</div>
    </li>
  `).join('');
}

// 初期化
renderHistory();
