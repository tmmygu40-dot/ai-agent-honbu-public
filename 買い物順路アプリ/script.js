// データ管理
const STORAGE_AISLES = "shopping_aisles";
const STORAGE_ITEMS  = "shopping_items";
let aisles = [];
let items  = [];
function loadData() {
  try {
    aisles = JSON.parse(localStorage.getItem(STORAGE_AISLES)) || [];
    items  = JSON.parse(localStorage.getItem(STORAGE_ITEMS))  || [];
  } catch(e) { aisles = []; items = []; }
}
function saveData() {
  localStorage.setItem(STORAGE_AISLES, JSON.stringify(aisles));
  localStorage.setItem(STORAGE_ITEMS,  JSON.stringify(items));
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function addAisle(name) {
  name = name.trim();
  if (!name) return false;
  aisles.push({ id: genId(), name: name });
  saveData(); return true;
}
function deleteAisle(id) {
  aisles = aisles.filter(function(a) { return a.id !== id; });
  items = items.map(function(item) { return item.aisleId === id ? Object.assign({}, item, {aisleId: ""}) : item; });
  saveData();
}
function moveAisle(id, dir) {
  var idx = aisles.findIndex(function(a) { return a.id === id; });
  var target = idx + dir;
  if (target < 0 || target >= aisles.length) return;
  var tmp = aisles[idx]; aisles[idx] = aisles[target]; aisles[target] = tmp;
  saveData();
}
function addItem(name, aisleId) {
  name = name.trim();
  if (!name) return false;
  items.push({ id: genId(), name: name, aisleId: aisleId, checked: false });
  saveData(); return true;
}
function deleteItem(id) { items = items.filter(function(i) { return i.id !== id; }); saveData(); }
function toggleItem(id) {
  var item = items.find(function(i) { return i.id === id; });
  if (item) { item.checked = !item.checked; saveData(); }
}
function clearChecked() { items = items.filter(function(i) { return !i.checked; }); saveData(); }
function getSortedItems() {
  var aisleOrder = {};
  aisles.forEach(function(a, idx) { aisleOrder[a.id] = idx; });
  return items.slice().sort(function(a, b) {
    var ai = a.aisleId in aisleOrder ? aisleOrder[a.aisleId] : 9999;
    var bi = b.aisleId in aisleOrder ? aisleOrder[b.aisleId] : 9999;
    return ai - bi;
  });
}
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function refreshAisleSelect() {
  var sel = document.getElementById("item-aisle");
  var current = sel.value;
  sel.innerHTML = "<option value="">売り場を選択</option>";
  aisles.forEach(function(a) {
    var opt = document.createElement("option");
    opt.value = a.id; opt.textContent = a.name;
    if (a.id === current) opt.selected = true;
    sel.appendChild(opt);
  });
}
function renderShoppingList() {
  var ul = document.getElementById("shopping-list");
  var count = document.getElementById("item-count");
  ul.innerHTML = "";
  var sorted = getSortedItems();
  count.textContent = sorted.length;
  if (sorted.length === 0) { ul.innerHTML = "<li class="empty-message">商品がありません</li>"; return; }
  var aisleMap = {};
  aisles.forEach(function(a) { aisleMap[a.id] = a.name; });
  var lastAisleId = undefined;
  sorted.forEach(function(item) {
    if (item.aisleId !== lastAisleId) {
      var headerLi = document.createElement("li");
      headerLi.className = "aisle-group-header";
      headerLi.textContent = (item.aisleId && aisleMap[item.aisleId]) ? aisleMap[item.aisleId] : "売り場未設定";
      ul.appendChild(headerLi);
      lastAisleId = item.aisleId;
    }
    var li = document.createElement("li");
    var aisleLabel = (item.aisleId && aisleMap[item.aisleId]) ? escHtml(aisleMap[item.aisleId]) : "売り場未設定";
    var chk = item.checked ? " checked" : "";
    var cls = item.checked ? " checked" : "";
    li.innerHTML =
      "<div class="shopping-item">" +
      "<input type="checkbox" class="item-check" data-id="" + item.id + """ + chk + ">" +
      "<div class="item-info">" +
      "<div class="item-name" + cls + "">" + escHtml(item.name) + "</div>" +
      "<div class="item-aisle-label">" + aisleLabel + "</div>" +
      "</div>" +
      "<button class="delete-btn" data-id="" + item.id + "" title="削除">✕</button>" +
      "</div>";
    ul.appendChild(li);
  });
}
function renderAisleList() {
  var ul = document.getElementById("aisle-list");
  ul.innerHTML = "";
  if (aisles.length === 0) { ul.innerHTML = "<li class="empty-message">売り場がありません</li>"; return; }
  aisles.forEach(function(aisle, idx) {
    var li = document.createElement("li");
    var upDis = idx === 0 ? " disabled" : "";
    var dnDis = idx === aisles.length - 1 ? " disabled" : "";
    li.innerHTML =
      "<div class="aisle-item">" +
      "<span class="aisle-order">" + (idx + 1) + "</span>" +
      "<span class="aisle-name">" + escHtml(aisle.name) + "</span>" +
      "<div class="aisle-controls">" +
      "<button class="aisle-up" data-id="" + aisle.id + """ + upDis + ">↑</button>" +
      "<button class="aisle-down" data-id="" + aisle.id + """ + dnDis + ">↓</button>" +
      "<button class="aisle-del" data-id="" + aisle.id + "" style="color:#e74c3c">✕</button>" +
      "</div></div>";
    ul.appendChild(li);
  });
}
function renderAll() { refreshAisleSelect(); renderShoppingList(); renderAisleList(); }
document.addEventListener("DOMContentLoaded", function() {
  loadData();
  renderAll();
  document.querySelectorAll(".tab-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("active"); });
      document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); });
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
  document.getElementById("add-item-btn").addEventListener("click", function() {
    var name = document.getElementById("item-name").value;
    var aisleId = document.getElementById("item-aisle").value;
    if (addItem(name, aisleId)) { document.getElementById("item-name").value = ""; renderAll(); }
  });
  document.getElementById("item-name").addEventListener("keydown", function(e) {
    if (e.key === "Enter") document.getElementById("add-item-btn").click();
  });
  document.getElementById("clear-checked-btn").addEventListener("click", function() {
    if (items.some(function(i) { return i.checked; })) { clearChecked(); renderAll(); }
  });
  document.getElementById("shopping-list").addEventListener("click", function(e) {
    var check = e.target.closest(".item-check");
    var del   = e.target.closest(".delete-btn");
    if (check) { toggleItem(check.dataset.id); renderAll(); }
    else if (del) { deleteItem(del.dataset.id); renderAll(); }
  });
  document.getElementById("add-aisle-btn").addEventListener("click", function() {
    var name = document.getElementById("aisle-name").value;
    if (addAisle(name)) { document.getElementById("aisle-name").value = ""; renderAll(); }
  });
  document.getElementById("aisle-name").addEventListener("keydown", function(e) {
    if (e.key === "Enter") document.getElementById("add-aisle-btn").click();
  });
  document.getElementById("aisle-list").addEventListener("click", function(e) {
    var up  = e.target.closest(".aisle-up");
    var dn  = e.target.closest(".aisle-down");
    var del = e.target.closest(".aisle-del");
    if (up)  { moveAisle(up.dataset.id, -1); renderAll(); }
    if (dn)  { moveAisle(dn.dataset.id,  1); renderAll(); }
    if (del) { deleteAisle(del.dataset.id); renderAll(); }
  });
});
