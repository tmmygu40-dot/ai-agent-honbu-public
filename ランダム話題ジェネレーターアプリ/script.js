const topics = [
  // 日常
  { text: '最近ハマっている習慣はありますか？', category: '日常' },
  { text: '朝型と夜型、どちらですか？', category: '日常' },
  { text: '休日の過ごし方、最近変わりましたか？', category: '日常' },
  { text: '最近笑った出来事はなんですか？', category: '日常' },
  { text: '今一番気になっているニュースは何ですか？', category: '日常' },
  { text: 'スマホを使う時間、増えましたか？減りましたか？', category: '日常' },

  // 趣味
  { text: '最近始めた趣味や、やってみたい趣味はありますか？', category: '趣味' },
  { text: '好きな音楽のジャンルを教えてください', category: '趣味' },
  { text: '読書はよくしますか？最近読んだ本は？', category: '趣味' },
  { text: '映画やドラマで最近見てよかった作品はありますか？', category: '趣味' },
  { text: 'スポーツはやりますか？見ますか？', category: '趣味' },
  { text: 'ゲームはしますか？好きなジャンルは？', category: '趣味' },

  // 仕事
  { text: '仕事でやりがいを感じる瞬間はどんなときですか？', category: '仕事' },
  { text: 'リモートワークと出社、どちらが好きですか？', category: '仕事' },
  { text: '仕事で一番大変だったエピソードを教えてください', category: '仕事' },
  { text: '今の仕事を選んだ理由を教えてください', category: '仕事' },
  { text: '仕事終わりのルーティンはありますか？', category: '仕事' },
  { text: '憧れの職業や「やってみたかった仕事」はありますか？', category: '仕事' },

  // 旅行
  { text: 'これまで行った場所で一番印象に残っているのはどこですか？', category: '旅行' },
  { text: '国内で行ってみたい場所はありますか？', category: '旅行' },
  { text: '海外旅行で行きたい国はどこですか？', category: '旅行' },
  { text: '旅行するなら一人旅派？グループ派？', category: '旅行' },
  { text: '旅行で一番楽しみにしていることは何ですか？', category: '旅行' },
  { text: '旅行先でのちょっとした失敗談はありますか？', category: '旅行' },

  // 食べ物
  { text: '好きな食べ物を教えてください', category: '食べ物' },
  { text: '最近食べておいしかったものはなんですか？', category: '食べ物' },
  { text: '自炊はしますか？得意な料理はありますか？', category: '食べ物' },
  { text: '外食でよく行くお店のジャンルは何ですか？', category: '食べ物' },
  { text: '苦手な食べ物と、食べられるようになった食べ物はありますか？', category: '食べ物' },
  { text: '甘いもの派？しょっぱいもの派？', category: '食べ物' },

  // 季節
  { text: '一番好きな季節はいつですか？その理由は？', category: '季節' },
  { text: '春の楽しみといえば何ですか？', category: '季節' },
  { text: '夏の思い出で印象深いものはありますか？', category: '季節' },
  { text: '秋といえば何を思い浮かべますか？', category: '季節' },
  { text: '冬が好きな理由・嫌いな理由を教えてください', category: '季節' },
  { text: '季節ごとの行事で楽しみにしているものはありますか？', category: '季節' },
];

let currentTopic = null;
let favorites = JSON.parse(localStorage.getItem('favTopics') || '[]');

const topicText = document.getElementById('topicText');
const topicCategory = document.getElementById('topicCategory');
const generateBtn = document.getElementById('generateBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const favoritesList = document.getElementById('favoritesList');
const favCount = document.getElementById('favCount');
const categorySelect = document.getElementById('category');

function getFiltered() {
  const cat = categorySelect.value;
  return cat === 'all' ? topics : topics.filter(t => t.category === cat);
}

function generate() {
  const filtered = getFiltered();
  if (filtered.length === 0) return;

  let next;
  do {
    next = filtered[Math.floor(Math.random() * filtered.length)];
  } while (filtered.length > 1 && next === currentTopic);

  currentTopic = next;
  topicText.textContent = next.text;
  topicCategory.textContent = next.category;

  favoriteBtn.disabled = false;
  favoriteBtn.classList.remove('added');
  favoriteBtn.textContent = '⭐ お気に入り追加';

  const alreadyFav = favorites.some(f => f.text === next.text);
  if (alreadyFav) {
    favoriteBtn.classList.add('added');
    favoriteBtn.textContent = '⭐ 追加済み';
  }
}

function addFavorite() {
  if (!currentTopic) return;
  const alreadyFav = favorites.some(f => f.text === currentTopic.text);
  if (alreadyFav) return;

  favorites.push({ text: currentTopic.text, category: currentTopic.category });
  saveFavorites();
  renderFavorites();

  favoriteBtn.classList.add('added');
  favoriteBtn.textContent = '⭐ 追加済み';
}

function deleteFavorite(index) {
  favorites.splice(index, 1);
  saveFavorites();
  renderFavorites();

  if (currentTopic) {
    const alreadyFav = favorites.some(f => f.text === currentTopic.text);
    if (!alreadyFav) {
      favoriteBtn.classList.remove('added');
      favoriteBtn.textContent = '⭐ お気に入り追加';
    }
  }
}

function saveFavorites() {
  localStorage.setItem('favTopics', JSON.stringify(favorites));
}

function renderFavorites() {
  favCount.textContent = favorites.length;
  favoritesList.innerHTML = '';

  if (favorites.length === 0) {
    favoritesList.innerHTML = '<p class="empty-msg">お気に入りはまだありません</p>';
    return;
  }

  favorites.forEach((fav, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="fav-text">${fav.text}</span>
      <span class="fav-category">${fav.category}</span>
      <button class="fav-delete" aria-label="削除">✕</button>
    `;
    li.querySelector('.fav-delete').addEventListener('click', () => deleteFavorite(index));
    favoritesList.appendChild(li);
  });
}

generateBtn.addEventListener('click', generate);
favoriteBtn.addEventListener('click', addFavorite);

renderFavorites();
