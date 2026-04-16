const STORAGE_KEY = 'taion_records';
const FEVER_LINE = 37.5;

let records = [];

function load() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    records = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDatetime(date, time) {
  const d = new Date(date + 'T' + time);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${da} ${h}:${mi}`;
}

function addRecord() {
  const date = document.getElementById('input-date').value;
  const time = document.getElementById('input-time').value;
  const tempVal = document.getElementById('input-temp').value;
  const memo = document.getElementById('input-memo').value.trim();

  if (!date || !time || !tempVal) {
    alert('日付・時間・体温を入力してください。');
    return;
  }

  const temp = parseFloat(tempVal);
  if (isNaN(temp) || temp < 35.0 || temp > 42.0) {
    alert('体温は 35.0〜42.0 の範囲で入力してください。');
    return;
  }

  const record = {
    id: Date.now(),
    date,
    time,
    temp,
    memo
  };

  records.push(record);
  records.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  save();
  renderList();
  drawChart();

  document.getElementById('input-temp').value = '';
  document.getElementById('input-memo').value = '';
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  save();
  renderList();
  drawChart();
}

function renderList() {
  const list = document.getElementById('record-list');
  const count = document.getElementById('record-count');

  count.textContent = `（${records.length}件）`;

  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  const sorted = [...records].reverse();
  list.innerHTML = sorted.map(r => {
    const isFever = r.temp >= FEVER_LINE;
    const feverBadge = isFever ? '<span class="fever-badge">発熱</span>' : '';
    const memoText = r.memo ? `<span class="record-memo">— ${r.memo}</span>` : '';
    return `
      <div class="record-item ${isFever ? 'fever' : ''}">
        <div class="record-temp">${r.temp.toFixed(1)}℃</div>
        <div class="record-datetime">
          ${formatDatetime(r.date, r.time)}
          ${memoText}
        </div>
        ${feverBadge}
        <button class="btn-delete" onclick="deleteRecord(${r.id})" title="削除">✕</button>
      </div>
    `;
  }).join('');
}

function drawChart() {
  const canvas = document.getElementById('temp-chart');
  const ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const cssW = rect.width || 300;
  const cssH = 200;

  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.scale(dpr, dpr);

  const W = cssW;
  const H = cssH;
  const PAD = { top: 16, right: 20, bottom: 36, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  if (records.length === 0) {
    ctx.fillStyle = '#bbb';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('記録がありません', W / 2, H / 2);
    return;
  }

  const temps = records.map(r => r.temp);
  const rawMin = Math.min(...temps);
  const rawMax = Math.max(...temps);
  const minTemp = Math.min(rawMin - 0.3, FEVER_LINE - 1);
  const maxTemp = Math.max(rawMax + 0.3, FEVER_LINE + 0.5);
  const range = maxTemp - minTemp;

  function toX(i) {
    if (records.length === 1) return PAD.left + chartW / 2;
    return PAD.left + (i / (records.length - 1)) * chartW;
  }

  function toY(temp) {
    return PAD.top + chartH - ((temp - minTemp) / range) * chartH;
  }

  // 背景グリッド
  ctx.strokeStyle = '#e8ecf0';
  ctx.lineWidth = 1;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const t = minTemp + (range / steps) * i;
    const y = toY(t);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + chartW, y);
    ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(t.toFixed(1), PAD.left - 6, y + 4);
  }

  // 発熱ライン（37.5℃）
  const feverY = toY(FEVER_LINE);
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD.left, feverY);
  ctx.lineTo(PAD.left + chartW, feverY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#e74c3c';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('37.5℃', PAD.left + 2, feverY - 4);

  // 折れ線
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  records.forEach((r, i) => {
    const x = toX(i);
    const y = toY(r.temp);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 点
  records.forEach((r, i) => {
    const x = toX(i);
    const y = toY(r.temp);
    const isFever = r.temp >= FEVER_LINE;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = isFever ? '#e74c3c' : '#3498db';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // X軸ラベル（最初と最後）
  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';
  if (records.length > 0) {
    const first = records[0];
    ctx.textAlign = 'left';
    ctx.fillText(first.date.slice(5) + ' ' + first.time.slice(0, 5), PAD.left, H - 4);

    if (records.length > 1) {
      const last = records[records.length - 1];
      ctx.textAlign = 'right';
      ctx.fillText(last.date.slice(5) + ' ' + last.time.slice(0, 5), PAD.left + chartW, H - 4);
    }
  }
}

function setDefaultDatetime() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('input-date').value = `${y}-${mo}-${da}`;
  document.getElementById('input-time').value = `${h}:${mi}`;
}

document.getElementById('btn-add').addEventListener('click', addRecord);

window.addEventListener('resize', drawChart);

load();
setDefaultDatetime();
renderList();
drawChart();
