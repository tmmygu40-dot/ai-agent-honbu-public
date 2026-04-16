// ストレッチデータ
const stretchData = {
  neck: {
    label: '首のストレッチ',
    items: [
      {
        id: 'neck-1',
        name: '首の横倒し',
        how: '頭をゆっくり右に倒し、右手で軽く押さえる。左の首筋が伸びるのを感じたら、反対側も同様に行う。',
        duration: '左右各20秒'
      },
      {
        id: 'neck-2',
        name: '首の前後ストレッチ',
        how: 'あごを胸に近づけるように頭を前に倒す。次に天井を見るようにゆっくり後ろへ倒す。',
        duration: '各10秒 × 2セット'
      },
      {
        id: 'neck-3',
        name: '首回し',
        how: '肩の力を抜き、頭をゆっくり右回り・左回りに1周ずつ回す。痛みを感じたら止める。',
        duration: '各方向3回'
      },
      {
        id: 'neck-4',
        name: '首の斜め伸ばし',
        how: '右手を頭の左後方に当て、斜め前方向に軽く引く。後頭部から首の付け根を伸ばす。反対側も同様。',
        duration: '左右各15秒'
      }
    ]
  },
  shoulder: {
    label: '肩のストレッチ',
    items: [
      {
        id: 'shoulder-1',
        name: '肩甲骨寄せ',
        how: '両肘を曲げて肩の高さに上げ、肩甲骨を中央に寄せるように後ろへ引く。',
        duration: '5秒キープ × 5回'
      },
      {
        id: 'shoulder-2',
        name: 'クロスボディストレッチ',
        how: '右腕を胸の前に伸ばし、左腕で右腕を体に引き寄せる。肩の後ろ側を伸ばす。反対側も。',
        duration: '左右各20秒'
      },
      {
        id: 'shoulder-3',
        name: '肩回し',
        how: '両肩を耳に近づけるように持ち上げ、後ろ回りにゆっくり大きく回す。前回しも同様に。',
        duration: '各方向10回'
      },
      {
        id: 'shoulder-4',
        name: '腕を上げて伸ばし',
        how: '右手を頭上に伸ばし、左手で右肘を持って頭の後ろ側へ引く。上腕三頭筋と肩を伸ばす。',
        duration: '左右各20秒'
      }
    ]
  },
  back: {
    label: '背中のストレッチ',
    items: [
      {
        id: 'back-1',
        name: '猫のポーズ',
        how: '四つん這いになり、息を吐きながら背中を丸めて天井に押し上げる。息を吸いながら背中を反らせる。',
        duration: '5回繰り返す'
      },
      {
        id: 'back-2',
        name: '前屈ストレッチ',
        how: '椅子に座り、両手を太ももの上に置いてゆっくり前屈する。背中全体を伸ばす。',
        duration: '30秒キープ'
      },
      {
        id: 'back-3',
        name: '体側伸ばし',
        how: '右手を頭上に伸ばし、左側へゆっくり体を傾ける。背中の右側を伸ばす。反対側も同様。',
        duration: '左右各20秒'
      },
      {
        id: 'back-4',
        name: '肩甲骨ストレッチ',
        how: '両手を前で組み、腕を前方に伸ばして背中を丸める。肩甲骨の間を広げるように意識する。',
        duration: '20秒キープ × 3回'
      }
    ]
  },
  waist: {
    label: '腰のストレッチ',
    items: [
      {
        id: 'waist-1',
        name: '腰ひねり',
        how: '仰向けに寝て両膝を立て、膝をそろえたまま左右にゆっくり倒す。腰をひねるように意識する。',
        duration: '左右各15秒 × 2セット'
      },
      {
        id: 'waist-2',
        name: '膝抱え',
        how: '仰向けに寝て両膝を胸に引き寄せ、両手で膝を抱える。腰全体を伸ばす。',
        duration: '30秒キープ'
      },
      {
        id: 'waist-3',
        name: 'キャット＆カウ',
        how: '四つん這いで、息を吸いながら腰を沈め（カウ）、吐きながら背中を丸める（キャット）。ゆっくり繰り返す。',
        duration: '10回繰り返す'
      },
      {
        id: 'waist-4',
        name: '座位の体側伸ばし',
        how: '椅子に座り、右手を頭上に上げて左側へ体を倒す。腰の右側を伸ばす。反対側も同様。',
        duration: '左右各20秒'
      }
    ]
  },
  leg: {
    label: '脚のストレッチ',
    items: [
      {
        id: 'leg-1',
        name: 'ハムストリングス伸ばし',
        how: '床に座り、足を前に伸ばす。背筋を伸ばしたまま前屈し、つま先に手を近づける。',
        duration: '30秒キープ × 2回'
      },
      {
        id: 'leg-2',
        name: '大腿四頭筋ストレッチ',
        how: '立位で右足首を後ろから持ち、かかとをお尻に近づける。バランスが取れない場合は壁に手をつく。',
        duration: '左右各20秒'
      },
      {
        id: 'leg-3',
        name: 'ふくらはぎ伸ばし',
        how: '壁に手をついて立ち、後ろ足のかかとを床につけたまま前に重心を移す。ふくらはぎを伸ばす。',
        duration: '左右各20秒'
      },
      {
        id: 'leg-4',
        name: '内転筋ストレッチ',
        how: '足を肩幅の1.5倍に開いて立ち、右膝を曲げて体重を右に移す。左脚の内側を伸ばす。反対側も。',
        duration: '左右各20秒'
      }
    ]
  },
  whole: {
    label: '全身ストレッチ',
    items: [
      {
        id: 'whole-1',
        name: '全身伸ばし',
        how: '仰向けに寝て、両手を頭上に伸ばし、つま先も同時に遠くへ伸ばす。全身を一直線に引っ張るイメージで。',
        duration: '10秒キープ × 3回'
      },
      {
        id: 'whole-2',
        name: '立位前屈',
        how: '足を肩幅に開いて立ち、ゆっくり前屈する。膝を少し曲げてもよい。手が床に近づくまで伸ばす。',
        duration: '30秒キープ'
      },
      {
        id: 'whole-3',
        name: 'ランジ（股関節伸ばし）',
        how: '右脚を大きく前に踏み出し、後ろの左脚のひざを床に近づける。股関節前面を伸ばす。反対側も。',
        duration: '左右各20秒'
      },
      {
        id: 'whole-4',
        name: 'チャイルドポーズ',
        how: '正座から上体を前に倒し、両腕を前に伸ばして床に置く。背中・腰・股関節を全体的に伸ばす。',
        duration: '30秒〜1分'
      },
      {
        id: 'whole-5',
        name: '肩・腰の複合ツイスト',
        how: '椅子に座り、右手を椅子の背もたれに置き、上体を右にひねる。背骨・肩・腰をまとめて伸ばす。',
        duration: '左右各20秒'
      }
    ]
  }
};

