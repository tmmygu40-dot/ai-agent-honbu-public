// データ構造: { studentName: { subject: score, ... }, ... }
let data = {};

function load() {
  const saved = localStorage.getItem('seiseki_data');
  if (saved) {
    try { data = JSON.parse(saved); } catch(e) { data = {}; }
  }
}

function save() {
  localStorage.setItem('seiseki_data', JSON.stringify(data));
}

function calcStats(scores) {
  const vals = Object.values(scores);
  if (vals.length === 0) return { avg: '-', weakSubject: '-' };
  const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const minScore = Math.min(...vals);
  const weakSubject = Object.keys(scores).find(k => scores[k] === minScore) || '-';
  return { avg, weakSubject };
}

function calcRanks() {
  // 全生徒の平均点を計算してランキングを作る
  const avgs = {};
  for (const name in data) {
    const vals = Object.values(data[name]);
    if (vals.length > 0) {
      avgs[name] = vals.reduce((a, b) => a + b, 0) / vals.length;
    } else {
      avgs[name] = 0;
    }
  }
  // 降順ソート
  const sorted = Object.keys(avgs).sort((a, b) => avgs[b] - avgs[a]);
  const ranks = {};
  sorted.forEach((name, idx) => { ranks[name] = idx + 1; });
  return ranks;
}

function render() {
  const list = document.getElementById('studentList');
  const noData = document.getElementById('noData');

  const students = Object.keys(data);
  if (students.length === 0) {
    noData.style.display = 'block';
    list.innerHTML = '';
    return;
  }
  noData.style.display = 'none';

  const ranks = calcRanks();
  list.innerHTML = '';

  // 平均点の降順でソート表示
  const sorted = students.slice().sort((a, b) => {
    const aVals = Object.values(data[a]);
    const bVals = Object.values(data[b]);
    const aAvg = aVals.length ? aVals.reduce((x, y) => x + y, 0) / aVals.length : 0;
    const bAvg = bVals.length ? bVals.reduce((x, y) => x + y, 0) / bVals.length : 0;
    return bAvg - aAvg;
  });

  sorted.forEach(name => {
    const scores = data[name];
    const { avg, weakSubject } = calcStats(scores);
    const rank = ranks[name];

    let rankClass = 'rank-other';
    if (rank === 1) rankClass = 'rank-1';
    else if (rank === 2) rankClass = 'rank-2';
    else if (rank === 3) rankClass = 'rank-3';

    const card = document.createElement('div');
    card.className = 'student-card';

    card.innerHTML = `
      <div class="student-header">
        <span class="student-name">${escHtml(name)}</span>
        <div class="student-meta">
          <span>平均 ${avg}点</span>
          <span><span class="rank-badge ${rankClass}">${rank}位</span></span>
          ${weakSubject !== '-' ? `<span class="weak-subject">苦手: ${escHtml(weakSubject)}</span>` : ''}
        </div>
      </div>
      <table class="score-table">
        <thead>
          <tr>
            <th>教科</th>
            <th>点数</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(scores).map(subj => {
            const minScore = Math.min(...Object.values(scores));
            const isLow = scores[subj] === minScore && Object.keys(scores).length > 1;
            return `<tr>
              <td>${escHtml(subj)}</td>
              <td class="${isLow ? 'low-score' : ''}">${scores[subj]}</td>
              <td><button class="del-btn" onclick="deleteScore('${escAttr(name)}','${escAttr(subj)}')">×</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;

    list.appendChild(card);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

function deleteScore(studentName, subject) {
  if (!data[studentName]) return;
  delete data[studentName][subject];
  if (Object.keys(data[studentName]).length === 0) {
    delete data[studentName];
  }
  save();
  render();
}

document.getElementById('addBtn').addEventListener('click', () => {
  const studentName = document.getElementById('studentName').value.trim();
  const subjectName = document.getElementById('subjectName').value.trim();
  const scoreVal = document.getElementById('score').value.trim();

  if (!studentName || !subjectName || scoreVal === '') {
    alert('生徒名・教科名・点数をすべて入力してください');
    return;
  }

  const score = Number(scoreVal);
  if (isNaN(score) || score < 0 || score > 100) {
    alert('点数は0〜100の数値を入力してください');
    return;
  }

  if (!data[studentName]) data[studentName] = {};
  data[studentName][subjectName] = score;

  save();
  render();

  document.getElementById('subjectName').value = '';
  document.getElementById('score').value = '';
  document.getElementById('subjectName').focus();
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
  if (!confirm('全データを削除しますか？')) return;
  data = {};
  save();
  render();
});

// Enterキーで追加
document.getElementById('score').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

load();
render();
