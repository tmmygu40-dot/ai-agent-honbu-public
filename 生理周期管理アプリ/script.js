// ---- データ管理 ----
const STORAGE_KEY = 'period_records';

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

// ---- 日付ユーティリティ ----
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function diffDays(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysFromToday(dateStr) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = parseDate(dateStr);
  return Math.round((target - today) / 86400000);
}

// ---- 周期計算 ----
function calcAverageCycle(records) {
  if (records.length < 2) return 28; // デフォルト
  const sorted = [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let total = 0;
  let count = 0;
  for (let i = 1; i < sorted.length; i++) {
    const d = diffDays(sorted[i-1].startDate, sorted[i].startDate);
    if (d > 15 && d < 60) { total += d; count++; } // 異常値除外
  }
  return count > 0 ? Math.round(total / count) : 28;
}

function calcNextPeriod(records) {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const latest = sorted[0];
  const avg = calcAverageCycle(records);
  return { date: addDays(latest.startDate, avg), cycle: avg };
}

// ---- UI更新 ----
function renderAll() {
  const records = loadRecords();
  renderNextPeriod(records);
  renderList(records);
  renderGraph(records);
}

function renderNextPeriod(records) {
  const next = calcNextPeriod(records);
  const el = document.getElementById('nextDate');
  const sub = document.getElementById('nextSub');

  if (!next) {
    el.textContent = '—';
    sub.textContent = '記録を追加すると計算します';
    return;
  }

  el.textContent = formatDate(next.date);
  const diff = daysFromToday(next.date);
  if (diff === 0) {
    sub.textContent = `今日が予定日です（周期 ${next.cycle} 日）`;
  } else if (diff > 0) {
    sub.textContent = `あと ${diff} 日（周期 ${next.cycle} 日）`;
  } else {
    sub.textContent = `${Math.abs(diff)} 日前が予定日でした（周期 ${next.cycle} 日）`;
  }
}

function renderList(records) {
  const container = document.getElementById('recordList');
  const sorted = [...records].sort((a, b) => b.startDate.localeCompare(a.startDate));

  if (sorted.length === 0) {
    container.innerHTML = '<p class="empty-msg">まだ記録がありません</p>';
    return;
  }

  container.innerHTML = sorted.map((rec, i) => {
    const endLabel = rec.endDate ? ` 〜 ${formatDate(rec.endDate)}` : '';
    const days = rec.endDate ? diffDays(rec.startDate, rec.endDate) + 1 : null;
    const daysLabel = days !== null ? `${days}日間` : '';

    // 前周期との差を計算
    const idx = sorted.length - 1 - i; // 昇順インデックス
    const allSorted = [...records].sort((a,b) => a.startDate.localeCompare(b.startDate));
    let cycleLabel = '';
    if (idx > 0) {
      const prev = allSorted[idx - 1];
      const cycle = diffDays(prev.startDate, rec.startDate);
      cycleLabel = `周期 ${cycle} 日`;
    }

    const memoHtml = rec.memo ? `<div class="memo-text">📝 ${escapeHtml(rec.memo)}</div>` : '';

    return `
      <div class="record-item">
        <button class="btn-delete" onclick="deleteRecord('${rec.id}')" title="削除">✕</button>
        <div class="date-range">${formatDate(rec.startDate)}${endLabel}</div>
        ${daysLabel ? `<div class="duration">${daysLabel}</div>` : ''}
        ${cycleLabel ? `<div class="cycle-info">${cycleLabel}</div>` : ''}
        ${memoHtml}
      </div>`;
  }).join('');
}

function renderGraph(records) {
  const section = document.getElementById('graphSection');
  const sorted = [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // 周期データ収集
  const cycles = [];
  for (let i = 1; i < sorted.length; i++) {
    const d = diffDays(sorted[i-1].startDate, sorted[i].startDate);
    if (d > 15 && d < 60) cycles.push({ label: formatDate(sorted[i].startDate), value: d });
  }

  if (cycles.length < 2) { section.style.display = 'none'; return; }
  section.style.display = '';

  const canvas = document.getElementById('cycleCanvas');
  canvas.width = Math.max(canvas.parentElement.clientWidth - 32, 200);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 16, right: 20, bottom: 32, left: 36 };

  const vals = cycles.map(c => c.value);
  const minV = Math.min(...vals) - 3;
  const maxV = Math.max(...vals) + 3;
  const rangeV = maxV - minV || 1;

  const toX = i => pad.left + (i / (cycles.length - 1)) * (W - pad.left - pad.right);
  const toY = v => H - pad.bottom - ((v - minV) / rangeV) * (H - pad.top - pad.bottom);

  ctx.clearRect(0, 0, W, H);

  // グリッド線
  ctx.strokeStyle = '#f0c0d0';
  ctx.lineWidth = 1;
  [28, 30, 32].forEach(v => {
    if (v < minV || v > maxV) return;
    const y = toY(v);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#ccc'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v, pad.left - 4, y + 4);
  });

  // 折れ線
  ctx.beginPath();
  ctx.strokeStyle = '#e8537a';
  ctx.lineWidth = 2.5;
  cycles.forEach((c, i) => {
    const x = toX(i), y = toY(c.value);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // ドット
  cycles.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(toX(i), toY(c.value), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e8537a'; ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(toX(i), toY(c.value), 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // X軸ラベル（最初・最後のみ）
  ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
  [0, cycles.length - 1].forEach(i => {
    ctx.fillText(cycles[i].label, toX(i), H - 6);
  });
}

// ---- 操作 ----
function addRecord() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!startDate) { alert('開始日を入力してください'); return; }
  if (endDate && endDate < startDate) { alert('終了日は開始日以降にしてください'); return; }

  const records = loadRecords();
  records.push({
    id: Date.now().toString(),
    startDate,
    endDate: endDate || '',
    memo
  });
  saveRecords(records);

  // フォームリセット
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('memo').value = '';

  renderAll();
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderAll();
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---- 初期化 ----
renderAll();
window.addEventListener('resize', () => renderGraph(loadRecords()));