// お気に入り管理
function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem('stretch_favorites') || '[]');
  } catch {
    return [];
  }
}

function saveFavorites(favs) {
  localStorage.setItem('stretch_favorites', JSON.stringify(favs));
}

function isFavorite(id) {
  return loadFavorites().includes(id);
}

function toggleFavorite(id) {
  let favs = loadFavorites();
  if (favs.includes(id)) {
    favs = favs.filter(f => f !== id);
  } else {
    favs.push(id);
  }
  saveFavorites(favs);
  return favs.includes(id);
}

// カード生成
function createStretchCard(item) {
  const card = document.createElement('div');
  card.className = 'stretch-card';
  card.dataset.id = item.id;

  const favActive = isFavorite(item.id);

  card.innerHTML = `
    <button class="fav-btn ${favActive ? 'active' : ''}" data-id="${item.id}" title="お気に入り">⭐</button>
    <div class="stretch-card-header">
      <span class="stretch-name">${item.name}</span>
      <span class="stretch-duration">${item.duration}</span>
    </div>
    <p class="stretch-how">${item.how}</p>
  `;

  card.querySelector('.fav-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const nowFav = toggleFavorite(item.id);
    btn.classList.toggle('active', nowFav);
  });

  return card;
}

// 部位選択でメニュー表示
function showMenu(partKey) {
  const data = stretchData[partKey];
  const menuTitle = document.getElementById('menu-title');
  const stretchList = document.getElementById('stretch-list');

  menuTitle.textContent = data.label;
  stretchList.innerHTML = '';
  data.items.forEach(item => {
    stretchList.appendChild(createStretchCard(item));
  });
}

// お気に入りモーダル表示
function showFavorites() {
  const favs = loadFavorites();
  const favList = document.getElementById('favorites-list');
  const noFavMsg = document.getElementById('no-favorites');

  favList.innerHTML = '';

  if (favs.length === 0) {
    noFavMsg.classList.remove('hidden');
  } else {
    noFavMsg.classList.add('hidden');
    // 全部位から該当アイテムを探す
    const allItems = Object.values(stretchData).flatMap(d => d.items);
    favs.forEach(id => {
      const item = allItems.find(i => i.id === id);
      if (item) favList.appendChild(createStretchCard(item));
    });
  }

  document.getElementById('favorites-modal').classList.remove('hidden');
}

// 初期化
function init() {
  // 部位ボタン
  document.querySelectorAll('.part-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.part-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showMenu(btn.dataset.part);
    });
  });

  // お気に入りボタン（FAB）
  document.getElementById('favorites-btn').addEventListener('click', showFavorites);

  // モーダル閉じる
  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('favorites-modal').classList.add('hidden');
  });

  document.getElementById('favorites-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('favorites-modal')) {
      document.getElementById('favorites-modal').classList.add('hidden');
    }
  });

  // 初期表示
  showMenu('neck');
}

document.addEventListener('DOMContentLoaded', init);
