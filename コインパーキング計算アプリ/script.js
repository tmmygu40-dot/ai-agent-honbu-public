'use strict';

const entryTimeInput = document.getElementById('entryTime');
const setNowBtn = document.getElementById('setNowBtn');
const freeMinutesInput = document.getElementById('freeMinutes');
const unitMinutesInput = document.getElementById('unitMinutes');
const unitFeeInput = document.getElementById('unitFee');
const maxFeeInput = document.getElementById('maxFee');
const currentFeeEl = document.getElementById('currentFee');
const parkingTimeEl = document.getElementById('parkingTime');
const freeTimeLeftEl = document.getElementById('freeTimeLeft');
const freeTimeBox = document.getElementById('freeTimeBox');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

let timer = null;
let running = false;

// ---- localStorage ----
function save() {
  localStorage.setItem('cp_entryTime', entryTimeInput.value);
  localStorage.setItem('cp_freeMinutes', freeMinutesInput.value);
  localStorage.setItem('cp_unitMinutes', unitMinutesInput.value);
  localStorage.setItem('cp_unitFee', unitFeeInput.value);
  localStorage.setItem('cp_maxFee', maxFeeInput.value);
}

function load() {
  const et = localStorage.getItem('cp_entryTime');
  if (et) entryTimeInput.value = et;
  const fm = localStorage.getItem('cp_freeMinutes');
  if (fm !== null) freeMinutesInput.value = fm;
  const um = localStorage.getItem('cp_unitMinutes');
  if (um !== null) unitMinutesInput.value = um;
  const uf = localStorage.getItem('cp_unitFee');
  if (uf !== null) unitFeeInput.value = uf;
  const mf = localStorage.getItem('cp_maxFee');
  if (mf !== null) maxFeeInput.value = mf;
}

// ---- 時刻を "HH:MM" から今日の Date に変換 ----
function entryToDate(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  // 入庫時刻が現在より未来（日をまたいだ場合）は前日扱い
  if (d > now) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// ---- 料金計算 ----
function calcFee(elapsedMin, freeMin, unitMin, unitFee, maxFee) {
  if (elapsedMin <= freeMin) return 0;
  const chargeMin = elapsedMin - freeMin;
  const units = Math.ceil(chargeMin / unitMin);
  const fee = units * unitFee;
  if (maxFee > 0) return Math.min(fee, maxFee);
  return fee;
}

// ---- 分 → "X時間Y分" ----
function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

// ---- 表示更新 ----
function updateDisplay() {
  const entryDate = entryToDate(entryTimeInput.value);
  if (!entryDate) {
    currentFeeEl.textContent = '--';
    parkingTimeEl.textContent = '--';
    freeTimeLeftEl.textContent = '--';
    return;
  }

  const now = new Date();
  const elapsedSec = Math.floor((now - entryDate) / 1000);
  if (elapsedSec < 0) {
    currentFeeEl.textContent = '--';
    parkingTimeEl.textContent = '---';
    freeTimeLeftEl.textContent = '--';
    return;
  }

  const elapsedMin = elapsedSec / 60;
  const freeMin = parseFloat(freeMinutesInput.value) || 0;
  const unitMin = parseFloat(unitMinutesInput.value) || 30;
  const unitFee = parseFloat(unitFeeInput.value) || 100;
  const maxFee = parseFloat(maxFeeInput.value) || 0;

  const fee = calcFee(elapsedMin, freeMin, unitMin, unitFee, maxFee);

  // 料金表示
  const isMaxed = maxFee > 0 && fee >= maxFee;
  currentFeeEl.textContent = `¥${fee.toLocaleString()}${isMaxed ? '（上限）' : ''}`;

  // 駐車時間
  parkingTimeEl.textContent = formatMin(elapsedMin);

  // 残り無料時間
  if (freeMin > 0) {
    freeTimeBox.style.display = '';
    const remainFreeMin = freeMin - elapsedMin;
    if (remainFreeMin > 0) {
      freeTimeLeftEl.textContent = formatMin(remainFreeMin);
      freeTimeLeftEl.classList.remove('over');
      freeTimeBox.classList.remove('over');
    } else {
      freeTimeLeftEl.textContent = `超過 ${formatMin(-remainFreeMin)}`;
      freeTimeLeftEl.classList.add('over');
      freeTimeBox.classList.add('over');
    }
  } else {
    freeTimeBox.style.display = 'none';
  }
}

// ---- ボタン操作 ----
setNowBtn.addEventListener('click', () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  entryTimeInput.value = `${hh}:${mm}`;
  save();
  if (running) updateDisplay();
});

startBtn.addEventListener('click', () => {
  if (!running) {
    if (!entryTimeInput.value) {
      alert('入庫時刻を入力してください');
      return;
    }
    save();
    running = true;
    startBtn.textContent = '計算停止';
    startBtn.classList.add('running');
    updateDisplay();
    timer = setInterval(updateDisplay, 1000);
  } else {
    clearInterval(timer);
    timer = null;
    running = false;
    startBtn.textContent = '計算開始';
    startBtn.classList.remove('running');
  }
});

resetBtn.addEventListener('click', () => {
  if (running) {
    clearInterval(timer);
    timer = null;
    running = false;
    startBtn.textContent = '計算開始';
    startBtn.classList.remove('running');
  }
  entryTimeInput.value = '';
  currentFeeEl.textContent = '--';
  parkingTimeEl.textContent = '--';
  freeTimeLeftEl.textContent = '--';
  freeTimeLeftEl.classList.remove('over');
  freeTimeBox.classList.remove('over');
  localStorage.removeItem('cp_entryTime');
});

// 設定変更時に保存
[freeMinutesInput, unitMinutesInput, unitFeeInput, maxFeeInput].forEach(el => {
  el.addEventListener('change', () => {
    save();
    if (running) updateDisplay();
  });
});

// ---- 初期化 ----
load();
// 無料時間が0の場合は無料時間ボックスを非表示
if (!freeMinutesInput.value || parseFloat(freeMinutesInput.value) === 0) {
  freeTimeBox.style.display = 'none';
}
