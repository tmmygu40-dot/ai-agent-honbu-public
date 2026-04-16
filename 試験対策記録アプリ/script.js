const STORAGE_KEY = 'exam_fields';

let fields = loadFields();
let editingId = null;

const fieldNameEl = document.getElementById('fieldName');
const totalCountEl = document.getElementById('totalCount');
const correctCountEl = document.getElementById('correctCount');
const addBtn = document.getElementById('addBtn');
const fieldList = document.getElementById('fieldList');
const sortSelect = document.getElementById('sortSelect');
const summarySection = document.getElementById('summarySection');

addBtn.addEventListener('click', handleAdd);
sortSelect.addEventListener('change', renderList);

// Enterキー対応
[fieldNameEl, totalCountEl, correctCountEl].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });
});

function handleAdd() {
  const name = fieldNameEl.value.trim();
  const total = parseInt(totalCountEl.value, 10);
  const correct = parseInt(correctCountEl.value, 10);

  if (!name) { alert('分野名を入力してください'); fieldNameEl.focus(); return; }
  if (isNaN(total) || total < 1) { alert('問題数を正しく入力してください'); totalCountEl.focus(); return; }
  if (isNaN(correct) || correct < 0) { alert('正解数を正しく入力してください'); correctCountEl.focus(); return; }
  if (correct > total) { alert('正解数が問題数を超えています'); correctCountEl.focus(); return; }

  if (editingId !== null) {
    // 更新
    const idx = fields.findIndex(f => f.id === editingId);
    if (idx !== -1) {
      fields[idx].name = name;
      fields[idx].total = total;
      fields[idx].correct = correct;
      fields[idx].updatedAt = Date.now();
    }
    editingId = null;
    addBtn.textContent = '登録する';
  } else {
    // 同名チェック
    if (fields.some(f => f.name === name)) {
      if (!confirm(`「${name}」はすでに登録されています。上書きしますか？`)) return;
      const idx = fields.findIndex(f => f.name === name);
      fields[idx].total = total;
      fields[idx].correct = correct;
      fields[idx].updatedAt = Date.now();
    } else {
      fields.push({ id: Date.now(), name, total, correct, updatedAt: Date.now() });
    }
  }

  saveFields();
  clearForm();
  renderAll();
}

function handleEdit(id) {
  const f = fields.find(f => f.id === id);
  if (!f) return;
  fieldNameEl.value = f.name;
  totalCountEl.value = f.total;
  correctCountEl.value = f.correct;
  editingId = id;
  addBtn.textContent = '更新する';
  fieldNameEl.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleDelete(id) {
  const f = fields.find(f => f.id === id);
  if (!f) return;
  if (!confirm(`「${f.name}」を削除しますか？`)) return;
  fields = fields.filter(f => f.id !== id);
  if (editingId === id) { editingId = null; addBtn.textContent = '登録する'; clearForm(); }
  saveFields();
  renderAll();
}

function clearForm() {
  fieldNameEl.value = '';
  totalCountEl.value = '';
  correctCountEl.value = '';
  fieldNameEl.focus();
}

function getRate(f) {
  return f.total > 0 ? Math.round((f.correct / f.total) * 100) : 0;
}

function getLevel(rate) {
  if (rate < 60) return 'weak';
  if (rate < 80) return 'caution';
  return 'good';
}

function getSortedFields() {
  const sort = sortSelect.value;
  const copy = [...fields];
  if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  if (sort === 'rate-asc') return copy.sort((a, b) => getRate(a) - getRate(b));
  if (sort === 'rate-desc') return copy.sort((a, b) => getRate(b) - getRate(a));
  if (sort === 'total-desc') return copy.sort((a, b) => b.total - a.total);
  return copy;
}

function renderList() {
  if (fields.length === 0) {
    fieldList.innerHTML = '<p class="empty-msg">まだ分野が登録されていません。<br>上のフォームから登録してください。</p>';
    return;
  }

  const sorted = getSortedFields();
  fieldList.innerHTML = sorted.map(f => {
    const rate = getRate(f);
    const level = getLevel(rate);
    const badgeHtml = level === 'weak' ? '<span class="badge-weak">苦手</span>' : '';
    return `
      <div class="field-card ${level}">
        <div class="card-top">
          <div class="field-name">${escHtml(f.name)}${badgeHtml}</div>
          <div class="field-rate">${rate}%</div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${rate}%"></div>
        </div>
        <div class="card-bottom">
          <div class="field-detail">問題数：${f.total}問　正解：${f.correct}問　不正解：${f.total - f.correct}問</div>
          <div class="card-actions">
            <button class="btn-edit" onclick="handleEdit(${f.id})">編集</button>
            <button class="btn-delete" onclick="handleDelete(${f.id})">削除</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSummary() {
  if (fields.length === 0) {
    summarySection.style.display = 'none';
    return;
  }
  summarySection.style.display = '';

  const totalFields = fields.length;
  const totalQ = fields.reduce((s, f) => s + f.total, 0);
  const totalC = fields.reduce((s, f) => s + f.correct, 0);
  const overallRate = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
  const weakCount = fields.filter(f => getRate(f) < 60).length;

  document.getElementById('totalFields').textContent = totalFields;
  document.getElementById('totalQuestions').textContent = totalQ;
  document.getElementById('overallRate').textContent = overallRate + '%';
  document.getElementById('weakCount').textContent = weakCount;
}

function renderAll() {
  renderSummary();
  renderList();
}

function saveFields() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
}

function loadFields() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 初期表示
renderAll();
