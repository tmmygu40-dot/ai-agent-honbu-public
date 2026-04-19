// プリセット家電データ
const PRESETS = [
  { name: '冷蔵庫', watt: 150 },
  { name: 'スマホ充電', watt: 20 },
  { name: 'LED照明', watt: 10 },
  { name: 'ノートPC', watt: 65 },
  { name: '電気毛布', watt: 100 },
  { name: '扇風機', watt: 30 },
  { name: 'テレビ(32型)', watt: 100 },
  { name: 'ポット', watt: 900 },
  { name: '電子レンジ', watt: 1000 },
  { name: 'ドライヤー', watt: 1200 },
];

let appliances = [];

// 初期化
function init() {
  loadFromStorage();
  renderPresets();
  renderList();
  calcResult();
}

// プリセットボタン生成
function renderPresets() {
  const container = document.getElementById('presetButtons');
  container.innerHTML = '';
  PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = `${p.name} (${p.watt}W)`;
    btn.onclick = () => fillPreset(p);
    container.appendChild(btn);
  });
}

// プリセット選択
function fillPreset(preset) {
  document.getElementById('appName').value = preset.name;
  document.getElementById('appWatt').value = preset.watt;
  document.getElementById('appCount').value = 1;
  document.getElementById('appName').focus();
}

// 家電追加
function addAppliance() {
  const name = document.getElementById('appName').value.trim();
  const watt = parseFloat(document.getElementById('appWatt').value);
  const count = parseInt(document.getElementById('appCount').value) || 1;

  if (!name) {
    alert('家電名を入力してください');
    return;
  }
  if (!watt || watt <= 0) {
    alert('W数を入力してください');
    return;
  }

  appliances.push({ id: Date.now(), name, watt, count });
  saveToStorage();
  renderList();
  calcResult();

  // フォームクリア
  document.getElementById('appName').value = '';
  document.getElementById('appWatt').value = '';
  document.getElementById('appCount').value = 1;
  document.getElementById('appName').focus();
}

// 家電削除
function deleteAppliance(id) {
  appliances = appliances.filter(a => a.id !== id);
  saveToStorage();
  renderList();
  calcResult();
}

// リスト表示
function renderList() {
  const list = document.getElementById('applianceList');
  const totalRow = document.getElementById('totalRow');

  if (appliances.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ家電が登録されていません</p>';
    totalRow.style.display = 'none';
    return;
  }

  list.innerHTML = '';
  let total = 0;

  appliances.forEach(app => {
    const subtotal = app.watt * app.count;
    total += subtotal;

    const item = document.createElement('div');
    item.className = 'appliance-item';
    item.innerHTML = `
      <span class="app-name">${escapeHtml(app.name)}</span>
      <span class="app-detail">${app.watt}W × ${app.count}台</span>
      <span class="app-watt-total">${subtotal}W</span>
      <button class="delete-btn" onclick="deleteAppliance(${app.id})" title="削除">✕</button>
    `;
    list.appendChild(item);
  });

  totalRow.style.display = 'flex';
  document.getElementById('totalWatt').textContent = `${total} W`;
}

// 結果計算・表示
function calcResult() {
  const resultArea = document.getElementById('resultArea');
  const capacityInput = document.getElementById('capacity');
  const efficiencyInput = document.getElementById('efficiency');

  // 電源容量・効率が変わったら保存
  saveSettingsToStorage();

  const capacity = parseFloat(capacityInput.value);
  const efficiency = parseFloat(efficiencyInput.value) / 100;

  if (appliances.length === 0 || !capacity || capacity <= 0) {
    resultArea.innerHTML = '<p class="empty-msg">家電と電源容量を入力すると表示されます</p>';
    return;
  }

  const totalWatt = appliances.reduce((sum, a) => sum + a.watt * a.count, 0);
  const effectiveWh = capacity * efficiency;
  const hours = effectiveWh / totalWatt;
  const hoursInt = Math.floor(hours);
  const minutesInt = Math.round((hours - hoursInt) * 60);

  // 残量チェック用メッセージ
  let statusColor = '#27ae60';
  let statusMsg = '余裕あり';
  if (hours < 4) {
    statusColor = '#e74c3c';
    statusMsg = '短時間の使用に限定を';
  } else if (hours < 8) {
    statusColor = '#e67e22';
    statusMsg = '節電しながら使用';
  }

  resultArea.innerHTML = `
    <div class="result-grid">
      <div class="result-item">
        <span class="result-label">合計消費電力</span>
        <span><span class="result-value">${totalWatt}</span><span class="result-unit">W</span></span>
      </div>
      <div class="result-item">
        <span class="result-label">有効電力量（効率考慮）</span>
        <span><span class="result-value">${Math.round(effectiveWh)}</span><span class="result-unit">Wh</span></span>
      </div>
      <div class="result-item">
        <span class="result-label">稼働可能時間</span>
        <span><span class="result-value" style="color:${statusColor}">${hoursInt}時間${minutesInt}分</span></span>
      </div>
      <div class="result-item">
        <span class="result-label">目安</span>
        <span style="color:${statusColor};font-weight:bold;">${statusMsg}</span>
      </div>
    </div>
    <p class="result-note">※ 変換効率 ${Math.round(efficiency * 100)}% を考慮。実際の使用状況により異なります。</p>
  `;
}

// リセット
function clearAll() {
  if (!confirm('すべての家電データをリセットしますか？')) return;
  appliances = [];
  document.getElementById('capacity').value = '';
  document.getElementById('efficiency').value = 85;
  saveToStorage();
  renderList();
  calcResult();
}

// XSS対策
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

// localStorage
function saveToStorage() {
  localStorage.setItem('denryoku_appliances', JSON.stringify(appliances));
}

function saveSettingsToStorage() {
  const capacity = document.getElementById('capacity').value;
  const efficiency = document.getElementById('efficiency').value;
  localStorage.setItem('denryoku_capacity', capacity);
  localStorage.setItem('denryoku_efficiency', efficiency);
}

function loadFromStorage() {
  const saved = localStorage.getItem('denryoku_appliances');
  if (saved) {
    try { appliances = JSON.parse(saved); } catch(e) { appliances = []; }
  }
  const cap = localStorage.getItem('denryoku_capacity');
  const eff = localStorage.getItem('denryoku_efficiency');
  if (cap) document.getElementById('capacity').value = cap;
  if (eff) document.getElementById('efficiency').value = eff;
}

// 入力変更で即計算
document.addEventListener('DOMContentLoaded', () => {
  init();
  document.getElementById('capacity').addEventListener('input', calcResult);
  document.getElementById('efficiency').addEventListener('input', calcResult);
});

// Enterキーで追加
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (
    e.target.id === 'appName' ||
    e.target.id === 'appWatt' ||
    e.target.id === 'appCount'
  )) {
    addAppliance();
  }
});
