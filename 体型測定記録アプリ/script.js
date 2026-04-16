'use strict';

const STORAGE_KEY = 'body_measurements';

const PART_COLORS = {
  'ウエスト':   '#2c7a7b',
  'ヒップ':     '#e53e8a',
  'バスト':     '#d97706',
  '太もも':     '#6366f1',
  'ふくらはぎ': '#059669',
  '二の腕':     '#dc2626',
};

// --- データ管理 ---
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- UI 更新 ---
function renderList(filterPart) {
  const data = loadData();
  const list = document.getElementById('recordList');
  const emptyMsg = document.getElementById('emptyMsg');

  const filtered = filterPart === 'all'
    ? [...data]
    : data.filter(r => r.part === filterPart);

  // 日付降順
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  filtered.forEach(record => {
    const item = document.createElement('div');
    item.className = 'record-item';
    item.style.borderLeftColor = PART_COLORS[record.part] || '#2c7a7b';
    item.innerHTML = `
      <div class="record-info">
        <div class="record-date">${formatDate(record.date)}</div>
        <div class="record-main">
          <span class="record-part" style="background:${PART_COLORS[record.part]}22;color:${PART_COLORS[record.part]}">${record.part}</span>
          ${record.size} cm
        </div>
      </div>
      <button class="delete-btn" data-id="${record.id}" title="削除">×</button>
    `;
    list.appendChild(item);
  });

  // 削除ボタン
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('この記録を削除しますか？')) return;
      const id = Number(btn.dataset.id);
      const updated = loadData().filter(r => r.id !== id);
      saveData(updated);
      renderList(document.getElementById('filterPart').value);
      drawChart(document.getElementById('chartPart').value);
    });
  });
}

function drawChart(part) {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const noDataMsg = document.getElementById('noDataMsg');

  const data = loadData()
    .filter(r => r.part === part)
    .sort((a, b) => a.date.localeCompare(b.date));

  // canvasの実サイズをセット
  const wrapper = canvas.parentElement;
  canvas.width = wrapper.clientWidth || 600;
  canvas.height = 200;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (data.length === 0) {
    noDataMsg.classList.remove('hidden');
    return;
  }
  noDataMsg.classList.add('hidden');

  if (data.length === 1) {
    // 1件だけなら点で表示
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    ctx.fillStyle = PART_COLORS[part] || '#2c7a7b';
    ctx.beginPath();
    ctx.arc(W / 2, (H - pad.top - pad.bottom) / 2 + pad.top, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${data[0].size} cm`, W / 2, (H - pad.top - pad.bottom) / 2 + pad.top - 12);
    ctx.fillText(formatDate(data[0].date), W / 2, H - 10);
    return;
  }

  const W = canvas.width;
  const H = canvas.height;
  const pad = { top: 24, right: 20, bottom: 44, left: 52 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const sizes = data.map(d => d.size);
  const minVal = Math.min(...sizes);
  const maxVal = Math.max(...sizes);
  const range = maxVal - minVal || 1;

  const toX = i => pad.left + (i / (data.length - 1)) * chartW;
  const toY = v => pad.top + chartH - ((v - minVal) / range) * chartH;

  // グリッド線
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 1;
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const y = pad.top + (i / gridCount) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    // Y軸ラベル
    const val = maxVal - (i / gridCount) * range;
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(1), pad.left - 5, y + 4);
  }

  // 折れ線
  const color = PART_COLORS[part] || '#2c7a7b';
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  data.forEach((d, i) => {
    if (i === 0) ctx.moveTo(toX(i), toY(d.size));
    else ctx.lineTo(toX(i), toY(d.size));
  });
  ctx.stroke();

  // 塗りつぶしエリア
  ctx.beginPath();
  data.forEach((d, i) => {
    if (i === 0) ctx.moveTo(toX(i), toY(d.size));
    else ctx.lineTo(toX(i), toY(d.size));
  });
  ctx.lineTo(toX(data.length - 1), pad.top + chartH);
  ctx.lineTo(toX(0), pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = color + '22';
  ctx.fill();

  // データ点
  data.forEach((d, i) => {
    ctx.beginPath();
    ctx.arc(toX(i), toY(d.size), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 値ラベル
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.size.toFixed(1), toX(i), toY(d.size) - 9);
  });

  // X軸ラベル（日付 — 間引き）
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  const maxLabels = Math.floor(chartW / 60);
  const step = Math.max(1, Math.floor(data.length / maxLabels));
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      ctx.fillText(formatDateShort(d.date), toX(i), H - 6);
    }
  });
}

// --- ユーティリティ ---
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function formatDateShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- 初期化 ---
function init() {
  // 今日の日付をデフォルトにセット
  document.getElementById('date').value = todayStr();

  // 記録ボタン
  document.getElementById('addBtn').addEventListener('click', () => {
    const date = document.getElementById('date').value;
    const part = document.getElementById('part').value;
    const sizeStr = document.getElementById('size').value.trim();

    if (!date) { alert('日付を入力してください'); return; }
    if (!sizeStr || isNaN(Number(sizeStr))) { alert('サイズを正しく入力してください'); return; }
    if (Number(sizeStr) <= 0) { alert('サイズは0より大きい値を入力してください'); return; }

    const data = loadData();
    data.push({
      id: Date.now(),
      date,
      part,
      size: Number(Number(sizeStr).toFixed(1)),
    });
    saveData(data);

    document.getElementById('size').value = '';

    renderList(document.getElementById('filterPart').value);
    drawChart(document.getElementById('chartPart').value);
  });

  // フィルタ変更
  document.getElementById('filterPart').addEventListener('change', e => {
    renderList(e.target.value);
  });

  document.getElementById('chartPart').addEventListener('change', e => {
    drawChart(e.target.value);
  });

  // リサイズ時にグラフを再描画
  window.addEventListener('resize', () => {
    drawChart(document.getElementById('chartPart').value);
  });

  // 初期描画
  renderList('all');
  drawChart('ウエスト');
}

document.addEventListener('DOMContentLoaded', init);
