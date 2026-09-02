(()=>{
  const game=document.getElementById('game');
  if(!game)return;
  const box=document.createElement('div');
  box.id='heroProgression';
  box.className='hero-progression hidden';
  box.innerHTML='<div class="progression-head"><b>⚡ HERO EVOLUTION</b><button id="progressionClose">×</button></div><div id="progressionHero"></div><div class="progression-paths"><div class="path tank"><b>🛡️ TANK</b><small>Выносливость · защита · контроль</small></div><div class="path burst"><b>💥 BURST</b><small>Сильные способности · крит · взрывной урон</small></div><div class="path control"><b>✨ CONTROL</b><small>Дальность · AoE · замедление</small></div></div><div id="progressionInfo" class="progression-info">Получай уровни в бою, чтобы открыть следующую стадию.</div>';
  game.appendChild(box);
  const close=box.querySelector('#progressionClose');
  close.onclick=()=>box.classList.add('hidden');
  const badge=document.createElement('button');
  badge.id='progressionBadge';badge.className='progression-badge';badge.type='button';badge.textContent='⚡ EVO';
  game.appendChild(badge);badge.onclick=()=>box.classList.toggle('hidden');
  let ws=null,lastLevel=1,lastHero='warrior';
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{
    set onmessage(fn){this._prog=fn;super.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='state'){const p=(m.players||[]).find(x=>x.id===window.__pixelMeId);if(p){lastLevel=p.level||1;lastHero=p.hero||'warrior';render(p)}}}catch{}if(this._prog)this._prog(e)}}
    get onmessage(){return this._prog}
  };
  function render(p){
    const stage=p.level>=8?'AWAKENED':p.level>=5?'ASCENDED':'RISING';
    const paths={warrior:['TANK','BRUISER'],mage:['BURST','CONTROL'],assassin:['BURST','EXECUTE']};
    const main=paths[p.hero]?.[0]||'TANK',alt=paths[p.hero]?.[1]||'BRUISER';
    box.querySelector('#progressionHero').innerHTML='<strong>'+String(p.heroName||p.hero).toUpperCase()+'</strong><span>LV '+(p.level||1)+' · '+stage+'</span>';
    box.querySelectorAll('.path').forEach(x=>x.classList.remove('active'));
    const a=box.querySelector('.path.'+(main==='TANK'?'tank':main==='BURST'?'burst':'control'));if(a)a.classList.add('active');
    box.querySelector('#progressionInfo').textContent=p.level>=8?'AWAKENED: максимальная боевая стадия открыта.':p.level>=5?'ASCENDED: усиленная стадия героя. Следующая — LV 8.':'RISING: LV 5 откроет Ascended-стадию.';
    badge.textContent='⚡ '+main;
    if(p.level!==lastLevel){box.classList.remove('hidden');lastLevel=p.level}
  }
  badge.addEventListener('click',()=>box.classList.toggle('hidden'));
})();