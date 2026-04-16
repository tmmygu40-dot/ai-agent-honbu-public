'use strict';

const STORAGE_KEY = 'wasuremono_prints';

let prints = loadPrints();
let currentFilter = 'all';

// ---- DOM refs ----
const titleInput    = document.getElementById('title');
const deadlineInput = document.getElementById('deadline');
const itemsInput    = document.getElementById('items');
const addBtn        = document.getElementById('addBtn');
const printList     = document.getElementById('printList');
const emptyMsg      = document.getElementById('emptyMsg');
const tabs          = document.querySelectorAll('.tab');

// ---- Init ----
setDefaultDeadline();
render();

// ---- Event listeners ----
addBtn.addEventListener('click', addPrint);

[titleInput, deadlineInput, itemsInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') addPrint(); });
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    render();
  });
});

// ---- Functions ----

function setDefaultDeadline() {
  const today = new Date();
  deadlineInput.value = formatDate(today);
}

function addPrint() {
  const title    = titleInput.value.trim();
  const deadline = deadlineInput.value;
  const things   = itemsInput.value.trim();

  if (!title) { alert('プリント名を入力してください'); titleInput.focus(); return; }
  if (!deadline) { alert('提出期限を入力してください'); deadlineInput.focus(); return; }

  const newPrint = {
    id:       Date.now(),
    title,
    deadline,
    things,
    done:     false,
    createdAt: new Date().toISOString()
  };

  prints.unshift(newPrint);
  savePrints();
  render();

  // reset
  titleInput.value  = '';
  itemsInput.value  = '';
  setDefaultDeadline();
  titleInput.focus();
}

function toggleDone(id) {
  const p = prints.find(p => p.id === id);
  if (p) { p.done = !p.done; savePrints(); render(); }
}

function deletePrint(id) {
  prints = prints.filter(p => p.id !== id);
  savePrints();
  render();
}

function render() {
  const filtered = getFiltered();
  printList.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  // Sort: undone first by deadline, then done
  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.deadline.localeCompare(b.deadline);
  });

  sorted.forEach(p => {
    const li = document.createElement('li');
    li.className = 'print-item' + (p.done ? ' done' : '') + ' ' + urgencyClass(p.deadline, p.done);
    li.innerHTML = buildItemHTML(p);
    li.querySelector('.item-check').addEventListener('change', () => toggleDone(p.id));
    li.querySelector('.item-delete').addEventListener('click', () => {
      if (confirm(`「${p.title}」を削除しますか？`)) deletePrint(p.id);
    });
    printList.appendChild(li);
  });
}

function buildItemHTML(p) {
  const uc  = urgencyClass(p.deadline, p.done);
  const badge = badgeHTML(uc, p.done);
  const thingsHTML = p.things
    ? `<div class="item-things">${escapeHTML(p.things)}</div>`
    : '';

  return `
    <div class="item-header">
      <input type="checkbox" class="item-check" ${p.done ? 'checked' : ''}>
      <div class="item-body">
        <div class="item-title">${escapeHTML(p.title)}</div>
        <div class="item-deadline">
          <span class="deadline-label">期限：</span>
          <span class="deadline-value">${formatDateJP(p.deadline)}</span>
          ${badge}
        </div>
        ${thingsHTML}
      </div>
      <button class="item-delete" title="削除">✕</button>
    </div>
  `;
}

function urgencyClass(deadline, done) {
  if (done) return '';
  const today     = getTodayStr();
  const tomorrow  = getTomorrowStr();
  const dayAfter  = getDayAfterStr();
  if (deadline <= today)    return 'today';
  if (deadline === tomorrow) return 'tomorrow';
  if (deadline === dayAfter) return 'soon';
  return '';
}

function badgeHTML(uc, done) {
  if (done || !uc) return '';
  const labels = { today: '今日！', tomorrow: '明日', soon: 'もうすぐ' };
  return `<span class="badge ${uc}">${labels[uc]}</span>`;
}

function getFiltered() {
  const today    = getTodayStr();
  const tomorrow = getTomorrowStr();
  switch (currentFilter) {
    case 'urgent':
      return prints.filter(p => !p.done && p.deadline <= tomorrow);
    case 'active':
      return prints.filter(p => !p.done);
    case 'done':
      return prints.filter(p => p.done);
    default:
      return prints;
  }
}

// ---- Storage ----
function loadPrints() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function savePrints() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prints));
}

// ---- Helpers ----
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateJP(str) {
  const [y, m, d] = str.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function getTodayStr() {
  return formatDate(new Date());
}

function getTomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return formatDate(d);
}

function getDayAfterStr() {
  const d = new Date(); d.setDate(d.getDate() + 2);
  return formatDate(d);
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
