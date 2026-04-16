'use strict';

const STORAGE_KEY = 'junban_data';

let state = {
  queue: [],        // { id, number, name }
  nextNumber: 1,    // 次に発行する番号
  currentCall: null // 現在呼び出し中 { number, name }
};

// --- localStorage ---
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      Object.assign(state, JSON.parse(raw));
    } catch (e) {
      // 読み込み失敗時はデフォルト
    }
  }
}

// --- DOM ---
const nameInput   = document.getElementById('nameInput');
const addBtn      = document.getElementById('addBtn');
const callNextBtn = document.getElementById('callNextBtn');
const resetBtn    = document.getElementById('resetBtn');
const waitList    = document.getElementById('waitList');
const waitCount   = document.getElementById('waitCount');
const currentNumber = document.getElementById('currentNumber');
const currentName   = document.getElementById('currentName');

// --- 受付登録 ---
function addCustomer() {
  const name = nameInput.value.trim();
  const num  = state.nextNumber++;
  state.queue.push({ id: Date.now(), number: num, name });
  nameInput.value = '';
  nameInput.focus();
  saveState();
  render();
}

// --- 呼び出し ---
function callNext() {
  if (state.queue.length === 0) return;
  const customer = state.queue.shift();
  state.currentCall = { number: customer.number, name: customer.name };
  saveState();
  render();
}

// --- 個別削除 ---
function deleteCustomer(id) {
  state.queue = state.queue.filter(c => c.id !== id);
  saveState();
  render();
}

// --- 全件リセット ---
function resetAll() {
  if (!confirm('待ちリストと呼び出し中の情報をすべて削除しますか？')) return;
  state.queue       = [];
  state.nextNumber  = 1;
  state.currentCall = null;
  saveState();
  render();
}

// --- 描画 ---
function render() {
  // 呼び出しパネル
  if (state.currentCall) {
    currentNumber.textContent = state.currentCall.number + '番';
    currentName.textContent   = state.currentCall.name || '';
  } else {
    currentNumber.textContent = '---';
    currentName.textContent   = '';
  }

  // 呼び出しボタン
  callNextBtn.disabled = state.queue.length === 0;

  // 待ち件数
  waitCount.textContent = state.queue.length + '件';

  // リスト
  waitList.innerHTML = '';
  if (state.queue.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-msg';
    li.textContent = '現在待ちのお客様はいません';
    waitList.appendChild(li);
    return;
  }

  state.queue.forEach((customer, index) => {
    const li = document.createElement('li');
    li.className = 'wait-item' + (index === 0 ? ' first' : '');

    const numSpan = document.createElement('span');
    numSpan.className = 'wait-num';
    numSpan.textContent = customer.number;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'wait-name';
    nameSpan.textContent = customer.name || '（名前なし）';

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.title = '削除';
    delBtn.addEventListener('click', () => deleteCustomer(customer.id));

    if (index === 0) {
      const badge = document.createElement('span');
      badge.className = 'wait-badge';
      badge.textContent = '次の方';
      li.appendChild(numSpan);
      li.appendChild(nameSpan);
      li.appendChild(badge);
    } else {
      li.appendChild(numSpan);
      li.appendChild(nameSpan);
    }
    li.appendChild(delBtn);
    waitList.appendChild(li);
  });
}

// --- イベント ---
addBtn.addEventListener('click', addCustomer);
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addCustomer();
});
callNextBtn.addEventListener('click', callNext);
resetBtn.addEventListener('click', resetAll);

// --- 初期化 ---
loadState();
render();
