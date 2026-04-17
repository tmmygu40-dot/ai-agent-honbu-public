const STORAGE_KEY = 'repair_vs_replace_history';

const calcBtn = document.getElementById('calcBtn');
const resultEl = document.getElementById('result');
const verdictEl = document.getElementById('verdict');
const repairAnnualEl = document.getElementById('repairAnnual');
const replaceAnnualEl = document.getElementById('replaceAnnual');
const diffTextEl = document.getElementById('diffText');
const historySectionEl = document.getElementById('historySection');
const historyListEl = document.getElementById('historyList');
const clearBtn = document.getElementById('clearBtn');

calcBtn.addEventListener('click', calculate);
clearBtn.addEventListener('click', clearHistory);

function calculate() {
  const repairCost = parseFloat(document.getElementById('repairCost').value);
  const repairLife = parseFloat(document.getElementById('repairLife').value);
  const replaceCost = parseFloat(document.getElementById('replaceCost').value);
  const replaceLife = parseFloat(document.getElementById('replaceLife').value);

  if (isNaN(repairCost) || isNaN(repairLife) || isNaN(replaceCost) || isNaN(replaceLife)) {
    alert('すべての項目を入力してください。');
    return;
  }
  if (repairLife <= 0 || replaceLife <= 0) {
    alert('年数は0より大きい値を入力してください。');
    return;
  }

  const repairAnnual = repairCost / repairLife;
  const replaceAnnual = replaceCost / replaceLife;
  const diff = Math.abs(repairAnnual - replaceAnnual);
  const diffPct = repairAnnual > 0 ? (diff / Math.min(repairAnnual, replaceAnnual)) * 100 : 0;

  let verdict, verdictClass, diffMsg;

  if (Math.abs(repairAnnual - replaceAnnual) < 1) {
    verdict = '🤝 ほぼ同じコスト';
    verdictClass = 'tie';
    diffMsg = '修理と買い替えのコストはほぼ同じです。';
  } else if (repairAnnual < replaceAnnual) {
    verdict = '🔧 修理の方がお得！';
    verdictClass = 'repair';
    diffMsg = `修理の方が年間 ${fmt(diff)} 円お得（約${Math.round(diffPct)}%安い）`;
  } else {
    verdict = '🛒 買い替えの方がお得！';
    verdictClass = 'replace';
    diffMsg = `買い替えの方が年間 ${fmt(diff)} 円お得（約${Math.round(diffPct)}%安い）`;
  }

  verdictEl.textContent = verdict;
  verdictEl.className = 'verdict ' + verdictClass;

  repairAnnualEl.className = 'cost-item repair-cost';
  repairAnnualEl.innerHTML = `🔧 修理<br><small>年間コスト</small><strong>${fmt(repairAnnual)} 円</strong>`;

  replaceAnnualEl.className = 'cost-item replace-cost';
  replaceAnnualEl.innerHTML = `🛒 買替<br><small>年間コスト</small><strong>${fmt(replaceAnnual)} 円</strong>`;

  diffTextEl.textContent = diffMsg;
  resultEl.style.display = 'block';
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  saveHistory({
    repairCost, repairLife, replaceCost, replaceLife,
    repairAnnual, replaceAnnual, verdict, verdictClass,
    date: new Date().toLocaleDateString('ja-JP')
  });
  renderHistory();
}

function fmt(n) {
  return Math.round(n).toLocaleString('ja-JP');
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 10) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    historySectionEl.style.display = 'none';
    return;
  }
  historySectionEl.style.display = 'block';
  historyListEl.innerHTML = history.map(h => `
    <li class="history-item h-${h.verdictClass}">
      <div class="h-verdict">${h.verdict}</div>
      <div class="h-detail">
        修理: ${fmt(h.repairCost)}円 / ${h.repairLife}年 → 年間${fmt(h.repairAnnual)}円 ／
        買替: ${fmt(h.replaceCost)}円 / ${h.replaceLife}年 → 年間${fmt(h.replaceAnnual)}円
        <span style="color:#cbd5e1"> （${h.date}）</span>
      </div>
    </li>
  `).join('');
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

renderHistory();
