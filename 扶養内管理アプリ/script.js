'use strict';

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const STORAGE_KEY = 'fuyonai_data';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatYen(n) {
  return n.toLocaleString('ja-JP') + ' 円';
}

// 月別グリッド生成
function buildMonthGrid() {
  const grid = document.getElementById('monthGrid');
  grid.innerHTML = '';
  const data = loadData();
  const monthData = data.monthIncome || {};

  MONTHS.forEach((label, i) => {
    const div = document.createElement('div');
    div.className = 'month-item';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.placeholder = '0';
    inp.min = '0';
    inp.id = 'month_' + i;
    inp.value = monthData[i] || '';

    inp.addEventListener('input', () => {
      updateMonthTotal();
      saveMonthData();
    });

    div.appendChild(lbl);
    div.appendChild(inp);
    grid.appendChild(div);
  });

  updateMonthTotal();
}

function updateMonthTotal() {
  let total = 0;
  MONTHS.forEach((_, i) => {
    const v = parseFloat(document.getElementById('month_' + i).value) || 0;
    total += v;
  });
  document.getElementById('monthTotal').textContent = total.toLocaleString('ja-JP');
}

function saveMonthData() {
  const data = loadData();
  const monthIncome = {};
  MONTHS.forEach((_, i) => {
    const v = parseFloat(document.getElementById('month_' + i).value) || 0;
    if (v > 0) monthIncome[i] = v;
  });
  data.monthIncome = monthIncome;
  saveData(data);
}

// 基本設定の保存・読み込み
function restoreSettings() {
  const data = loadData();
  const s = data.settings || {};

  if (s.limitPreset) {
    document.getElementById('limitPreset').value = s.limitPreset;
    toggleCustomLimit();
  }
  if (s.customLimit) document.getElementById('customLimit').value = s.customLimit;
  if (s.earned) document.getElementById('earned').value = s.earned;
  if (s.hourlyWage) document.getElementById('hourlyWage').value = s.hourlyWage;
  if (s.hoursPerShift) document.getElementById('hoursPerShift').value = s.hoursPerShift;
}

function saveSettings() {
  const data = loadData();
  data.settings = {
    limitPreset: document.getElementById('limitPreset').value,
    customLimit: document.getElementById('customLimit').value,
    earned: document.getElementById('earned').value,
    hourlyWage: document.getElementById('hourlyWage').value,
    hoursPerShift: document.getElementById('hoursPerShift').value,
  };
  saveData(data);
}

function toggleCustomLimit() {
  const isCustom = document.getElementById('limitPreset').value === 'custom';
  document.getElementById('customLimitRow').style.display = isCustom ? 'flex' : 'none';
}

function getLimit() {
  const preset = document.getElementById('limitPreset').value;
  if (preset === 'custom') {
    return parseFloat(document.getElementById('customLimit').value) || 0;
  }
  return parseFloat(preset) || 0;
}

// 計算実行
function calculate() {
  const limit = getLimit();
  const earned = parseFloat(document.getElementById('earned').value) || 0;
  const wage = parseFloat(document.getElementById('hourlyWage').value) || 0;
  const hours = parseFloat(document.getElementById('hoursPerShift').value) || 0;

  const remain = limit - earned;
  const shifts = (wage > 0 && hours > 0) ? Math.floor(remain / (wage * hours)) : null;
  const percent = limit > 0 ? Math.min((earned / limit) * 100, 100) : 0;

  // 結果表示
  document.getElementById('resLimit').textContent = formatYen(limit);
  document.getElementById('resEarned').textContent = formatYen(earned);
  document.getElementById('resRemain').textContent = remain >= 0 ? formatYen(remain) : '超過！';
  document.getElementById('resShifts').textContent = shifts !== null ? (remain >= 0 ? shifts + ' 回' : '0 回') : '―';

  // プログレスバー
  const fill = document.getElementById('progressFill');
  fill.style.width = percent + '%';
  fill.className = 'progress-fill';
  if (percent >= 100) fill.classList.add('danger');
  else if (percent >= 80) fill.classList.add('warning');

  document.getElementById('progressPercent').textContent = percent.toFixed(1) + '%';

  // 警告
  const warningArea = document.getElementById('warningArea');
  if (remain < 0) {
    warningArea.style.display = 'block';
    warningArea.className = 'warning danger';
    warningArea.textContent = '⚠️ 扶養上限を超過しています！ 超過額：' + formatYen(Math.abs(remain));
  } else if (percent >= 90) {
    warningArea.style.display = 'block';
    warningArea.className = 'warning';
    warningArea.textContent = '⚠️ 上限まで残り少なくなっています。シフトの調整を検討してください。';
  } else {
    warningArea.style.display = 'none';
  }

  document.getElementById('resultSection').style.display = 'block';
  saveSettings();
}

// 月別合計を反映
document.getElementById('loadMonthBtn').addEventListener('click', () => {
  let total = 0;
  MONTHS.forEach((_, i) => {
    total += parseFloat(document.getElementById('month_' + i).value) || 0;
  });
  document.getElementById('earned').value = total;
});

document.getElementById('calcBtn').addEventListener('click', calculate);

document.getElementById('limitPreset').addEventListener('change', () => {
  toggleCustomLimit();
});

// 初期化
restoreSettings();
buildMonthGrid();

// 前回の設定があれば自動計算
const initData = loadData();
if (initData.settings && initData.settings.earned) {
  calculate();
}
