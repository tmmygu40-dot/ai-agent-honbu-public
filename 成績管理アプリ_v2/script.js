const STORAGE_KEY = 'seiseki_v2';

// データ構造: [{id, student, subject, score, date}]
let records = [];

function loadData() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    records = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ===== タブ ===== */
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'list') renderList();
    if (btn.dataset.tab === 'trend') refreshTrendSelects();
  });
});

/* ===== 入力タブ ===== */
// 今日の日付をデフォルト設定
document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);

document.getElementById('addBtn').addEventListener('click', () => {
  const student = document.getElementById('studentInput').value.trim();
  const subject = document.getElementById('subjectInput').value.trim();
  const scoreRaw = document.getElementById('scoreInput').value;
  const date = document.getElementById('dateInput').value;
  const msg = document.getElementById('addMsg');

  if (!student || !subject || scoreRaw === '' || !date) {
    msg.textContent = '全項目を入力してください';
    msg.style.color = '#e05252';
    return;
  }
  const score = Number(scoreRaw);
  if (score < 0 || score > 100) {
    msg.textContent = '点数は0〜100で入力してください';
    msg.style.color = '#e05252';
    return;
  }

  records.push({ id: genId(), student, subject, score, date });
  saveData();
  updateDatalistOptions();

  msg.textContent = `「${student}」の${subject}：${score}点 を登録しました`;
  msg.style.color = '#4a7fcb';
  document.getElementById('scoreInput').value = '';
});

function updateDatalistOptions() {
  const students = [...new Set(records.map(r => r.student))];
  const subjects = [...new Set(records.map(r => r.subject))];

  document.getElementById('studentList').innerHTML =
    students.map(s => `<option value="${esc(s)}">`).join('');
  document.getElementById('subjectList').innerHTML =
    subjects.map(s => `<option value="${esc(s)}">`).join('');
}

/* ===== 一覧・分析タブ ===== */
function renderList() {
  const filterVal = document.getElementById('filterStudent').value;
  const container = document.getElementById('studentCards');

  // フィルタセレクト更新
  const students = [...new Set(records.map(r => r.student))].sort();
  const filterSel = document.getElementById('filterStudent');
  const prev = filterSel.value;
  filterSel.innerHTML = '<option value="">全員</option>' +
    students.map(s => `<option value="${esc(s)}" ${s === prev ? 'selected' : ''}>${esc(s)}</option>`).join('');

  const targets = filterVal ? students.filter(s => s === filterVal) : students;

  if (targets.length === 0) {
    container.innerHTML = '<div class="card" style="color:#aaa;text-align:center">データがありません</div>';
    return;
  }

  container.innerHTML = targets.map(student => renderStudentCard(student)).join('');
}

