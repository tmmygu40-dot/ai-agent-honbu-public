// === 状態管理 ===
let selectedDates = [];
let currentEventData = null; // { name, dates }
let currentAnswers = []; // [{ name, votes: { "date": "○"|"×"|"△" } }]

// === 初期化 ===
window.addEventListener('load', () => {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');

  if (mode === 'vote') {
    loadVoteScreen(params);
  } else if (mode === 'results') {
    loadResultsScreen(params);
  } else {
    showCreateScreen();
  }
});

// === 画面切り替え ===
function showCreateScreen() {
  document.getElementById('screen-create').classList.remove('hidden');
  document.getElementById('screen-vote').classList.add('hidden');
  document.getElementById('screen-results').classList.add('hidden');
  document.getElementById('main-nav').classList.remove('hidden');
  setActiveNav('nav-create');
}

function showScreen(name) {
  if (name === 'create') {
    showCreateScreen();
  }
}

function setActiveNav(id) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function goToCreate() {
  history.pushState({}, '', location.pathname);
  selectedDates = [];
  currentAnswers = [];
  currentEventData = null;
  document.getElementById('event-name').value = '';
  document.getElementById('date-list').innerHTML = '';
  document.getElementById('vote-url-section').classList.add('hidden');
  showCreateScreen();
}

// === 作成画面 ===
function addDate() {
  const input = document.getElementById('date-input');
  const val = input.value;
  if (!val) return;
  if (selectedDates.includes(val)) {
    input.value = '';
    return;
  }
  selectedDates.push(val);
  selectedDates.sort();
  renderDateList();
  input.value = '';
}

function removeDate(date) {
  selectedDates = selectedDates.filter(d => d !== date);
  renderDateList();
}

