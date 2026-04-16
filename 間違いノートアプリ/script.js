const STORAGE_KEY = 'machigai_notes';

let notes = [];
let currentFilter = '';

function loadNotes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    notes = data ? JSON.parse(data) : [];
  } catch (e) {
    notes = [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function getSubjects() {
  const subjects = [...new Set(notes.map(n => n.subject).filter(Boolean))];
  return subjects.sort();
}

function updateFilterOptions() {
  const select = document.getElementById('filterSubject');
  const current = select.value;
  const subjects = getSubjects();

  select.innerHTML = '<option value="">すべて</option>';
  subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === current) opt.selected = true;
    select.appendChild(opt);
  });
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function renderNotes() {
  const list = document.getElementById('noteList');
  const filtered = currentFilter
    ? notes.filter(n => n.subject === currentFilter)
    : notes;

  // 新しい順
  const sorted = [...filtered].reverse();

  const countEl = document.getElementById('countDisplay');
  countEl.textContent = `${filtered.length} 件`;

  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state">まだ問題が登録されていません</div>';
    return;
  }

  list.innerHTML = sorted.map(note => `
    <div class="note-card" data-id="${note.id}">
      <button class="delete-btn" onclick="deleteNote('${note.id}')" title="削除">×</button>
      <div class="note-header">
        <span class="subject-tag">${escapeHtml(note.subject || '未分類')}</span>
        <span class="note-date">${formatDate(note.createdAt)}</span>
      </div>
      <div class="note-question">${escapeHtml(note.question)}</div>
      ${note.cause ? `
        <div class="note-cause-label">ミスの原因</div>
        <div class="note-cause">${escapeHtml(note.cause)}</div>
      ` : ''}
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addNote() {
  const subject = document.getElementById('subject').value.trim();
  const question = document.getElementById('question').value.trim();
  const cause = document.getElementById('cause').value.trim();

  if (!question) {
    alert('問題内容を入力してください');
    return;
  }

  const note = {
    id: Date.now().toString(),
    subject: subject || '未分類',
    question,
    cause,
    createdAt: Date.now()
  };

  notes.push(note);
  saveNotes();
  updateFilterOptions();
  renderNotes();

  // フォームクリア
  document.getElementById('subject').value = '';
  document.getElementById('question').value = '';
  document.getElementById('cause').value = '';
  document.getElementById('question').focus();
}

function deleteNote(id) {
  if (!confirm('この記録を削除しますか？')) return;
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  updateFilterOptions();
  if (currentFilter && !getSubjects().includes(currentFilter)) {
    currentFilter = '';
    document.getElementById('filterSubject').value = '';
  }
  renderNotes();
}

// イベント設定
document.getElementById('addBtn').addEventListener('click', addNote);

document.getElementById('filterSubject').addEventListener('change', function() {
  currentFilter = this.value;
  renderNotes();
});

// Enterキーで登録（テキストエリア以外）
document.getElementById('subject').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('question').focus();
  }
});

// 初期化
loadNotes();
updateFilterOptions();
renderNotes();
