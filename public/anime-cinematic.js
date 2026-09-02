(()=>{
  const game=document.getElementById('game');
  if(!game)return;
  const layer=document.createElement('div');
  layer.className='anime-cinematic';
  layer.innerHTML='<div class="ac-speed ac-speed-a"></div><div class="ac-speed ac-speed-b"></div><div class="ac-flash"></div><div class="ac-title"><b id="acTitle"></b><small id="acSub"></small></div><div class="ac-ko">K.O.</div>';
  game.appendChild(layer);
  const title=layer.querySelector('#acTitle'),sub=layer.querySelector('#acSub'),flash=layer.querySelector('.ac-flash'),ko=layer.querySelector('.ac-ko');
  let meId=null,prevKills=0,prevAlive=true,lastUltimate=0;
  function show(text,small,kind){
    title.textContent=text;sub.textContent=small||'';
    layer.classList.remove('show','ultimate','ko-show');
    if(kind)layer.classList.add(kind);
    void layer.offsetWidth;layer.classList.add(kind==='ko'?'ko-show':'show');
    clearTimeout(layer.__hide);layer.__hide=setTimeout(()=>layer.classList.remove('show','ultimate','ko-show'),kind==='ultimate'?1800:1050);
  }
  function pulse(){flash.classList.remove('hit');void flash.offsetWidth;flash.classList.add('hit');}
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    constructor(...args){
      super(...args);
      this.addEventListener('message',e=>{
        try{
          const m=JSON.parse(e.data);
          if(m.type==='state'){
            const list=Array.isArray(m.players)?m.players:[];
            const me=list.find(p=>p.id===meId)||list.find(p=>p.id===window.__pixelMeId)||list.find(p=>!p.isBot);
            if(me){meId=me.id;window.__pixelMeId=me.id;
              if(me.kills>prevKills){
                if(me.kills>=5)show('DOMINATING!',`Серия убийств ×${me.kills}`,'ko');
                else if(me.kills>=3)show('KILL STREAK',`Серия ×${me.kills}`,'ko');
                pulse();
              }
              if(prevAlive&&me.alive===false){show('K.O.', 'ВОЗРОЖДЕНИЕ ЧЕРЕЗ 5 СЕК.','ko');pulse()}
              prevKills=me.kills||0;prevAlive=me.alive!==false;
            }
          }
          if(m.type==='ability'&&m.key==='r'&&m.by===meId){
            const now=Date.now();if(now-lastUltimate>700){lastUltimate=now;show('ULTIMATE!','ПРЕДЕЛЬНАЯ АТАКА','ultimate');pulse()}
          }
        }catch{}
      });
    }
  };
})();