function renderDateList() {
  const list = document.getElementById('date-list');
  list.innerHTML = '';
  selectedDates.forEach(d => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${formatDate(d)}</span><button onclick="removeDate('${d}')">✕</button>`;
    list.appendChild(li);
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}（${days[d.getDay()]}）`;
}

function generateVoteUrl() {
  const name = document.getElementById('event-name').value.trim();
  if (!name) {
    alert('イベント名を入力してください');
    return;
  }
  if (selectedDates.length === 0) {
    alert('候補日を1つ以上追加してください');
    return;
  }

  const data = { name, dates: selectedDates };
  const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
  const url = `${location.origin}${location.pathname}?mode=vote&d=${encoded}`;

  // localStorageに保存（集計ページで使う）
  localStorage.setItem('current_event', JSON.stringify(data));

  const section = document.getElementById('vote-url-section');
  const display = document.getElementById('vote-url-display');
  display.textContent = url;
  section.classList.remove('hidden');
}

function copyVoteUrl() {
  const url = document.getElementById('vote-url-display').textContent;
  copyToClipboard(url, '共有URLをコピーしました！');
}

// === 回答画面 ===
function loadVoteScreen(params) {
  const encoded = params.get('d');
  if (!encoded) {
    showCreateScreen();
    return;
  }

  try {
    const data = JSON.parse(decodeURIComponent(atob(encoded)));
    currentEventData = data;
  } catch {
    showCreateScreen();
    return;
  }

  document.getElementById('screen-create').classList.add('hidden');
  document.getElementById('screen-vote').classList.remove('hidden');
  document.getElementById('screen-results').classList.add('hidden');
  document.getElementById('main-nav').classList.add('hidden');

  document.getElementById('vote-event-name').textContent = currentEventData.name;

  renderVoteDates();
}

function renderVoteDates() {
  const container = document.getElementById('vote-dates');
  container.innerHTML = '';

  currentEventData.dates.forEach(date => {
    const row = document.createElement('div');
    row.className = 'vote-row';
    row.innerHTML = `
      <span class="vote-date-label">${formatDate(date)}</span>
      <div class="vote-btns">
        <button class="vote-btn" data-date="${date}" data-val="○" onclick="selectVote(this)">○</button>
        <button class="vote-btn" data-date="${date}" data-val="×" onclick="selectVote(this)">×</button>
        <button class="vote-btn" data-date="${date}" data-val="△" onclick="selectVote(this)">△</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function selectVote(btn) {
  const date = btn.dataset.date;
  const val = btn.dataset.val;
  // 同じ日付のボタンから選択クラスを外す
  document.querySelectorAll(`.vote-btn[data-date="${date}"]`).forEach(b => {
    b.classList.remove('selected-maru', 'selected-batsu', 'selected-sankaku');
  });
  if (val === '○') btn.classList.add('selected-maru');
  else if (val === '×') btn.classList.add('selected-batsu');
  else if (val === '△') btn.classList.add('selected-sankaku');
}

function generateAnswerUrl() {
  const voterName = document.getElementById('voter-name').value.trim();
  if (!voterName) {
    alert('お名前を入力してください');
    return;
  }

  const votes = {};
  currentEventData.dates.forEach(date => {
    const selected = document.querySelector(`.vote-btn[data-date="${date}"].selected-maru`) ||
                     document.querySelector(`.vote-btn[data-date="${date}"].selected-batsu`) ||
                     document.querySelector(`.vote-btn[data-date="${date}"].selected-sankaku`);
    votes[date] = selected ? selected.dataset.val : '－';
  });

  const answerData = {
    event: currentEventData,
    voter: voterName,
    votes
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(answerData)));
  const url = `${location.origin}${location.pathname}?mode=results&a=${encoded}`;

  const section = document.getElementById('answer-url-section');
  const display = document.getElementById('answer-url-display');
  display.textContent = url;
  section.classList.remove('hidden');
}

function copyAnswerUrl() {
  const url = document.getElementById('answer-url-display').textContent;
  copyToClipboard(url, '回答URLをコピーしました！');
}

// === 集計画面 ===
function loadResultsScreen(params) {
  document.getElementById('screen-create').classList.add('hidden');
  document.getElementById('screen-vote').classList.add('hidden');
  document.getElementById('screen-results').classList.remove('hidden');
  document.getElementById('main-nav').classList.remove('hidden');
  setActiveNav('nav-results');

  // URLに回答が含まれている場合は自動追加
  const aEncoded = params.get('a');
  if (aEncoded) {
    try {
      const answer = JSON.parse(decodeURIComponent(atob(aEncoded)));
      if (!currentEventData) {
        currentEventData = answer.event;
      }
      if (!currentAnswers.find(a => a.voter === answer.voter)) {
        currentAnswers.push({ voter: answer.voter, votes: answer.votes });
      }
    } catch {}
  }

  // localStorageからイベントデータ復元
  if (!currentEventData) {
    const saved = localStorage.getItem('current_event');
    if (saved) {
      try { currentEventData = JSON.parse(saved); } catch {}
    }
  }

  if (currentEventData) {
    document.getElementById('results-event-name').textContent = currentEventData.name;
  }

  renderResultTable();
}

function showResultsFromStorage() {
  currentEventData = null;
  const saved = localStorage.getItem('current_event');
  if (saved) {
    try { currentEventData = JSON.parse(saved); } catch {}
  }

  document.getElementById('screen-create').classList.add('hidden');
  document.getElementById('screen-vote').classList.add('hidden');
  document.getElementById('screen-results').classList.remove('hidden');
  setActiveNav('nav-results');

  if (currentEventData) {
    document.getElementById('results-event-name').textContent = currentEventData.name;
  } else {
    document.getElementById('results-event-name').textContent = '集計';
  }

  renderResultTable();
}

function addAnswer() {
  const input = document.getElementById('answer-url-input');
  const urlStr = input.value.trim();
  const errorEl = document.getElementById('paste-error');
  errorEl.classList.add('hidden');

  try {
    const url = new URL(urlStr);
    const params = new URLSearchParams(url.search);
    const aEncoded = params.get('a');
    if (!aEncoded) throw new Error();

    const answer = JSON.parse(decodeURIComponent(atob(aEncoded)));
    if (!answer.voter || !answer.votes || !answer.event) throw new Error();

    if (!currentEventData) {
      currentEventData = answer.event;
      document.getElementById('results-event-name').textContent = currentEventData.name;
    }

    if (currentAnswers.find(a => a.voter === answer.voter)) {
      alert(`「${answer.voter}」さんの回答はすでに追加されています`);
      input.value = '';
      return;
    }

    currentAnswers.push({ voter: answer.voter, votes: answer.votes });
    input.value = '';
    renderResultTable();
  } catch {
    errorEl.classList.remove('hidden');
  }
}

function renderResultTable() {
  const section = document.getElementById('result-table-section');
  const wrapper = document.getElementById('result-table-wrapper');

  if (!currentEventData || currentAnswers.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  const dates = currentEventData.dates;

  // 各日付ごとの集計
  const totals = {};
  dates.forEach(d => {
    totals[d] = { '○': 0, '×': 0, '△': 0, '－': 0 };
  });
  currentAnswers.forEach(a => {
    dates.forEach(d => {
      const v = a.votes[d] || '－';
      if (totals[d][v] !== undefined) totals[d][v]++;
    });
  });

  // ○が最多の日を探す
  let maxMaru = -1;
  dates.forEach(d => { if (totals[d]['○'] > maxMaru) maxMaru = totals[d]['○']; });

  let html = `<div class="result-table-wrapper"><table class="result-table">
    <thead>
      <tr>
        <th>参加者</th>
        ${dates.map(d => `<th>${formatDate(d)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>`;

  currentAnswers.forEach(a => {
    html += `<tr><td class="name-col">${escapeHtml(a.voter)}</td>`;
    dates.forEach(d => {
      const v = a.votes[d] || '－';
      const cls = v === '○' ? 'maru' : v === '×' ? 'batsu' : v === '△' ? 'sankaku' : '';
      html += `<td class="${cls}">${v}</td>`;
    });
    html += '</tr>';
  });

  html += `</tbody><tfoot><tr><td>合計</td>`;
  dates.forEach(d => {
    const isBest = totals[d]['○'] === maxMaru && maxMaru > 0;
    html += `<td class="${isBest ? 'best-date' : ''}">
      <span class="maru">○${totals[d]['○']}</span>
      <span class="sankaku"> △${totals[d]['△']}</span>
      <span class="batsu"> ×${totals[d]['×']}</span>
    </td>`;
  });
  html += `</tr></tfoot></table></div>`;

  wrapper.innerHTML = html;
}

// === ユーティリティ ===
function copyToClipboard(text, msg) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      if (msg) showToast(msg);
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (msg) showToast(msg);
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
    background: '#333', color: 'white', padding: '10px 20px', borderRadius: '20px',
    fontSize: '0.9rem', zIndex: '9999', whiteSpace: 'nowrap'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
