'use strict';

const STORAGE_KEY = 'energySavingDevices';

let devices = loadDevices();

const deviceNameEl = document.getElementById('deviceName');
const investmentCostEl = document.getElementById('investmentCost');
const annualEnergyCostEl = document.getElementById('annualEnergyCost');
const savingRateEl = document.getElementById('savingRate');
const previewEl = document.getElementById('preview');
const previewSavingEl = document.getElementById('previewSaving');
const previewPaybackEl = document.getElementById('previewPayback');
const btnAdd = document.getElementById('btnAdd');
const deviceListEl = document.getElementById('deviceList');
const countBadgeEl = document.getElementById('countBadge');

// リアルタイムプレビュー
[investmentCostEl, annualEnergyCostEl, savingRateEl].forEach(el => {
  el.addEventListener('input', updatePreview);
});

function calcMetrics(cost, energyCost, rate) {
  const annualSaving = energyCost * (rate / 100);
  const paybackYears = annualSaving > 0 ? cost / annualSaving : null;
  return { annualSaving, paybackYears };
}

function fmt(num) {
  return num.toLocaleString('ja-JP');
}

function updatePreview() {
  const cost = parseFloat(investmentCostEl.value);
  const energyCost = parseFloat(annualEnergyCostEl.value);
  const rate = parseFloat(savingRateEl.value);

  if (isNaN(cost) || isNaN(energyCost) || isNaN(rate) || rate <= 0 || energyCost <= 0) {
    previewEl.style.display = 'none';
    return;
  }

  const { annualSaving, paybackYears } = calcMetrics(cost, energyCost, rate);
  previewSavingEl.textContent = '¥' + fmt(Math.round(annualSaving)) + ' / 年';
  previewPaybackEl.textContent = paybackYears !== null
    ? paybackYears.toFixed(1) + ' 年'
    : '計算不可';
  previewEl.style.display = 'flex';
}

btnAdd.addEventListener('click', () => {
  const name = deviceNameEl.value.trim();
  const cost = parseFloat(investmentCostEl.value);
  const energyCost = parseFloat(annualEnergyCostEl.value);
  const rate = parseFloat(savingRateEl.value);

  if (!name) {
    alert('設備名を入力してください');
    deviceNameEl.focus();
    return;
  }
  if (isNaN(cost) || cost < 0) {
    alert('導入コストを正しく入力してください');
    investmentCostEl.focus();
    return;
  }
  if (isNaN(energyCost) || energyCost <= 0) {
    alert('年間エネルギー費を正しく入力してください');
    annualEnergyCostEl.focus();
    return;
  }
  if (isNaN(rate) || rate <= 0 || rate > 100) {
    alert('省エネ効果率を 0〜100 の範囲で入力してください');
    savingRateEl.focus();
    return;
  }

  const device = {
    id: Date.now(),
    name,
    investmentCost: cost,
    annualEnergyCost: energyCost,
    savingRate: rate
  };

  devices.push(device);
  saveDevices();
  renderList();

  deviceNameEl.value = '';
  investmentCostEl.value = '';
  annualEnergyCostEl.value = '';
  savingRateEl.value = '';
  previewEl.style.display = 'none';
  deviceNameEl.focus();
});

function deleteDevice(id) {
  devices = devices.filter(d => d.id !== id);
  saveDevices();
  renderList();
}

function paybackClass(years) {
  if (years === null) return '';
  if (years <= 5) return 'payback-good';
  if (years <= 10) return 'payback-mid';
  return 'payback-bad';
}

function renderList() {
  countBadgeEl.textContent = devices.length;

  if (devices.length === 0) {
    deviceListEl.innerHTML = '<p class="empty-msg">設備がまだ登録されていません</p>';
    return;
  }

  deviceListEl.innerHTML = devices.map(d => {
    const { annualSaving, paybackYears } = calcMetrics(d.investmentCost, d.annualEnergyCost, d.savingRate);
    const pb = paybackYears !== null ? paybackYears.toFixed(1) + ' 年' : '-';
    const pbClass = paybackClass(paybackYears);
    const energySaved = Math.round(d.annualEnergyCost * (d.savingRate / 100));
    const totalSaving10 = Math.round(annualSaving * 10);

    return `
      <div class="device-card">
        <div class="device-card-header">
          <span class="device-name">${escHtml(d.name)}</span>
          <button class="btn-delete" onclick="deleteDevice(${d.id})" title="削除">✕</button>
        </div>
        <div class="device-metrics">
          <div class="metric">
            <div class="metric-label">導入コスト</div>
            <div class="metric-value">¥${fmt(d.investmentCost)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">省エネ効果率</div>
            <div class="metric-value">${d.savingRate}%</div>
          </div>
          <div class="metric">
            <div class="metric-label">年間節約額</div>
            <div class="metric-value highlight">¥${fmt(energySaved)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">投資回収期間</div>
            <div class="metric-value highlight ${pbClass}">${pb}</div>
          </div>
          <div class="metric">
            <div class="metric-label">10年間の累計節約</div>
            <div class="metric-value">¥${fmt(totalSaving10)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">年間エネルギー費（現在）</div>
            <div class="metric-value">¥${fmt(d.annualEnergyCost)}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadDevices() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDevices() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

renderList();
