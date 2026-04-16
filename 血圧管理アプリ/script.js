const STORAGE_KEY = 'bp_records';

let records = [];

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    records = saved ? JSON.parse(saved) : [];
  } catch (e) {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function addRecord() {
  const dateEl = document.getElementById('date');
  const sysEl = document.getElementById('systolic');
  const diaEl = document.getElementById('diastolic');
  const pulEl = document.getElementById('pulse');

  const date = dateEl.value;
  const systolic = parseInt(sysEl.value, 10);
  const diastolic = parseInt(diaEl.value, 10);
  const pulse = parseInt(pulEl.value, 10);

  if (!date || isNaN(systolic) || isNaN(diastolic) || isNaN(pulse)) {
    alert('すべての項目を入力してください');
    return;
  }

  records.push({ id: Date.now(), date, systolic, diastolic, pulse });
  records.sort((a, b) => a.date.localeCompare(b.date));
  saveRecords();
  render();

  sysEl.value = '';
  diaEl.value = '';
  pulEl.value = '';
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
}

function renderList() {
  const list = document.getElementById('recordList');
  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  list.innerHTML = [...records].reverse().map(r => `
    <div class="record-item">
      <div class="record-info">
        <span class="record-date">${formatDate(r.date)}</span>
        <div class="record-values">
          <span class="val-s">上: ${r.systolic}</span>
          <span class="val-d">下: ${r.diastolic}</span>
          <span class="val-p">脈拍: ${r.pulse}</span>
        </div>
      </div>
      <button class="delete-btn" onclick="deleteRecord(${r.id})">削除</button>
    </div>
  `).join('');
}

function renderChart() {
  const canvas = document.getElementById('chart');
  const noDataMsg = document.getElementById('noDataMsg');
  const ctx = canvas.getContext('2d');

  if (records.length === 0) {
    canvas.style.display = 'none';
    noDataMsg.style.display = 'block';
    return;
  }

  noDataMsg.style.display = 'none';
  canvas.style.display = 'block';

  // レスポンシブサイズ設定
  const wrapper = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const cssW = wrapper.clientWidth || 600;
  const cssH = 220;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.scale(dpr, dpr);

  const W = cssW;
  const H = cssH;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 40;

  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  // 値域計算
  const allVals = records.flatMap(r => [r.systolic, r.diastolic, r.pulse]);
  const minVal = Math.max(0, Math.min(...allVals) - 10);
  const maxVal = Math.max(...allVals) + 10;
  const range = maxVal - minVal || 1;

  function xPos(i) {
    if (records.length === 1) return padLeft + chartW / 2;
    return padLeft + (i / (records.length - 1)) * chartW;
  }

  function yPos(val) {
    return padTop + chartH - ((val - minVal) / range) * chartH;
  }

  // 背景
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // グリッド線
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const y = padTop + (i / gridCount) * chartH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(W - padRight, y);
    ctx.stroke();

    // Y軸ラベル
    const val = Math.round(maxVal - (i / gridCount) * range);
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, padLeft - 4, y + 4);
  }

  // 折れ線を描く共通関数
  function drawLine(key, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    records.forEach((r, i) => {
      const x = xPos(i);
      const y = yPos(r[key]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 点
    ctx.fillStyle = color;
    records.forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(xPos(i), yPos(r[key]), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawLine('systolic', '#ef4444');
  drawLine('diastolic', '#3b82f6');
  drawLine('pulse', '#10b981');

  // X軸ラベル（間引き表示）
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const maxLabels = Math.floor(chartW / 48);
  const step = Math.max(1, Math.ceil(records.length / maxLabels));
  records.forEach((r, i) => {
    if (i % step !== 0 && i !== records.length - 1) return;
    const label = r.date.slice(5); // MM-DD
    ctx.fillText(label, xPos(i), H - padBottom + 18);
  });
}

function render() {
  renderList();
  renderChart();
}

// 今日の日付をデフォルト設定
function setTodayDate() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('date').value = `${y}-${m}-${d}`;
}

document.getElementById('addBtn').addEventListener('click', addRecord);

window.addEventListener('resize', () => {
  if (records.length > 0) renderChart();
});

loadRecords();
setTodayDate();
render();
