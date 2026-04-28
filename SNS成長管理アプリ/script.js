// データ構造: { snsName: [{date, count}], ... }
const STORAGE_KEY = 'sns_growth_data';
const COLORS = ['#4a90d9','#e74c3c','#27ae60','#f39c12','#9b59b6','#1abc9c','#e67e22','#34495e'];

let data = {};
let activeSns = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : {};
  } catch (e) {
    data = {};
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getSnsNames() {
  return Object.keys(data);
}

function getColorForSns(name) {
  const names = getSnsNames();
  const idx = names.indexOf(name);
  return COLORS[idx % COLORS.length];
}

function getRecords(snsName) {
  return (data[snsName] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
}

function addRecord(snsName, count, date) {
  if (!data[snsName]) data[snsName] = [];
  data[snsName].push({ date, count: parseInt(count, 10) });
  save();
}

function deleteRecord(snsName, index) {
  const records = getRecords(snsName);
  const target = records[index];
  const orig = data[snsName];
  const origIdx = orig.findIndex(r => r.date === target.date && r.count === target.count);
  if (origIdx !== -1) orig.splice(origIdx, 1);
  if (orig.length === 0) {
    delete data[snsName];
    if (activeSns === snsName) activeSns = getSnsNames()[0] || null;
  }
  save();
}

function renderTabs() {
  const tabs = document.getElementById('tabs');
  const names = getSnsNames();
  tabs.innerHTML = '';
  if (names.length === 0) return;
  names.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (name === activeSns ? ' active' : '');
    btn.textContent = name;
    btn.addEventListener('click', () => {
      activeSns = name;
      render();
    });
    tabs.appendChild(btn);
  });
}

function drawChart(snsName) {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const PAD = { top: 20, right: 20, bottom: 50, left: 70 };
  ctx.clearRect(0, 0, W, H);

  const records = getRecords(snsName);
  if (records.length === 0) return;

  const counts = records.map(r => r.count);
  const minVal = Math.min(...counts);
  const maxVal = Math.max(...counts);
  const range = maxVal - minVal || 1;

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // グリッド線・Y軸ラベル
  ctx.strokeStyle = '#eee';
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const y = PAD.top + chartH - (i / steps) * chartH;
    const val = Math.round(minVal + (i / steps) * range);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();
    ctx.fillText(val.toLocaleString(), PAD.left - 6, y);
  }

  // X軸ラベル（日付）
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = records.length <= 8 ? 1 : Math.ceil(records.length / 8);
  records.forEach((r, i) => {
    if (i % step !== 0 && i !== records.length - 1) return;
    const x = PAD.left + (i / Math.max(records.length - 1, 1)) * chartW;
    const shortDate = r.date.slice(5); // MM-DD
    ctx.fillText(shortDate, x, PAD.top + chartH + 8);
  });

  // 折れ線
  const color = getColorForSns(snsName);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  records.forEach((r, i) => {
    const x = PAD.left + (i / Math.max(records.length - 1, 1)) * chartW;
    const y = PAD.top + chartH - ((r.count - minVal) / range) * chartH;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // データ点
  ctx.fillStyle = color;
  records.forEach((r, i) => {
    const x = PAD.left + (i / Math.max(records.length - 1, 1)) * chartW;
    const y = PAD.top + chartH - ((r.count - minVal) / range) * chartH;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderList(snsName) {
  const listArea = document.getElementById('listArea');
  const records = getRecords(snsName);

  if (records.length === 0) {
    listArea.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'record-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>日付</th>
        <th>フォロワー数</th>
        <th>前回比</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  // 新しい順に表示
  const reversed = records.slice().reverse();
  reversed.forEach((r, revIdx) => {
    const origIdx = records.length - 1 - revIdx;
    const prev = records[origIdx - 1];
    let growthHtml = '<span class="growth-flat">-</span>';
    if (prev) {
      const diff = r.count - prev.count;
      const pct = prev.count > 0 ? ((diff / prev.count) * 100).toFixed(1) : '0.0';
      if (diff > 0) {
        growthHtml = `<span class="growth-up">+${diff.toLocaleString()} (+${pct}%)</span>`;
      } else if (diff < 0) {
        growthHtml = `<span class="growth-down">${diff.toLocaleString()} (${pct}%)</span>`;
      } else {
        growthHtml = '<span class="growth-flat">±0</span>';
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.count.toLocaleString()}</td>
      <td>${growthHtml}</td>
      <td><button class="delete-btn" data-idx="${origIdx}">削除</button></td>
    `;
    tbody.appendChild(tr);
  });

  listArea.innerHTML = '';
  listArea.appendChild(table);

  table.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      deleteRecord(snsName, idx);
      render();
    });
  });
}

function render() {
  const names = getSnsNames();
  renderTabs();

  const tabSection = document.getElementById('tabSection');
  const graphArea = tabSection.querySelector('.graph-area');
  const listArea = document.getElementById('listArea');

  if (names.length === 0) {
    graphArea.innerHTML = '<p class="no-data-msg">SNSを追加してください</p>';
    listArea.innerHTML = '';
    document.getElementById('tabs').innerHTML = '';
    return;
  }

  // graph-area を canvas に戻す
  if (!document.getElementById('chart')) {
    graphArea.innerHTML = '<canvas id="chart" width="600" height="250"></canvas>';
  }

  if (!activeSns || !data[activeSns]) {
    activeSns = names[0];
  }

  drawChart(activeSns);
  renderList(activeSns);
}

function showMsg(text, isError) {
  const el = document.getElementById('msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'msg-area ' + (isError ? 'msg-error' : 'msg-ok');
}

// フォーム送信
document.getElementById('addBtn').addEventListener('click', () => {
  const snsName = document.getElementById('snsName').value.trim();
  const count = document.getElementById('followerCount').value;
  const date = document.getElementById('recordDate').value;

  if (!snsName || !count || !date) {
    showMsg('SNS名・フォロワー数・日付をすべて入力してください', true);
    return;
  }
  if (parseInt(count, 10) < 0) {
    showMsg('フォロワー数は0以上を入力してください', true);
    return;
  }
  showMsg('記録を追加しました', false);

  const wasEmpty = getSnsNames().length === 0;
  addRecord(snsName, count, date);
  if (wasEmpty || !activeSns) activeSns = snsName;
  else if (snsName) activeSns = snsName;

  document.getElementById('snsName').value = '';
  document.getElementById('followerCount').value = '';
  document.getElementById('recordDate').value = '';

  render();
});

// 初期化
load();
// アクティブSNSを先頭に
if (getSnsNames().length > 0) activeSns = getSnsNames()[0];

// 今日の日付をデフォルトセット
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
document.getElementById('recordDate').value = `${yyyy}-${mm}-${dd}`;

render();
