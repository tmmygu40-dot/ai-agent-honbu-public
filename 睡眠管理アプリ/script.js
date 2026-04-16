const STORAGE_KEY = 'sleepRecords';

let records = [];

function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  records = data ? JSON.parse(data) : [];
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 睡眠時間を分単位で計算（日付をまたぐ場合も考慮）
function calcDurationMin(bedtime, waketime) {
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = waketime.split(':').map(Number);
  let bedMin = bh * 60 + bm;
  let wakeMin = wh * 60 + wm;
  if (wakeMin <= bedMin) {
    wakeMin += 24 * 60; // 日付またぎ
  }
  return wakeMin - bedMin;
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}時間${m > 0 ? m + '分' : ''}`;
}

function getBadge(minutes) {
  if (minutes >= 420) return { cls: 'badge-good', label: '十分' };
  if (minutes >= 360) return { cls: 'badge-ok', label: 'まあまあ' };
  return { cls: 'badge-bad', label: '不足' };
}

function render() {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  // セクション表示
  const hasSections = records.length > 0;
  document.getElementById('statsSection').style.display = hasSections ? '' : 'none';
  document.getElementById('chartSection').style.display = hasSections ? '' : 'none';
  document.getElementById('listSection').style.display = hasSections ? '' : 'none';

  if (!hasSections) return;

  // 統計
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const weekRecords = records.filter(r => r.date >= weekStr);
  if (weekRecords.length > 0) {
    const avg = weekRecords.reduce((s, r) => s + r.duration, 0) / weekRecords.length;
    document.getElementById('weekAvg').textContent = formatDuration(Math.round(avg));
  } else {
    document.getElementById('weekAvg').textContent = '--';
  }
  document.getElementById('totalRecords').textContent = records.length + '件';

  // グラフ（直近14件）
  drawChart(sorted.slice(0, 14).reverse());

  // 一覧
  const list = document.getElementById('recordList');
  if (sorted.length === 0) {
    list.innerHTML = '<li><div class="empty-msg">記録がありません</div></li>';
    return;
  }
  list.innerHTML = sorted.map(r => {
    const badge = getBadge(r.duration);
    return `<li>
      <div class="record-main">
        <div class="record-date">${formatDate(r.date)}</div>
        <div class="record-times">${r.bedtime} 就寝 → ${r.waketime} 起床</div>
        <div class="record-duration">${formatDuration(r.duration)}</div>
        ${r.note ? `<div class="record-note">${escapeHtml(r.note)}</div>` : ''}
      </div>
      <span class="record-badge ${badge.cls}">${badge.label}</span>
      <button class="delete-btn" onclick="deleteRecord('${r.id}')" title="削除">✕</button>
    </li>`;
  }).join('');
}

function formatDate(str) {
  const [y, m, d] = str.split('-');
  const days = ['日','月','火','水','木','金','土'];
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return `${y}/${m}/${d}（${days[date.getDay()]}）`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function drawChart(data) {
  const canvas = document.getElementById('sleepChart');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.parentElement.clientWidth - 32;
  const H = 160;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const PAD = { top: 16, right: 12, bottom: 36, left: 44 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  if (data.length === 0) return;

  const maxH = Math.max(...data.map(r => r.duration), 540);
  const minH = 0;
  const range = maxH - minH;

  const toY = (min) => PAD.top + ch - ((min - minH) / range) * ch;
  const toX = (i) => PAD.left + (data.length === 1 ? cw / 2 : (i / (data.length - 1)) * cw);

  // グリッド（6h, 7h, 8h）
  [360, 420, 480].forEach(target => {
    const y = toY(target);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + cw, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText((target / 60) + 'h', PAD.left - 4, y + 4);
  });

  // 折れ線
  ctx.beginPath();
  data.forEach((r, i) => {
    const x = toX(i);
    const y = toY(r.duration);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#5b9bd5';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 点
  data.forEach((r, i) => {
    const x = toX(i);
    const y = toY(r.duration);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = r.duration >= 420 ? '#48bb78' : r.duration >= 360 ? '#ed8936' : '#fc8181';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // X軸ラベル（間引き）
  const step = data.length > 10 ? Math.ceil(data.length / 7) : 1;
  data.forEach((r, i) => {
    if (i % step !== 0 && i !== data.length - 1) return;
    const x = toX(i);
    const parts = r.date.split('-');
    const label = `${Number(parts[1])}/${Number(parts[2])}`;
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, H - PAD.bottom + 14);
  });
}

function addRecord() {
  const date = document.getElementById('date').value;
  const bedtime = document.getElementById('bedtime').value;
  const waketime = document.getElementById('waketime').value;
  const note = document.getElementById('note').value.trim();

  if (!date || !bedtime || !waketime) {
    alert('日付・就寝時刻・起床時刻を入力してください');
    return;
  }

  const duration = calcDurationMin(bedtime, waketime);
  if (duration <= 0 || duration > 16 * 60) {
    alert('時刻が正しくないようです。再確認してください。');
    return;
  }

  const id = Date.now().toString();
  records.push({ id, date, bedtime, waketime, duration, note });
  saveRecords();
  render();

  document.getElementById('note').value = '';
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveRecords();
  render();
}

// 初期化
loadRecords();

// 今日の日付をデフォルト
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;

render();

document.getElementById('addBtn').addEventListener('click', addRecord);

window.addEventListener('resize', () => {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  if (records.length > 0) drawChart(sorted.slice(0, 14).reverse());
});
