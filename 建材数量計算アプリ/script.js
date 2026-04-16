'use strict';

const areaWEl = document.getElementById('areaW');
const areaHEl = document.getElementById('areaH');
const areaManualEl = document.getElementById('areaManual');
const areaDisplayEl = document.getElementById('areaDisplay');
const matWEl = document.getElementById('matW');
const matHEl = document.getElementById('matH');
const lossRateEl = document.getElementById('lossRate');
const calcBtn = document.getElementById('calcBtn');
const resultCard = document.getElementById('resultCard');
const resAreaEl = document.getElementById('resArea');
const resMatAreaEl = document.getElementById('resMatArea');
const resBaseEl = document.getElementById('resBase');
const resTotalEl = document.getElementById('resTotal');
const resLossEl = document.getElementById('resLoss');
const saveBtn = document.getElementById('saveBtn');
const historyList = document.getElementById('historyList');
const clearBtn = document.getElementById('clearBtn');

let lastResult = null;

// 施工面積の表示更新
function updateAreaDisplay() {
  const w = parseFloat(areaWEl.value);
  const h = parseFloat(areaHEl.value);
  if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
    const area = w * h;
    areaDisplayEl.textContent = `= ${area.toFixed(2)} ㎡`;
    areaManualEl.value = '';
  } else {
    areaDisplayEl.textContent = '';
  }
}

areaWEl.addEventListener('input', updateAreaDisplay);
areaHEl.addEventListener('input', updateAreaDisplay);

areaManualEl.addEventListener('input', () => {
  if (areaManualEl.value) {
    areaWEl.value = '';
    areaHEl.value = '';
    areaDisplayEl.textContent = '';
  }
});

// 計算実行
calcBtn.addEventListener('click', () => {
  let area = 0;

  const w = parseFloat(areaWEl.value);
  const h = parseFloat(areaHEl.value);
  const manual = parseFloat(areaManualEl.value);

  if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
    area = w * h;
  } else if (!isNaN(manual) && manual > 0) {
    area = manual;
  } else {
    alert('施工面積を入力してください。');
    return;
  }

  const mw = parseFloat(matWEl.value);
  const mh = parseFloat(matHEl.value);
  if (isNaN(mw) || isNaN(mh) || mw <= 0 || mh <= 0) {
    alert('建材1枚のサイズを入力してください。');
    return;
  }

  const lossRate = parseFloat(lossRateEl.value);
  if (isNaN(lossRate) || lossRate < 0 || lossRate > 100) {
    alert('ロス率は0〜100の値を入力してください。');
    return;
  }

  const matArea = mw * mh;
  const baseCount = Math.ceil(area / matArea);
  const totalCount = Math.ceil(area * (1 + lossRate / 100) / matArea);
  const lossCount = totalCount - baseCount;

  resAreaEl.textContent = area.toFixed(2);
  resMatAreaEl.textContent = matArea.toFixed(4);
  resBaseEl.textContent = baseCount;
  resTotalEl.textContent = totalCount;
  resLossEl.textContent = lossCount;

  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  lastResult = { area, mw, mh, matArea, lossRate, baseCount, totalCount, lossCount };
});

// 履歴保存
saveBtn.addEventListener('click', () => {
  if (!lastResult) return;
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleString('ja-JP'),
    area: lastResult.area.toFixed(2),
    matSize: `${lastResult.mw}×${lastResult.mh}m`,
    lossRate: lastResult.lossRate,
    baseCount: lastResult.baseCount,
    totalCount: lastResult.totalCount,
  };
  history.unshift(entry);
  saveHistory(history);
  renderHistory();
  saveBtn.textContent = '保存しました！';
  setTimeout(() => { saveBtn.textContent = 'この結果を履歴に保存'; }, 1500);
});

// 履歴全削除
clearBtn.addEventListener('click', () => {
  if (!confirm('履歴をすべて削除しますか？')) return;
  saveHistory([]);
  renderHistory();
});

// localStorage
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('kenzan_history') || '[]');
  } catch {
    return [];
  }
}

function saveHistory(data) {
  localStorage.setItem('kenzan_history', JSON.stringify(data));
}

function renderHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<li class="empty-msg">まだ履歴がありません</li>';
    return;
  }
  historyList.innerHTML = history.map(e => `
    <li class="history-item">
      <div class="hi-main">必要枚数：${e.totalCount}枚（ロスなし ${e.baseCount}枚）</div>
      <div class="hi-sub">面積 ${e.area}㎡ / 建材 ${e.matSize} / ロス率 ${e.lossRate}%</div>
      <div class="hi-date">${e.date}</div>
    </li>
  `).join('');
}

// 初期化
renderHistory();
