const STORAGE_KEY = 'weight_records';

const dateInput = document.getElementById('date');
const weightInput = document.getElementById('weight');
const addBtn = document.getElementById('addBtn');
const recordBody = document.getElementById('recordBody');
const recordTable = document.getElementById('recordTable');
const emptyMsg = document.getElementById('emptyMsg');
const graphSection = document.getElementById('graphSection');
const canvas = document.getElementById('chart');

// 今日の日付をデフォルトに設定
dateInput.value = new Date().toISOString().split('T')[0];

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function render() {
  const records = loadRecords();
  // 日付順（新しい順）で表示
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  recordBody.innerHTML = '';

  if (sorted.length === 0) {
    emptyMsg.style.display = 'block';
    recordTable.style.display = 'none';
    graphSection.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  recordTable.style.display = 'table';
  graphSection.style.display = 'block';

  sorted.forEach(rec => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(rec.date)}</td>
      <td>${parseFloat(rec.weight).toFixed(1)} kg</td>
      <td><button class="del-btn" data-id="${rec.id}">削除</button></td>
    `;
    recordBody.appendChild(tr);
  });

  drawChart(records);
}

function drawChart(records) {
  if (records.length < 2) {
    graphSection.style.display = 'none';
    return;
  }

  graphSection.style.display = 'block';

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sorted.map(r => parseFloat(r.weight));
  const labels = sorted.map(r => r.date.slice(5)); // MM-DD

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth - 40;
  const H = 200;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  ctx.clearRect(0, 0, W, H);

  // 横グリッド線（4本）
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    // Y軸ラベル
    const val = maxW - (range / 4) * i;
    ctx.fillStyle = '#aaa';
    ctx.font = `${11 * dpr / dpr}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(1), pad.left - 6, y + 4);
  }

  // 折れ線
  const points = weights.map((w, i) => ({
    x: pad.left + (chartW / (weights.length - 1)) * i,
    y: pad.top + chartH - ((w - minW) / range) * chartH
  }));

  ctx.beginPath();
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // ドット
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4a90d9';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // X軸ラベル（間引き）
  const maxLabels = Math.floor(chartW / 50);
  const step = Math.ceil(labels.length / maxLabels);
  ctx.fillStyle = '#aaa';
  ctx.font = `${10}px sans-serif`;
  ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    if (i % step === 0 || i === labels.length - 1) {
      ctx.fillText(label, points[i].x, H - 8);
    }
  });
}

addBtn.addEventListener('click', () => {
  const date = dateInput.value.trim();
  const weight = parseFloat(weightInput.value);

  if (!date) {
    alert('日付を入力してください');
    return;
  }
  if (isNaN(weight) || weight <= 0) {
    alert('体重を正しく入力してください');
    return;
  }
  if (weight > 500) {
    alert('体重の値が大きすぎます');
    return;
  }

  const records = loadRecords();
  records.push({ id: Date.now(), date, weight });
  saveRecords(records);
  render();

  weightInput.value = '';
  weightInput.focus();
});

recordBody.addEventListener('click', e => {
  if (!e.target.classList.contains('del-btn')) return;
  const id = parseInt(e.target.dataset.id, 10);
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  render();
});

// Enterキーで記録
weightInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addBtn.click();
});

render();
