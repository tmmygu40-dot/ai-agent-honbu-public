'use strict';

const STORAGE_KEY = 'glucose_records';

// --- データ管理 ---
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

// --- 血糖値の状態判定 ---
// 食前基準: 正常<100, 要注意100-125, 高め≥126
// 食後基準: 正常<140, 要注意140-199, 高め≥200
function getLevel(timing, value) {
  if (timing === '食前') {
    if (value >= 126) return 'high';
    if (value >= 100) return 'warning';
  } else {
    if (value >= 200) return 'high';
    if (value >= 140) return 'warning';
  }
  return 'normal';
}

// --- 日時フォーマット ---
function formatDT(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  const ymd = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  const hm  = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${ymd} ${hm}`;
}

// --- 一覧描画 ---
function renderList(records) {
  const list = document.getElementById('recordList');
  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  // 新しい順で表示
  const sorted = [...records].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  list.innerHTML = sorted.map((r, idx) => {
    const level = getLevel(r.timing, r.glucose);
    const origIdx = records.indexOf(r);
    return `
      <div class="record-item ${level}">
        <div class="record-info">
          <span class="record-glucose ${level}">${r.glucose} mg/dL</span>
          <span class="record-timing">${r.timing}</span><br>
          <small>${formatDT(r.datetime)}</small>
          ${r.meal ? `<br><small>🍽 ${r.meal}</small>` : ''}
        </div>
        <button class="delete-btn" onclick="deleteRecord(${origIdx})" aria-label="削除">✕</button>
      </div>
    `;
  }).join('');
}

// --- グラフ描画 ---
function renderGraph(records) {
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');

  // DPR対応
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 680;
  const H = 200;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const gW = W - PAD.left - PAD.right;
  const gH = H - PAD.top  - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  // 日時順でソート
  const sorted = [...records].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  if (sorted.length === 0) {
    ctx.fillStyle = '#bbb';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('データがありません', W / 2, H / 2);
    return;
  }

  const values = sorted.map(r => r.glucose);
  const minV = Math.min(...values, 60);
  const maxV = Math.max(...values, 200);
  const range = maxV - minV || 1;

  function xPos(i) {
    if (sorted.length === 1) return PAD.left + gW / 2;
    return PAD.left + (i / (sorted.length - 1)) * gW;
  }
  function yPos(v) {
    return PAD.top + gH - ((v - minV) / range) * gH;
  }

  // 目安ライン（食前100、食後140）
  const guidelines = [
    { v: 100, label: '100', color: '#FF9800' },
    { v: 140, label: '140', color: '#f44336' },
  ];
  guidelines.forEach(g => {
    if (g.v >= minV && g.v <= maxV) {
      const y = yPos(g.v);
      ctx.beginPath();
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 3]);
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + gW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = g.color;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(g.label, PAD.left - 4, y + 3);
    }
  });

  // Y軸ラベル（minV / maxV）
  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(Math.round(maxV), PAD.left - 4, PAD.top + 4);
  ctx.fillText(Math.round(minV), PAD.left - 4, PAD.top + gH + 4);

  // 折れ線
  ctx.beginPath();
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = 2;
  sorted.forEach((r, i) => {
    const x = xPos(i);
    const y = yPos(r.glucose);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 点
  sorted.forEach((r, i) => {
    const level = getLevel(r.timing, r.glucose);
    const color = level === 'high' ? '#f44336' : level === 'warning' ? '#FF9800' : '#2196F3';
    const x = xPos(i);
    const y = yPos(r.glucose);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // X軸ラベル（最大5件）
  const step = sorted.length <= 5 ? 1 : Math.ceil(sorted.length / 5);
  ctx.fillStyle = '#888';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  sorted.forEach((r, i) => {
    if (i % step !== 0 && i !== sorted.length - 1) return;
    const d = new Date(r.datetime);
    const label = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    ctx.fillText(label, xPos(i), PAD.top + gH + 14);
  });
}

// --- 追加 ---
function addRecord() {
  const timing  = document.getElementById('timing').value;
  const dt      = document.getElementById('datetime').value;
  const meal    = document.getElementById('meal').value.trim();
  const glucose = parseInt(document.getElementById('glucose').value, 10);

  if (!dt) { alert('日時を入力してください'); return; }
  if (isNaN(glucose) || glucose <= 0) { alert('血糖値を正しく入力してください'); return; }

  const records = loadRecords();
  records.push({ timing, datetime: dt, meal, glucose, id: Date.now() });
  saveRecords(records);
  renderList(records);
  renderGraph(records);

  document.getElementById('glucose').value = '';
  document.getElementById('meal').value    = '';
}

// --- 削除 ---
function deleteRecord(idx) {
  if (!confirm('この記録を削除しますか？')) return;
  const records = loadRecords();
  records.splice(idx, 1);
  saveRecords(records);
  renderList(records);
  renderGraph(records);
}

// --- 初期化 ---
function init() {
  // 現在日時をデフォルト設定
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dtStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  document.getElementById('datetime').value = dtStr;

  document.getElementById('addBtn').addEventListener('click', addRecord);

  const records = loadRecords();
  renderList(records);

  // Canvas サイズ確定後にグラフ描画
  requestAnimationFrame(() => renderGraph(records));
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => {
  const records = loadRecords();
  renderGraph(records);
});
