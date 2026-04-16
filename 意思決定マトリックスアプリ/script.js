// State
let state = {
  options: [],   // [{id, name}]
  criteria: [],  // [{id, name}]
  scores: {}     // {criteriaId_optionId: number}
};

let nextId = 1;

// Load from localStorage
function load() {
  try {
    const saved = localStorage.getItem('decision-matrix');
    if (saved) {
      const data = JSON.parse(saved);
      state = data.state || state;
      nextId = data.nextId || 1;
    }
  } catch (e) {
    // ignore
  }
}

function save() {
  localStorage.setItem('decision-matrix', JSON.stringify({ state, nextId }));
}

// Add option
function addOption() {
  const input = document.getElementById('optionInput');
  const name = input.value.trim();
  if (!name) return;
  state.options.push({ id: nextId++, name });
  input.value = '';
  save();
  render();
}

// Add criteria
function addCriteria() {
  const input = document.getElementById('criteriaInput');
  const name = input.value.trim();
  if (!name) return;
  state.criteria.push({ id: nextId++, name });
  input.value = '';
  save();
  render();
}

// Delete option
function deleteOption(id) {
  state.options = state.options.filter(o => o.id !== id);
  // Remove scores for this option
  Object.keys(state.scores).forEach(key => {
    if (key.endsWith('_' + id)) delete state.scores[key];
  });
  save();
  render();
}

// Delete criteria (row)
function deleteCriteria(id) {
  state.criteria = state.criteria.filter(c => c.id !== id);
  // Remove scores for this criteria
  Object.keys(state.scores).forEach(key => {
    if (key.startsWith(id + '_')) delete state.scores[key];
  });
  save();
  render();
}

// Score changed
function scoreChanged(criteriaId, optionId, value) {
  const key = criteriaId + '_' + optionId;
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    delete state.scores[key];
  } else {
    state.scores[key] = Math.max(0, Math.min(10, num));
  }
  save();
  updateTotals();
}

// Get total score for an option
function getTotal(optionId) {
  let total = 0;
  state.criteria.forEach(c => {
    const key = c.id + '_' + optionId;
    total += state.scores[key] || 0;
  });
  return total;
}

// Update totals row only
function updateTotals() {
  const foot = document.getElementById('tableFoot');
  if (!foot) return;
  if (state.options.length === 0 || state.criteria.length === 0) return;

  const totals = state.options.map(o => getTotal(o.id));
  const maxTotal = Math.max(...totals);

  let html = '<tr><td>合計スコア</td>';
  state.options.forEach((o, i) => {
    const cls = totals[i] === maxTotal && maxTotal > 0 ? ' class="top-score"' : '';
    html += `<td${cls}>${totals[i]}</td>`;
  });
  html += '</tr>';
  foot.innerHTML = html;
}

// Full render
function render() {
  const empty = document.getElementById('emptyMessage');
  const tableScroll = document.getElementById('tableScroll');

  if (state.options.length === 0 || state.criteria.length === 0) {
    empty.style.display = 'block';
    tableScroll.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  tableScroll.style.display = 'block';

  // Head
  const head = document.getElementById('tableHead');
  let headHtml = '<tr><th>評価軸 \\ 選択肢</th>';
  state.options.forEach(o => {
    headHtml += `<th class="option-header">${escHtml(o.name)}<span class="del-btn" onclick="deleteOption(${o.id})" title="削除">×</span></th>`;
  });
  headHtml += '</tr>';
  head.innerHTML = headHtml;

  // Body
  const body = document.getElementById('tableBody');
  let bodyHtml = '';
  state.criteria.forEach(c => {
    bodyHtml += `<tr><td><span class="row-del-btn" onclick="deleteCriteria(${c.id})" title="削除">×</span>${escHtml(c.name)}</td>`;
    state.options.forEach(o => {
      const key = c.id + '_' + o.id;
      const val = state.scores[key] !== undefined ? state.scores[key] : '';
      bodyHtml += `<td><input type="number" min="0" max="10" value="${val}" placeholder="0-10"
        onchange="scoreChanged(${c.id}, ${o.id}, this.value)"
        oninput="scoreChanged(${c.id}, ${o.id}, this.value)"></td>`;
    });
    bodyHtml += '</tr>';
  });
  body.innerHTML = bodyHtml;

  // Foot
  updateTotals();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clearAll() {
  if (!confirm('マトリックスを全てリセットしますか？')) return;
  state = { options: [], criteria: [], scores: {} };
  nextId = 1;
  save();
  render();
}

// Enter key support
document.getElementById('optionInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addOption();
});
document.getElementById('criteriaInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCriteria();
});

// Init
load();
render();
