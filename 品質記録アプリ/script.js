'use strict';

const STORAGE_KEY = 'quality-records';

let records = [];

// 初期化
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { records = JSON.parse(saved); } catch { records = []; }
  }
  render();
}

// localStorage保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 合格/不合格の登録
function addRecord(judgment) {
  const productName = document.getElementById('productName').value.trim();
  const inspector = document.getElementById('inspector').value.trim();
  let defectCategory = '';
  let defectNote = '';

  if (judgment === '不合格') {
    defectCategory = document.getElementById('defectCategory').value;
    defectNote = document.getElementById('defectNote').value.trim();
    hideDefectForm();
  }

  const now = new Date();
  const record = {
    id: Date.now(),
    judgment,
    productName,
    inspector,
    defectCategory,
    defectNote,
    time: formatTime(now),
  };

  records.unshift(record);
  save();
  render();
}

// 不良原因フォーム表示
function showDefectForm() {
  document.getElementById('defectNote').value = '';
  document.getElementById('defectForm').style.display = 'block';
}

function hideDefectForm() {
  document.getElementById('defectForm').style.display = 'none';
}

// レコード削除
function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  save();
  render();
}

// 全件削除
function clearAll() {
  if (records.length === 0) return;
  if (!confirm('全件削除してよいですか？')) return;
  records = [];
  save();
  render();
}

// 時刻フォーマット
function formatTime(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 画面更新
function render() {
  const total = records.length;
  const bad = records.filter(r => r.judgment === '不合格').length;
  const good = total - bad;
  const rate = total > 0 ? ((bad / total) * 100).toFixed(1) : '0.0';

  document.getElementById('totalCount').textContent = total;
  document.getElementById('goodCount').textContent = good;
  document.getElementById('badCount').textContent = bad;
  document.getElementById('defectRate').textContent = rate + '%';
  document.getElementById('recordCount').textContent = `（${total}件）`;

  // 原因別集計
  renderDefectBreakdown(bad);

  // 記録一覧
  const list = document.getElementById('recordList');
  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がまだありません</p>';
    return;
  }

  list.innerHTML = records.map(r => {
    const isGood = r.judgment === '合格';
    const mainText = r.productName ? r.productName : '（品目名なし）';
    let subParts = [];
    if (r.inspector) subParts.push(r.inspector);
    if (!isGood) {
      subParts.push(r.defectCategory);
      if (r.defectNote) subParts.push(r.defectNote);
    }
    const sub = subParts.join(' / ');

    return `<div class="record-item ${isGood ? 'is-good' : 'is-bad'}">
      <span class="record-badge">${r.judgment}</span>
      <div class="record-info">
        <div class="record-main">${esc(mainText)}</div>
        ${sub ? `<div class="record-sub">${esc(sub)}</div>` : ''}
      </div>
      <span class="record-time">${r.time}</span>
      <button class="record-delete" onclick="deleteRecord(${r.id})" title="削除">×</button>
    </div>`;
  }).join('');
}

// 原因別集計レンダリング
function renderDefectBreakdown(badCount) {
  const section = document.getElementById('defectSummary');
  const badRecords = records.filter(r => r.judgment === '不合格');

  if (badRecords.length === 0) {
    section.style.display = 'none';
    return;
  }

  const counts = {};
  badRecords.forEach(r => {
    const cat = r.defectCategory || 'その他';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(counts));
  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => {
      const pct = Math.round((count / maxCount) * 100);
      return `<div class="breakdown-item">
        <span class="breakdown-label">${esc(label)}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar" style="width:${pct}%"></div>
        </div>
        <span class="breakdown-count">${count}</span>
      </div>`;
    }).join('');

  document.getElementById('defectBreakdown').innerHTML = items;
  section.style.display = 'block';
}

// XSS防止
function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
