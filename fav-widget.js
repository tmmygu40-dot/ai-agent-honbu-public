(function(){
  var KEY='ai_honbu_favs';
  function getFavs(){try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return[];}}
  function setFavs(a){try{localStorage.setItem(KEY,JSON.stringify(a));}catch(e){}}
  function isFav(href){return getFavs().some(function(f){return f.href===href;});}
  function toggleFav(href,name){
    var a=getFavs(),i=a.findIndex(function(f){return f.href===href;});
    if(i>=0)a.splice(i,1);else a.push({name:name,href:href});
    setFavs(a);
  }

  // href を ./フォルダ名/ 形式に正規化
  var parts=window.location.pathname.replace(/\/$/,'').split('/').filter(Boolean);
  var folder=parts[parts.length-1]||'';
  var href='./'+folder+'/';

  // アプリ名取得（h1優先、なければtitle）
  var h1=document.querySelector('h1');
  var name=h1?h1.textContent.trim():document.title.trim();

  // ボタン生成
  var btn=document.createElement('button');
  btn.id='fav-widget-btn';
  btn.title=isFav(href)?'お気に入り解除':'お気に入りに追加';
  btn.style.cssText=[
    'position:fixed','top:12px','right:12px','z-index:9999',
    'background:#fff8ee','border:2px solid #e07b00','border-radius:24px',
    'min-width:40px','height:auto','padding:6px 10px',
    'font-size:1.2rem','line-height:1',
    'cursor:pointer','color:#f5a623','box-shadow:0 2px 6px rgba(0,0,0,0.15)',
    '-webkit-tap-highlight-color:transparent','transition:all 0.15s',
    'display:flex','align-items:center','gap:4px'
  ].join(';');

  var star=document.createElement('span');
  star.textContent=isFav(href)?'★':'☆';
  var label=document.createElement('span');
  label.textContent='お気に入り';
  label.style.cssText='font-size:0.6rem;font-weight:600;white-space:nowrap;';
  btn.appendChild(star);
  btn.appendChild(label);

  btn.addEventListener('click',function(){
    toggleFav(href,name);
    var on=isFav(href);
    star.textContent=on?'★':'☆';
    btn.title=on?'お気に入り解除':'お気に入りに追加';
    btn.style.color=on?'#f5a623':'#ccc';
  });

  // 初期色
  if(!isFav(href))btn.style.color='#ccc';

  document.body.appendChild(btn);
})();