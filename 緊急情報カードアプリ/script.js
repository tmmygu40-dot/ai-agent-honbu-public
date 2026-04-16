// ===== データ =====
let data = {
  name: '',
  birthdate: '',
  bloodType: '',
  contacts: [],   // { name, relation, phone }
  conditions: [], // string[]
  medicines: [],  // string[]
  allergies: []   // string[]
};

// ===== 初期化 =====
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();

  document.getElementById('showCardBtn').addEventListener('click', showCard);
  document.getElementById('closeCardBtn').addEventListener('click', showSettings);
});

// ===== localStorage =====
function loadData() {
  const saved = localStorage.getItem('emergencyCard');
  if (saved) {
    try { data = JSON.parse(saved); } catch(e) {}
  }
  // フォームに反映
  document.getElementById('myName').value = data.name || '';
  document.getElementById('myBirthdate').value = data.birthdate || '';
  document.getElementById('myBloodType').value = data.bloodType || '';
}

function saveAll() {
  data.name = document.getElementById('myName').value.trim();
  data.birthdate = document.getElementById('myBirthdate').value;
  data.bloodType = document.getElementById('myBloodType').value;
  localStorage.setItem('emergencyCard', JSON.stringify(data));
  const msg = document.getElementById('saveMsg');
  msg.textContent = '保存しました ✓';
  setTimeout(() => { msg.textContent = ''; }, 2000);
}

// ===== 緊急連絡先 =====
function addContact() {
  const name = document.getElementById('contactName').value.trim();
  const relation = document.getElementById('contactRelation').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  if (!name && !phone) return;
  data.contacts.push({ name, relation, phone });
  document.getElementById('contactName').value = '';
  document.getElementById('contactRelation').value = '';
  document.getElementById('contactPhone').value = '';
  saveAll();
  renderContacts();
}

function deleteContact(i) {
  data.contacts.splice(i, 1);
  saveAll();
  renderContacts();
}

function renderContacts() {
  const el = document.getElementById('contactList');
  el.innerHTML = data.contacts.map((c, i) => `
    <div class="item-row">
      <div class="item-text">
        <span>${escape(c.name)}</span>
        ${c.relation ? `<span class="item-sub">（${escape(c.relation)}）</span>` : ''}
        ${c.phone ? `<span class="item-sub"> ${escape(c.phone)}</span>` : ''}
      </div>
      <button class="btn-delete" onclick="deleteContact(${i})">✕</button>
    </div>
  `).join('');
}

// ===== 持病 =====
function addCondition() {
  const val = document.getElementById('conditionInput').value.trim();
  if (!val) return;
  data.conditions.push(val);
  document.getElementById('conditionInput').value = '';
  saveAll();
  renderConditions();
}

function deleteCondition(i) {
  data.conditions.splice(i, 1);
  saveAll();
  renderConditions();
}

function renderConditions() {
  renderStringList('conditionList', data.conditions, 'deleteCondition');
}

// ===== 常備薬 =====
function addMedicine() {
  const val = document.getElementById('medicineInput').value.trim();
  if (!val) return;
  data.medicines.push(val);
  document.getElementById('medicineInput').value = '';
  saveAll();
  renderMedicines();
}

function deleteMedicine(i) {
  data.medicines.splice(i, 1);
  saveAll();
  renderMedicines();
}

function renderMedicines() {
  renderStringList('medicineList', data.medicines, 'deleteMedicine');
}

// ===== アレルギー =====
function addAllergy() {
  const val = document.getElementById('allergyInput').value.trim();
  if (!val) return;
  data.allergies.push(val);
  document.getElementById('allergyInput').value = '';
  saveAll();
  renderAllergies();
}

function deleteAllergy(i) {
  data.allergies.splice(i, 1);
  saveAll();
  renderAllergies();
}

function renderAllergies() {
  renderStringList('allergyList', data.allergies, 'deleteAllergy');
}

// ===== 汎用リスト描画 =====
function renderStringList(containerId, arr, deleteFn) {
  const el = document.getElementById(containerId);
  el.innerHTML = arr.map((v, i) => `
    <div class="item-row">
      <span class="item-text">${escape(v)}</span>
      <button class="btn-delete" onclick="${deleteFn}(${i})">✕</button>
    </div>
  `).join('');
}

function renderAll() {
  renderContacts();
  renderConditions();
  renderMedicines();
  renderAllergies();
}

// ===== エスケープ =====
function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== カード表示 =====
function showCard() {
  // 保存
  saveAll();

  // 氏名
  document.getElementById('cardName').textContent = data.name || '（氏名未設定）';

  // 生年月日・血液型
  const meta = [];
  if (data.birthdate) {
    const d = new Date(data.birthdate);
    const age = calcAge(d);
    meta.push(`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日生（${age}歳）`);
  }
  if (data.bloodType) meta.push(`${data.bloodType}型`);
  document.getElementById('cardMeta').textContent = meta.join('　');

  // 緊急連絡先
  const contactsEl = document.getElementById('cardContacts');
  const contactsSection = document.getElementById('cardContactsSection');
  if (data.contacts.length > 0) {
    contactsEl.className = 'card-section-body';
    contactsEl.innerHTML = data.contacts.map(c => `
      <div class="contact-card-item">
        <div class="contact-card-relation">${escape(c.relation || '')}</div>
        <div class="contact-card-name">${escape(c.name || '')}</div>
        <div class="contact-card-phone">${escape(c.phone || '')}</div>
      </div>
    `).join('');
    contactsSection.classList.remove('hidden');
  } else {
    contactsSection.classList.add('hidden');
  }

  // 持病
  renderCardTags('cardConditions', 'cardConditionsSection', data.conditions);
  // 常備薬
  renderCardTags('cardMedicines', 'cardMedicinesSection', data.medicines);
  // アレルギー
  renderCardTags('cardAllergies', 'cardAllergiesSection', data.allergies);

  document.getElementById('settingsScreen').classList.add('hidden');
  document.getElementById('cardScreen').classList.remove('hidden');
}

function renderCardTags(listId, sectionId, arr) {
  const section = document.getElementById(sectionId);
  if (arr.length > 0) {
    const el = document.getElementById(listId);
    el.className = 'tag-list';
    el.innerHTML = arr.map(v => `<span class="tag">${escape(v)}</span>`).join('');
    section.classList.remove('hidden');
  } else {
    section.classList.add('hidden');
  }
}

function showSettings() {
  if (document.fullscreenElement) document.exitFullscreen();
  document.getElementById('cardScreen').classList.add('hidden');
  document.getElementById('settingsScreen').classList.remove('hidden');
}

// ===== フルスクリーン =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

// ===== 年齢計算 =====
function calcAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}
