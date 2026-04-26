const STORAGE_KEY = 'setsudenDevices';

const PRIORITY_LABEL = { high: '高', mid: '中', low: '低' };
const PRIORITY_ORDER = { low: 0, mid: 1, high: 2 };

let devices = [];

function loadDevices() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    devices = data ? JSON.parse(data) : [];
  } catch (e) {
    devices = [];
  }
}

function saveDevices() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

function renderDeviceList() {
  const list = document.getElementById('device-list');
  const emptyMsg = document.getElementById('empty-msg');
  const totalInfo = document.getElementById('total-info');

  // 既存の設備アイテムを削除
  Array.from(list.querySelectorAll('.device-item')).forEach(el => el.remove());

  if (devices.length === 0) {
    emptyMsg.style.display = 'block';
    totalInfo.textContent = '';
    return;
  }

  emptyMsg.style.display = 'none';

  const totalWatt = devices.reduce((sum, d) => sum + d.watt, 0);
  totalInfo.textContent = `登録設備：${devices.length}台　合計消費電力：${totalWatt.toLocaleString()}W`;

  // 重要度・消費電力の降順で表示
  const sorted = [...devices].sort((a, b) => {
    if (PRIORITY_ORDER[b.priority] !== PRIORITY_ORDER[a.priority]) {
      return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    }
    return b.watt - a.watt;
  });

  sorted.forEach(device => {
    const li = createDeviceItem(device, false);
    list.appendChild(li);
  });
}

function createDeviceItem(device, isResult) {
  const li = document.createElement('li');
  li.className = `device-item priority-${device.priority}`;

  const info = document.createElement('div');
  info.className = 'device-info';

  const name = document.createElement('div');
  name.className = 'device-name';
  name.textContent = device.name;

  const meta = document.createElement('div');
  meta.className = 'device-meta';
  meta.textContent = `重要度：${PRIORITY_LABEL[device.priority]}`;

  info.appendChild(name);
  info.appendChild(meta);

  const watt = document.createElement('div');
  watt.className = 'device-watt';
  watt.textContent = `${device.watt.toLocaleString()}W`;

  li.appendChild(info);
  li.appendChild(watt);

  if (!isResult) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', () => deleteDevice(device.id));
    li.appendChild(delBtn);
  }

  return li;
}

function deleteDevice(id) {
  devices = devices.filter(d => d.id !== id);
  saveDevices();
  renderDeviceList();
  document.getElementById('result-section').style.display = 'none';
}

function addDevice() {
  const nameEl = document.getElementById('device-name');
  const wattEl = document.getElementById('device-watt');
  const priorityEl = document.getElementById('device-priority');

  const name = nameEl.value.trim();
  const watt = parseInt(wattEl.value, 10);
  const priority = priorityEl.value;

  if (!name) {
    alert('設備名を入力してください。');
    nameEl.focus();
    return;
  }
  if (!wattEl.value || isNaN(watt) || watt < 1) {
    alert('消費電力を正しく入力してください（1W以上）。');
    wattEl.focus();
    return;
  }

  const device = {
    id: Date.now(),
    name,
    watt,
    priority
  };

  devices.push(device);
  saveDevices();
  renderDeviceList();

  nameEl.value = '';
  wattEl.value = '';
  priorityEl.value = 'low';
  nameEl.focus();
}

function calcStopCandidates() {
  const targetEl = document.getElementById('target-watt');
  const target = parseInt(targetEl.value, 10);

  if (!targetEl.value || isNaN(target) || target < 1) {
    alert('削減目標（W）を正しく入力してください。');
    targetEl.focus();
    return;
  }

  if (devices.length === 0) {
    alert('設備が登録されていません。');
    return;
  }

  // 重要度が低い順→消費電力が高い順で並べて、貪欲に目標達成を試みる
  const candidates = [...devices].sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    return b.watt - a.watt;
  });

  // 目標達成できる組み合わせを貪欲法で選択（高重要度は使わない方向）
  let accumulated = 0;
  const selected = [];
  for (const d of candidates) {
    if (accumulated >= target) break;
    selected.push(d);
    accumulated += d.watt;
  }

  const resultSection = document.getElementById('result-section');
  const resultSummary = document.getElementById('result-summary');
  const resultList = document.getElementById('result-list');

  resultList.innerHTML = '';
  resultSection.style.display = 'block';

  if (selected.length === 0) {
    resultSummary.className = 'result-summary fail';
    resultSummary.textContent = '停止候補が見つかりませんでした。';
    return;
  }

  const totalWatt = devices.reduce((sum, d) => sum + d.watt, 0);

  if (accumulated >= target) {
    resultSummary.className = 'result-summary success';
    resultSummary.innerHTML = `
      ✅ 目標達成可能！<br>
      以下の設備を停止することで <strong>${accumulated.toLocaleString()}W</strong> 削減できます（目標：${target.toLocaleString()}W）。
    `;
  } else {
    resultSummary.className = 'result-summary warn';
    resultSummary.innerHTML = `
      ⚠️ 目標に届きません<br>
      全設備を停止しても <strong>${totalWatt.toLocaleString()}W</strong> しか削減できません（目標：${target.toLocaleString()}W）。<br>
      停止候補として重要度の低い設備を表示します。
    `;
  }

  selected.forEach(device => {
    const li = createDeviceItem(device, true);
    li.classList.add('highlight');
    resultList.appendChild(li);
  });

  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('add-btn').addEventListener('click', addDevice);
document.getElementById('calc-btn').addEventListener('click', calcStopCandidates);

document.getElementById('device-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('device-watt').focus();
});
document.getElementById('device-watt').addEventListener('keydown', e => {
  if (e.key === 'Enter') addDevice();
});

loadDevices();
renderDeviceList();
