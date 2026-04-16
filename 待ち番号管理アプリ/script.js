'use strict';

const STORAGE_KEY = 'waiting_app_data';

let state = {
  nextIssue: 1,      // 次に発行する番号
  issuedToday: 0,    // 本日発行数
  waiting: [],       // 待ち一覧 [{num, time}]
  calling: null      // 呼び出し中 {num, time} or null
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 日付が変わっていたら発行数リセット
      const today = new Date().toDateString();
      if (parsed.date !== today) {
        parsed.issuedToday = 0;
        parsed.date = today;
      }
      state = { ...state, ...parsed };
    }
  } catch (e) {
    // 読み込み失敗は無視
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      date: new Date().toDateString()
    }));
  } catch (e) {
    // 保存失敗は無視
  }
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `受付 ${h}:${m}`;
}

function issueNumber() {
  const num = state.nextIssue;
  state.nextIssue += 1;
  state.issuedToday += 1;
  state.waiting.push({ num, time: new Date().toISOString() });
  saveState();
  render();
}

function callNext() {
  if (state.waiting.length === 0) return;
  // 呼び出し中があれば自動完了
  if (state.calling) {
    state.calling = null;
  }
  const next = state.waiting.shift();
  state.calling = next;
  saveState();
  render();
}

function completeCalling() {
  if (!state.calling) return;
  state.calling = null;
  saveState();
  render();
}

function cancelCalling() {
  if (!state.calling) return;
  state.calling = null;
  saveState();
  render();
}

function cancelWaiting(num) {
  state.waiting = state.waiting.filter(w => w.num !== num);
  saveState();
  render();
}

function resetAll() {
  if (!confirm('番号をリセットしますか？\n（待ち一覧と呼び出し中もクリアされます）')) return;
  state.nextIssue = 1;
  state.issuedToday = 0;
  state.waiting = [];
  state.calling = null;
  saveState();
  render();
}

function render() {
  // 呼び出し中
  const callingSection = document.getElementById('callingSection');
  const callingNumEl = document.getElementById('callingNumber');
  const callingTimeEl = document.getElementById('callingTime');

  if (state.calling) {
    callingSection.classList.remove('empty');
    callingNumEl.textContent = String(state.calling.num).padStart(3, '0');
    callingTimeEl.textContent = formatTime(state.calling.time);
  } else {
    callingSection.classList.add('empty');
    callingNumEl.textContent = '—';
    callingTimeEl.textContent = '';
  }

  // 統計
  document.getElementById('waitCount').textContent = state.waiting.length;
  document.getElementById('issuedCount').textContent = state.issuedToday;

  const nextNum = state.waiting.length > 0
    ? String(state.waiting[0].num).padStart(3, '0')
    : '—';
  document.getElementById('nextNumber').textContent = nextNum;

  // 次を呼ぶボタン
  document.getElementById('btnCallNext').disabled = state.waiting.length === 0;

  // 待ち一覧
  const list = document.getElementById('waitingList');
  if (state.waiting.length === 0) {
    list.innerHTML = '<li class="empty-msg">待ちはありません</li>';
  } else {
    list.innerHTML = state.waiting.map(w => `
      <li class="waiting-item">
        <span class="item-num">${String(w.num).padStart(3, '0')}</span>
        <span class="item-time">${formatTime(w.time)}</span>
        <button class="item-cancel" onclick="cancelWaiting(${w.num})">キャンセル</button>
      </li>
    `).join('');
  }
}

// 起動
loadState();
render();
