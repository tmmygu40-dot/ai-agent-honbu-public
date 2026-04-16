const STORAGE_KEY = 'growth_records';
let records = [];
let activeType = 'height';

function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    records = data ? JSON.parse(data) : [];
  } catch (e) {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord() {
  const dateEl = document.getElementById('date');
  const heightEl = document.getElementById('height');
  const weightEl = document.getElementById('weight');

  const date = dateEl.value;
  const height = parseFloat(heightEl.value);
  const weight = parseFloat(weightEl.value);

  if (!date) { alert('日付を入力してください'); return; }
  if (isNaN(height) && isNaN(weight)) { alert('身長か体重を入力してください'); return; }

  records.push({
    id: Date.now(),
    date,
    height: isNaN(height) ? null : height,
    weight: isNaN(weight) ? null : weight
  });

  records.sort((a, b) => a.date.localeCompare(b.date));
  saveRecords();
  renderList();
  drawChart();

  dateEl.value = '';
  heightEl.value = '';
  weightEl.value = '';
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderList();
  drawChart();
}

function renderList() {
  const container = document.getElementById('recordList');
  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">記録がまだありません</p>';
    return;
  }

  const sorted = [...records].reverse();
  container.innerHTML = sorted.map(r => {
    const heightStr = r.height !== null ? `<span class="record-height">身長 ${r.height} cm</span>` : '';
    const weightStr = r.weight !== null ? `<span class="record-weight">体重 ${r.weight} kg</span>` : '';
    return `
      <div class="record-item">
        <div class="record-info">
          <span class="record-date">${formatDate(r.date)}</span>
          <div class="record-values">${heightStr}${weightStr}</div>
        </div>
        <button class="btn-delete" onclick="deleteRecord(${r.id})" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function drawChart() {
  const canvas = document.getElementById('growthChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const data = records
    .filter(r => r[activeType] !== null)
    .map(r => ({ date: r.date, value: r[activeType] }));

  if (data.length < 2) {
    ctx.fillStyle = '#bbb';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('記録が2件以上になるとグラフが表示されます', W / 2, H / 2);
    return;
  }

  const pad = { top: 30, right: 30, bottom: 50, left: 55 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const values = data.map(d => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;
  const vMin = Math.floor((minV - rangeV * 0.1) * 10) / 10;
  const vMax = Math.ceil((maxV + rangeV * 0.1) * 10) / 10;
  const vRange = vMax - vMin || 1;

  const toX = (i) => pad.left + (i / (data.length - 1)) * chartW;
  const toY = (v) => pad.top + chartH - ((v - vMin) / vRange) * chartH;

  // grid lines
  ctx.strokeStyle = '#e8edf2';
  ctx.lineWidth = 1;
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const y = pad.top + (i / gridCount) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();

    const label = (vMax - (vRange * i / gridCount)).toFixed(1);
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, pad.left - 6, y + 4);
  }

  // unit label
  const unit = activeType === 'height' ? 'cm' : 'kg';
  ctx.fillStyle = '#aaa';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(unit, 4, pad.top - 8);

  // line
  const color = activeType === 'height' ? '#4a90d9' : '#e0804a';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = toX(i);
    const y = toY(d.value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // dots and x labels
  data.forEach((d, i) => {
    const x = toX(i);
    const y = toY(d.value);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // value label above dot
    ctx.fillStyle = color;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.value, x, y - 10);

    // x-axis date label (show only if not too crowded)
    if (data.length <= 12 || i % Math.ceil(data.length / 12) === 0) {
      const [, m, day] = d.date.split('-');
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${parseInt(m)}/${parseInt(day)}`, x, H - pad.bottom + 16);
    }
  });

  // axes
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeType = btn.dataset.type;
    drawChart();
  });
});

document.getElementById('addBtn').addEventListener('click', addRecord);

// Set today as default date
document.getElementById('date').value = new Date().toISOString().split('T')[0];

loadRecords();
renderList();
drawChart();
