// データ構造: { students: [{id, name}], records: [{id, studentId, date, content, homework, goal}] }

const STORAGE_KEY = 'shidou_kiroku_data';

let data = { students: [], records: [] };
let selectedStudentId = null;

// ローカルストレージからロード
function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch (e) {
      data = { students: [], records: [] };
    }
  }
}

// ローカルストレージへ保存
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ID生成
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 今日の日付（YYYY-MM-DD）
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 生徒リスト描画
function renderStudentList() {
  const list = document.getElementById('student-list');
  list.innerHTML = '';

  data.students.forEach(student => {
    const tag = document.createElement('div');
    tag.className = 'student-tag' + (student.id === selectedStudentId ? ' active' : '');
    tag.dataset.id = student.id;
    tag.innerHTML = `
      <span class="student-name">${escapeHtml(student.name)}</span>
      <button class="delete-student" data-id="${student.id}" title="削除">×</button>
    `;
    tag.querySelector('.student-name').addEventListener('click', () => selectStudent(student.id));
    tag.querySelector('.delete-student').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteStudent(student.id);
    });
    list.appendChild(tag);
  });
}

// 生徒選択
function selectStudent(id) {
  selectedStudentId = id;
  renderStudentList();
  renderRecordSection();
}

// 授業記録セクション描画
function renderRecordSection() {
  const recordSection = document.getElementById('record-section');
  const emptySection = document.getElementById('empty-section');

  const student = data.students.find(s => s.id === selectedStudentId);
  if (!student) {
    recordSection.style.display = 'none';
    emptySection.style.display = data.students.length === 0 ? '' : 'block';
    return;
  }

  emptySection.style.display = 'none';
  recordSection.style.display = '';
  document.getElementById('selected-student-name').textContent = student.name;

  renderRecordList();
}

// 授業履歴リスト描画
function renderRecordList() {
  const list = document.getElementById('record-list');
  const studentRecords = data.records
    .filter(r => r.studentId === selectedStudentId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (studentRecords.length === 0) {
    list.innerHTML = '<p class="no-record">まだ記録がありません</p>';
    return;
  }

  list.innerHTML = studentRecords.map(r => `
    <div class="record-item">
      <div class="record-item-header">
        <span class="record-date">${r.date}</span>
        <button class="btn btn-danger" onclick="deleteRecord('${r.id}')">削除</button>
      </div>
      <div class="record-fields">
        <div class="record-field">
          <span class="field-label">【授業内容】</span>
          <span class="field-value">${escapeHtml(r.content) || '—'}</span>
        </div>
        <div class="record-field">
          <span class="field-label">【宿題】</span>
          <span class="field-value">${escapeHtml(r.homework) || '—'}</span>
        </div>
        <div class="record-field">
          <span class="field-label">【次回目標】</span>
          <span class="field-value">${escapeHtml(r.goal) || '—'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// 生徒追加
function addStudent() {
  const input = document.getElementById('student-name-input');
  const name = input.value.trim();
  if (!name) return;
  if (data.students.some(s => s.name === name)) {
    alert('同じ名前の生徒がすでに登録されています');
    return;
  }
  const student = { id: generateId(), name };
  data.students.push(student);
  saveData();
  input.value = '';
  renderStudentList();
  if (!selectedStudentId) {
    selectStudent(student.id);
  }
}

// 生徒削除
function deleteStudent(id) {
  if (!confirm('この生徒と関連する授業記録をすべて削除しますか？')) return;
  data.students = data.students.filter(s => s.id !== id);
  data.records = data.records.filter(r => r.studentId !== id);
  saveData();
  if (selectedStudentId === id) {
    selectedStudentId = data.students.length > 0 ? data.students[0].id : null;
  }
  renderStudentList();
  renderRecordSection();
}

// 授業記録保存
function saveRecord() {
  if (!selectedStudentId) return;
  const date = document.getElementById('record-date').value;
  const content = document.getElementById('record-content').value.trim();
  const homework = document.getElementById('record-homework').value.trim();
  const goal = document.getElementById('record-goal').value.trim();

  if (!date) {
    alert('授業日を入力してください');
    return;
  }
  if (!content && !homework && !goal) {
    alert('授業内容・宿題・次回目標のいずれかを入力してください');
    return;
  }

  const record = {
    id: generateId(),
    studentId: selectedStudentId,
    date,
    content,
    homework,
    goal
  };
  data.records.push(record);
  saveData();

  // フォームリセット
  document.getElementById('record-content').value = '';
  document.getElementById('record-homework').value = '';
  document.getElementById('record-goal').value = '';

  renderRecordList();
}

// 授業記録削除
function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  data.records = data.records.filter(r => r.id !== id);
  saveData();
  renderRecordList();
}

// XSS対策
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 初期化
function init() {
  loadData();

  // 今日の日付をデフォルトにセット
  document.getElementById('record-date').value = todayStr();

  // イベント登録
  document.getElementById('add-student-btn').addEventListener('click', addStudent);
  document.getElementById('student-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addStudent();
  });
  document.getElementById('save-record-btn').addEventListener('click', saveRecord);

  // 生徒がいれば最初の一人を選択
  if (data.students.length > 0) {
    selectedStudentId = data.students[0].id;
  }

  renderStudentList();
  renderRecordSection();

  // 生徒未登録時はemptySectionを表示
  if (data.students.length === 0) {
    document.getElementById('empty-section').style.display = 'block';
  }
}

init();