function renderStudentCard(student) {
  const studentRecs = records.filter(r => r.student === student);
  // 科目ごとに最新点数・全記録を集約
  const subjectMap = {};
  studentRecs.forEach(r => {
    if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
    subjectMap[r.subject].push(r);
  });

  // 科目ごとに最新点数を取得
  const subjectLatest = Object.entries(subjectMap).map(([sub, recs]) => {
    const sorted = [...recs].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const avg = Math.round(recs.reduce((s, r) => s + r.score, 0) / recs.length * 10) / 10;
    return { subject: sub, latest, avg, count: recs.length };
  });

  // 全体平均（最新点数ベース）
  const totalAvg = subjectLatest.length
    ? Math.round(subjectLatest.reduce((s, e) => s + e.latest.score, 0) / subjectLatest.length * 10) / 10
    : '-';

  // 課題科目（最新点数が最も低い科目）
  const minScore = Math.min(...subjectLatest.map(e => e.latest.score));

  const rows = subjectLatest
    .sort((a, b) => a.latest.score - b.latest.score)
    .map(e => {
      const isWeak = e.latest.score === minScore;
      return `<tr class="${isWeak ? 'weak-subject' : ''}">
        <td>${esc(e.subject)}${isWeak ? '<span class="weak-badge">課題</span>' : ''}</td>
        <td class="score-latest">${e.latest.score}点</td>
        <td>${esc(e.latest.date)}</td>
        <td class="score-count">${e.count}回</td>
        <td><button class="btn btn-sm del-latest-btn" data-id="${e.latest.id}">削除</button></td>
      </tr>`;
    }).join('');

  return `<div class="student-card">
    <div class="student-header">
      <span class="student-name">${esc(student)}</span>
      <span class="student-avg">平均 ${totalAvg}点</span>
    </div>
    <table class="subject-table">
      <thead><tr>
        <th>科目</th><th>最新点数</th><th>テスト日</th><th>回数</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

document.getElementById('studentCards').addEventListener('click', e => {
  if (e.target.classList.contains('del-latest-btn')) {
    const id = e.target.dataset.id;
    if (confirm('この記録を削除しますか？')) {
      records = records.filter(r => r.id !== id);
      saveData();
      renderList();
    }
  }
});

document.getElementById('filterStudent').addEventListener('change', renderList);

document.getElementById('clearAllBtn').addEventListener('click', () => {
  if (confirm('全データを削除します。よろしいですか？')) {
    records = [];
    saveData();
    renderList();
  }
});

/* ===== 推移グラフタブ ===== */
function refreshTrendSelects() {
  const students = [...new Set(records.map(r => r.student))].sort();
  const trendStuSel = document.getElementById('trendStudent');
  const prevStu = trendStuSel.value;
  trendStuSel.innerHTML = '<option value="">選択してください</option>' +
    students.map(s => `<option value="${esc(s)}" ${s === prevStu ? 'selected' : ''}>${esc(s)}</option>`).join('');

  updateTrendSubjects();
}

function updateTrendSubjects() {
  const student = document.getElementById('trendStudent').value;
  const subjects = student
    ? [...new Set(records.filter(r => r.student === student).map(r => r.subject))].sort()
    : [];
  const trendSubSel = document.getElementById('trendSubject');
  const prevSub = trendSubSel.value;
  trendSubSel.innerHTML = '<option value="">選択してください</option>' +
    subjects.map(s => `<option value="${esc(s)}" ${s === prevSub ? 'selected' : ''}>${esc(s)}</option>`).join('');
  drawTrendChart();
}

document.getElementById('trendStudent').addEventListener('change', updateTrendSubjects);
document.getElementById('trendSubject').addEventListener('change', drawTrendChart);

function drawTrendChart() {
  const student = document.getElementById('trendStudent').value;
  const subject = document.getElementById('trendSubject').value;
  const canvas = document.getElementById('trendChart');
  const msg = document.getElementById('trendMsg');
  const ctx = canvas.getContext('2d');

  // キャンバスクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!student || !subject) {
    msg.textContent = '生徒と科目を選択してください';
    return;
  }

  const data = records
    .filter(r => r.student === student && r.subject === subject)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    msg.textContent = 'データがありません';
    return;
  }

  if (data.length === 1) {
    msg.textContent = 'テストが1回分しかないため推移グラフは表示できません（2回以上で表示されます）';
    return;
  }

  msg.textContent = '';

  const W = canvas.width;
  const H = canvas.height;
  const pad = { top: 30, right: 30, bottom: 60, left: 50 };
  const gW = W - pad.left - pad.right;
  const gH = H - pad.top - pad.bottom;

  const scores = data.map(d => d.score);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const scoreRange = maxScore - minScore || 1;

  function xPos(i) {
    return pad.left + (i / (data.length - 1)) * gW;
  }
  function yPos(score) {
    return pad.top + gH - ((score - minScore) / scoreRange) * gH;
  }

  // 背景
  ctx.fillStyle = '#f8faff';
  ctx.fillRect(pad.left, pad.top, gW, gH);

  // グリッド横線
  ctx.strokeStyle = '#e0e8f0';
  ctx.lineWidth = 1;
  for (let v = 0; v <= 4; v++) {
    const yVal = minScore + (scoreRange / 4) * v;
    const y = yPos(yVal);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + gW, y);
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(yVal), pad.left - 6, y + 4);
  }

  // 折れ線
  ctx.beginPath();
  ctx.strokeStyle = '#4a7fcb';
  ctx.lineWidth = 2.5;
  data.forEach((d, i) => {
    const x = xPos(i);
    const y = yPos(d.score);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 塗りつぶし（グラデーション）
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gH);
  grad.addColorStop(0, 'rgba(74,127,203,0.18)');
  grad.addColorStop(1, 'rgba(74,127,203,0)');
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = xPos(i);
    const y = yPos(d.score);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(xPos(data.length - 1), pad.top + gH);
  ctx.lineTo(xPos(0), pad.top + gH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // データ点・ラベル
  data.forEach((d, i) => {
    const x = xPos(i);
    const y = yPos(d.score);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#4a7fcb';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.score + '点', x, y - 12);

    // X軸ラベル（日付）
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const dateShort = d.date.slice(5); // MM-DD
    ctx.fillText(dateShort, x, pad.top + gH + 18);
    // 回数
    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.fillText(`第${i + 1}回`, x, pad.top + gH + 32);
  });

  // タイトル
  ctx.fillStyle = '#4a7fcb';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${student} / ${subject} の推移`, W / 2, 18);
}

/* ===== ユーティリティ ===== */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===== 初期化 ===== */
loadData();
updateDatalistOptions();
renderList();
