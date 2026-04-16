const STORAGE_KEY = 'familyHealthCards';

let members = [];

function loadMembers() {
  const data = localStorage.getItem(STORAGE_KEY);
  members = data ? JSON.parse(data) : [];
}

function saveMembers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function calcAge(birthdate) {
  if (!birthdate) return '';
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age + '歳';
}

function renderCards() {
  const list = document.getElementById('cardsList');
  const emptyMsg = document.getElementById('emptyMsg');
  const countEl = document.getElementById('memberCount');

  countEl.textContent = members.length;

  if (members.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  list.innerHTML = members.map(m => {
    const agePart = m.birthdate ? `（${m.birthdate} / ${calcAge(m.birthdate)}）` : '';
    const bloodPart = m.bloodtype ? m.bloodtype : '不明';

    return `
      <div class="health-card" id="card-${m.id}">
        <div class="card-header">
          <div>
            <div class="card-name">${escapeHtml(m.name)}</div>
            <div class="card-meta">${escapeHtml(agePart)} 血液型：${escapeHtml(bloodPart)}</div>
          </div>
          <div class="card-actions no-print">
            <button class="btn-edit" onclick="openEdit('${m.id}')">編集</button>
            <button class="btn-delete" onclick="deleteMember('${m.id}')">削除</button>
          </div>
        </div>
        <div class="card-body">
          <div class="card-field full-width">
            <div class="field-label">🚨 アレルギー</div>
            <div class="field-value ${m.allergies ? 'alert' : 'empty'}">${m.allergies ? escapeHtml(m.allergies) : '特になし'}</div>
          </div>
          <div class="card-field full-width">
            <div class="field-label">🏥 持病・既往歴</div>
            <div class="field-value ${m.conditions ? '' : 'empty'}">${m.conditions ? escapeHtml(m.conditions) : '特になし'}</div>
          </div>
          <div class="card-field full-width">
            <div class="field-label">💊 常備薬</div>
            <div class="field-value ${m.medications ? '' : 'empty'}">${m.medications ? escapeHtml(m.medications) : '特になし'}</div>
          </div>
          <div class="card-field">
            <div class="field-label">👨‍⚕️ かかりつけ医</div>
            <div class="field-value ${m.doctor ? '' : 'empty'}">${m.doctor ? escapeHtml(m.doctor) : '未登録'}</div>
          </div>
          <div class="card-field">
            <div class="field-label">📞 緊急連絡先</div>
            <div class="field-value ${m.emergency ? '' : 'empty'}">${m.emergency ? escapeHtml(m.emergency) : '未登録'}</div>
          </div>
          ${m.notes ? `
          <div class="card-field full-width">
            <div class="field-label">📝 その他メモ</div>
            <div class="field-value">${escapeHtml(m.notes)}</div>
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFormValues(prefix) {
  const p = prefix || '';
  return {
    name: document.getElementById(p + 'name').value.trim(),
    birthdate: document.getElementById(p + 'birthdate').value,
    bloodtype: document.getElementById(p + 'bloodtype').value,
    conditions: document.getElementById(p + 'conditions').value.trim(),
    medications: document.getElementById(p + 'medications').value.trim(),
    allergies: document.getElementById(p + 'allergies').value.trim(),
    doctor: document.getElementById(p + 'doctor').value.trim(),
    emergency: document.getElementById(p + 'emergency').value.trim(),
    notes: document.getElementById(p + 'notes').value.trim(),
  };
}

function clearForm() {
  ['name', 'birthdate', 'bloodtype', 'conditions', 'medications', 'allergies', 'doctor', 'emergency', 'notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el.tagName === 'SELECT') el.value = '';
    else el.value = '';
  });
}

// 追加
document.getElementById('addBtn').addEventListener('click', () => {
  const values = getFormValues('');
  if (!values.name) {
    alert('名前は必須です');
    document.getElementById('name').focus();
    return;
  }
  const member = { id: generateId(), ...values };
  members.push(member);
  saveMembers();
  clearForm();
  renderCards();
});

// 削除
function deleteMember(id) {
  if (!confirm('このメンバーを削除しますか？')) return;
  members = members.filter(m => m.id !== id);
  saveMembers();
  renderCards();
}

// 編集モーダルを開く
function openEdit(id) {
  const m = members.find(x => x.id === id);
  if (!m) return;

  document.getElementById('editId').value = m.id;
  document.getElementById('editName').value = m.name;
  document.getElementById('editBirthdate').value = m.birthdate || '';
  document.getElementById('editBloodtype').value = m.bloodtype || '';
  document.getElementById('editConditions').value = m.conditions || '';
  document.getElementById('editMedications').value = m.medications || '';
  document.getElementById('editAllergies').value = m.allergies || '';
  document.getElementById('editDoctor').value = m.doctor || '';
  document.getElementById('editEmergency').value = m.emergency || '';
  document.getElementById('editNotes').value = m.notes || '';

  document.getElementById('editModal').style.display = 'flex';
}

// 編集保存
document.getElementById('saveEditBtn').addEventListener('click', () => {
  const id = document.getElementById('editId').value;
  const values = getFormValues('edit');
  if (!values.name) {
    alert('名前は必須です');
    document.getElementById('editName').focus();
    return;
  }
  const idx = members.findIndex(m => m.id === id);
  if (idx !== -1) {
    members[idx] = { id, ...values };
    saveMembers();
    renderCards();
  }
  document.getElementById('editModal').style.display = 'none';
});

// 編集キャンセル
document.getElementById('cancelEditBtn').addEventListener('click', () => {
  document.getElementById('editModal').style.display = 'none';
});

// モーダル外クリックで閉じる
document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('editModal')) {
    document.getElementById('editModal').style.display = 'none';
  }
});

// 印刷
document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

// 初期化
loadMembers();
renderCards();
