// =====================
// データ管理
// =====================
let positions = [];   // 売り場・ポジション名の配列
let assignments = {}; // { ポジション名: スタッフ名 }

const STORAGE_KEY = 'haichi_data';

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      positions = data.positions || [];
      assignments = data.assignments || {};
    } catch (e) {
      positions = [];
      assignments = {};
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ positions, assignments }));
}

// =====================
// 売り場・ポジション登録
// =====================
function addPosition() {
  const input = document.getElementById('positionInput');
  const name = input.value.trim();
  if (!name) return;
  if (positions.includes(name)) {
    alert('同じ名前がすでに登録されています');
    return;
  }
  positions.push(name);
  saveData();
  input.value = '';
  renderPositionList();
  renderAssignmentTable();
}

function removePosition(name) {
  positions = positions.filter(p => p !== name);
  delete assignments[name];
  saveData();
  renderPositionList();
  renderAssignmentTable();
}

function renderPositionList() {
  const list = document.getElementById('positionList');
  list.innerHTML = '';
  positions.forEach(name => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escapeHtml(name)}</span><button onclick="removePosition('${escapeAttr(name)}')" title="削除">×</button>`;
    list.appendChild(li);
  });
}

// =====================
// スタッフ配置テーブル
// =====================
function renderAssignmentTable() {
  const table = document.getElementById('assignmentTable');
  const body = document.getElementById('assignmentBody');
  const emptyMsg = document.getElementById('emptyMsg');

  if (positions.length === 0) {
    table.style.display = 'none';
    emptyMsg.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  emptyMsg.style.display = 'none';
  body.innerHTML = '';

  positions.forEach(name => {
    const tr = document.createElement('tr');
    const staffVal = assignments[name] || '';
    tr.innerHTML = `
      <td>${escapeHtml(name)}</td>
      <td>
        <input type="text"
          placeholder="スタッフ名を入力"
          value="${escapeHtml(staffVal)}"
          data-position="${escapeAttr(name)}"
          oninput="onAssignInput(this)"
          maxlength="30">
      </td>`;
    body.appendChild(tr);
  });
}

function onAssignInput(input) {
  const pos = input.getAttribute('data-position');
  assignments[pos] = input.value.trim();
  saveData();
}

// =====================
// 配置クリア
// =====================
function clearAssignments() {
  if (!confirm('配置をすべてクリアしますか？')) return;
  assignments = {};
  saveData();
  renderAssignmentTable();
}

// =====================
// 印刷
// =====================
function printTable() {
  // 印刷タイトルに日付を反映
  const dateInput = document.getElementById('dateInput');
  const dateVal = dateInput.value;
  let dateStr = '';
  if (dateVal) {
    const d = new Date(dateVal);
    dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } else {
    const today = new Date();
    dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  }

  // 印刷用タイトル要素を動的に挿入
  let printTitle = document.querySelector('.print-title');
  let printDate = document.querySelector('.print-date');
  const section = document.querySelector('.section:not(.no-print)');

  if (!printTitle) {
    printTitle = document.createElement('div');
    printTitle.className = 'print-title';
    section.insertBefore(printTitle, section.firstChild);
  }
  if (!printDate) {
    printDate = document.createElement('div');
    printDate.className = 'print-date';
    section.insertBefore(printDate, section.firstChild.nextSibling);
  }

  printTitle.textContent = '人員配置表';
  printDate.textContent = dateStr;

  window.print();
}

// =====================
// ユーティリティ
// =====================
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'");
}

// =====================
// Enter キー対応
// =====================
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // 今日の日付をデフォルトに設定
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('dateInput').value = `${yyyy}-${mm}-${dd}`;

  renderPositionList();
  renderAssignmentTable();

  document.getElementById('positionInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addPosition();
  });
});
