// ===== データ管理 =====
let supplyItems = [];   // { id, name, stock, dailyUse }
let powerDevices = [];  // { id, name, watt, hoursPerDay }

// ===== 仕入れ停止 =====

function addSupplyItem() {
  const id = Date.now();
  supplyItems.push({ id, name: '', stock: '', dailyUse: '' });
  renderSupplyItems();
}

function removeSupplyItem(id) {
  supplyItems = supplyItems.filter(i => i.id !== id);
  renderSupplyItems();
  calcSupply();
  saveData();
}

function renderSupplyItems() {
  const container = document.getElementById('supply-items');
  if (supplyItems.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <div class="item-header">
      <span>品目名</span>
      <span>在庫数</span>
      <span>1日消費数</span>
      <span></span>
    </div>
  `;
  supplyItems.forEach(item => {
    html += `
      <div class="dynamic-item">
        <input type="text"   value="${escHtml(item.name)}"     placeholder="例：原材料A"  oninput="updateSupply(${item.id},'name',this.value)">
        <input type="number" value="${escHtml(item.stock)}"    placeholder="100" min="0"  oninput="updateSupply(${item.id},'stock',this.value)">
        <input type="number" value="${escHtml(item.dailyUse)}" placeholder="10"  min="0.01" step="0.01" oninput="updateSupply(${item.id},'dailyUse',this.value)">
        <button class="btn-remove" onclick="removeSupplyItem(${item.id})" title="削除">✕</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function updateSupply(id, field, value) {
  const item = supplyItems.find(i => i.id === id);
  if (item) item[field] = value;
  calcSupply();
  saveData();
}

function calcSupply() {
  const daysEl  = document.getElementById('supply-days');
  const detailEl = document.getElementById('supply-detail');
  const sumEl   = document.getElementById('sum-supply-val');

  if (supplyItems.length === 0) {
    daysEl.textContent  = '— 日';
    daysEl.className    = 'result-value';
    detailEl.textContent = '品目を追加してください';
    sumEl.textContent   = '—';
    return;
  }

  const details = [];
  let minDays = Infinity;

  supplyItems.forEach(item => {
    const stock    = parseFloat(item.stock)    || 0;
    const dailyUse = parseFloat(item.dailyUse) || 0;
    if (dailyUse <= 0) return;
    const days = Math.floor(stock / dailyUse);
    const label = item.name || '(未入力)';
    details.push(`${label}：${days}日`);
    if (days < minDays) minDays = days;
  });

  if (minDays === Infinity) {
    daysEl.textContent  = '— 日';
    daysEl.className    = 'result-value';
    detailEl.textContent = '1日消費数を入力してください';
    sumEl.textContent   = '—';
    return;
  }

  daysEl.textContent = `${minDays} 日`;
  daysEl.className   = 'result-value ' + riskClass(minDays);
  detailEl.textContent = details.join('　');
  sumEl.textContent   = `${minDays}日`;
}

// ===== 停電 =====

function addPowerDevice() {
  const id = Date.now();
  powerDevices.push({ id, name: '', watt: '', hoursPerDay: '' });
  renderPowerDevices();
}

function removePowerDevice(id) {
  powerDevices = powerDevices.filter(i => i.id !== id);
  renderPowerDevices();
  calcPower();
  saveData();
}

function renderPowerDevices() {
  const container = document.getElementById('power-devices');
  if (powerDevices.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <div class="item-header">
      <span>設備名</span>
      <span>消費電力(W)</span>
      <span>使用時間(h/日)</span>
      <span></span>
    </div>
  `;
  powerDevices.forEach(d => {
    html += `
      <div class="dynamic-item">
        <input type="text"   value="${escHtml(d.name)}"        placeholder="例：PC"   oninput="updatePowerDevice(${d.id},'name',this.value)">
        <input type="number" value="${escHtml(d.watt)}"        placeholder="100" min="0" oninput="updatePowerDevice(${d.id},'watt',this.value)">
        <input type="number" value="${escHtml(d.hoursPerDay)}" placeholder="8"   min="0" max="24" oninput="updatePowerDevice(${d.id},'hoursPerDay',this.value)">
        <button class="btn-remove" onclick="removePowerDevice(${d.id})" title="削除">✕</button>
      </div>
    `;
  });

  // 合算して上部入力欄へ反映
  const totalW  = powerDevices.reduce((s, d) => s + (parseFloat(d.watt) || 0), 0);
  const avgH    = powerDevices.length
    ? powerDevices.reduce((s, d) => s + (parseFloat(d.hoursPerDay) || 0), 0) / powerDevices.length
    : 0;

  container.innerHTML = html;

  if (totalW > 0) {
    document.getElementById('power-usage').value = totalW;
    document.getElementById('power-hours').value = avgH.toFixed(1);
  }
}

function updatePowerDevice(id, field, value) {
  const d = powerDevices.find(i => i.id === id);
  if (d) d[field] = value;
  renderPowerDevices(); // 合算更新
  calcPower();
  saveData();
}

function calcPower() {
  const battery = parseFloat(document.getElementById('power-battery').value) || 0;
  const usage   = parseFloat(document.getElementById('power-usage').value)   || 0;
  const hours   = parseFloat(document.getElementById('power-hours').value)   || 0;

  const daysEl   = document.getElementById('power-days');
  const detailEl = document.getElementById('power-detail');
  const sumEl    = document.getElementById('sum-power-val');

  if (battery <= 0 || usage <= 0 || hours <= 0) {
    daysEl.textContent   = '— 日';
    daysEl.className     = 'result-value';
    detailEl.textContent = '3つの値を入力してください';
    sumEl.textContent    = '—';
    return;
  }

  const totalHours = battery / usage;          // 使い続けた場合の時間
  const days       = Math.floor(totalHours / hours);
  const remHours   = Math.floor(totalHours % hours);

  daysEl.textContent   = `${days} 日`;
  daysEl.className     = 'result-value ' + riskClass(days);
  detailEl.textContent = `（合計 ${totalHours.toFixed(1)}時間 / 1日${hours}h使用）残り ${remHours}時間`;
  sumEl.textContent    = `${days}日`;
}

// ===== 人手不足 =====

function calcStaff() {
  const current = parseFloat(document.getElementById('staff-current').value)  || 0;
  const min     = parseFloat(document.getElementById('staff-min').value)       || 0;
  const maxDays = parseFloat(document.getElementById('staff-maxdays').value)   || 0;

  const daysEl   = document.getElementById('staff-days');
  const detailEl = document.getElementById('staff-detail');
  const sumEl    = document.getElementById('sum-staff-val');

  if (current <= 0 || min <= 0) {
    daysEl.textContent   = '— 日';
    daysEl.className     = 'result-value';
    detailEl.textContent = 'スタッフ数を入力してください';
    sumEl.textContent    = '—';
    return;
  }

  const surplus = current - min;

  if (surplus < 0) {
    daysEl.textContent   = '即日危機';
    daysEl.className     = 'result-value danger';
    detailEl.textContent = `現在 ${current}人 / 最低 ${min}人が必要 → ${Math.abs(surplus)}人不足`;
    sumEl.textContent    = '即日危機';
    saveData();
    return;
  }

  // 乗り切れる日数：余裕人数 × 最大連続勤務日数
  // ロジック：余裕スタッフを順次投入。各人がmaxDays勤務可能なら surplus × maxDays 日まで対応可
  let days;
  if (surplus === 0) {
    // 最低ラインで稼働中。1人でも欠けると即アウト → maxDays or 0
    days = maxDays > 0 ? maxDays : 0;
    detailEl.textContent = `余裕ゼロ。現在スタッフ全員 最大${maxDays}日継続勤務で乗り切れる目安`;
  } else {
    days = surplus * (maxDays || 5); // maxDays未入力なら5日と仮定
    const note = maxDays > 0 ? '' : '（連続勤務可能日数未入力のため5日と仮定）';
    detailEl.textContent = `余裕 ${surplus}人 × 最大${maxDays || 5}日 = ${days}日の目安${note}`;
  }

  daysEl.textContent = `${days} 日`;
  daysEl.className   = 'result-value ' + riskClass(days);
  sumEl.textContent  = `${days}日`;
  saveData();
}

// ===== ユーティリティ =====

function riskClass(days) {
  if (days <= 3)  return 'danger';
  if (days <= 7)  return 'warning';
  return 'safe';
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== localStorage =====

function saveData() {
  const data = {
    supplyItems,
    powerDevices,
    power: {
      battery: document.getElementById('power-battery').value,
      usage:   document.getElementById('power-usage').value,
      hours:   document.getElementById('power-hours').value,
    },
    staff: {
      current: document.getElementById('staff-current').value,
      min:     document.getElementById('staff-min').value,
      maxDays: document.getElementById('staff-maxdays').value,
    }
  };
  localStorage.setItem('jigyoKeizoku', JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem('jigyoKeizoku');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    supplyItems  = data.supplyItems  || [];
    powerDevices = data.powerDevices || [];

    if (data.power) {
      document.getElementById('power-battery').value = data.power.battery || '';
      document.getElementById('power-usage').value   = data.power.usage   || '';
      document.getElementById('power-hours').value   = data.power.hours   || '';
    }
    if (data.staff) {
      document.getElementById('staff-current').value = data.staff.current || '';
      document.getElementById('staff-min').value     = data.staff.min     || '';
      document.getElementById('staff-maxdays').value = data.staff.maxDays || '';
    }

    renderSupplyItems();
    renderPowerDevices();
    calcSupply();
    calcPower();
    calcStaff();
  } catch (e) {
    console.warn('データ読み込みエラー', e);
  }
}

function clearAll() {
  if (!confirm('すべての入力データをリセットしますか？')) return;
  supplyItems  = [];
  powerDevices = [];
  ['power-battery','power-usage','power-hours',
   'staff-current','staff-min','staff-maxdays'].forEach(id => {
    document.getElementById(id).value = '';
  });
  localStorage.removeItem('jigyoKeizoku');
  renderSupplyItems();
  renderPowerDevices();
  calcSupply();
  calcPower();
  calcStaff();
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', loadData);
