(()=>{
  const game=document.getElementById('game');if(!game)return;
  const box=document.createElement('div');box.id='heroProgression';box.className='hero-progression hidden';
  box.innerHTML='<div class="progression-head"><b>⚡ HERO EVOLUTION 2.0</b><button id="progressionClose">×</button></div><div id="progressionHero"></div><div class="progression-paths"></div><div id="progressionInfo" class="progression-info"></div>';
  game.appendChild(box);
  const close=box.querySelector('#progressionClose');close.onclick=()=>box.classList.add('hidden');
  const badge=document.createElement('button');badge.id='progressionBadge';badge.className='progression-badge';badge.type='button';badge.textContent='⚡ EVO';game.appendChild(badge);badge.onclick=()=>box.classList.toggle('hidden');
  let lastLevel=1,lastStage='RISING',lastHero='';
  const data={
    warrior:{icon:'🛡️',paths:[['tank','TANK','Стальная клятва','+стойкость · защита · фронтлайн'],['bruiser','BRUISER','Ярость титана','+урон · сила в ближнем бою · давление']]},
    mage:{icon:'🔮',paths:[['burst','BURST','Арканный взрыв','+урон способностей · взрывной прокаст'],['control','CONTROL','Владыка эфира','+дальность · AoE · контроль']]},
    assassin:{icon:'🗡️',paths:[['burst','CRIT','Тень смерти','+крит · скорость · взрывной урон'],['execute','EXECUTE','Последний удар','+урон по врагам с низким HP · добивание']]}
  };
  function stage(l){return l>=8?'AWAKENED':l>=5?'ASCENDED':'RISING'}
  function render(p){
    const d=data[p.hero]||data.warrior,l=p.level||1,s=stage(l),paths=d.paths;
    box.querySelector('#progressionHero').innerHTML='<strong>'+d.icon+' '+String(p.heroName||p.hero).toUpperCase()+'</strong><span>LV '+l+' · '+s+'</span>';
    const container=box.querySelector('.progression-paths');container.innerHTML=paths.map((x,i)=>'<div class="path '+x[0]+' '+(i===0?'active':'')+'"><b>'+x[1]+'</b><strong>'+x[2]+'</strong><small>'+x[3]+'</small></div>').join('');
    const stats=p.hero==='warrior'?'🛡️ Стойкость +12%':p.hero==='mage'?'💥 Способности +6%': '🗡️ Execute +22% ниже 35% HP';
    const next=l<5?'Следующая стадия: LV 5':l<8?'Следующая стадия: LV 8':'⚡ Максимальная стадия пробуждения';
    box.querySelector('#progressionInfo').innerHTML='<b>'+stats+'</b><br>'+next;
    badge.textContent=d.icon+' '+(p.hero==='warrior'?'TANK':p.hero==='mage'?'BURST':'CRIT');
    if((l!==lastLevel||s!==lastStage||p.hero!==lastHero)&&lastLevel>1){box.classList.remove('hidden');box.animate([{transform:'translateX(-50%) scale(.94)',opacity:.5},{transform:'translateX(-50%) scale(1)',opacity:1}],{duration:300})}
    lastLevel=l;lastStage=s;lastHero=p.hero;
  }
  const NativeWS=window.WebSocket;
  window.WebSocket=class extends NativeWS{set onmessage(fn){this._prog=fn;super.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='state'){const p=(m.players||[]).find(x=>x.id===window.__pixelMeId)||(!window.__pixelMeId?(m.players||[]).find(x=>!x.isBot):null);if(p){window.__pixelMeId=p.id;render(p)}}}catch{}if(this._prog)this._prog(e)}}get onmessage(){return this._prog}};
})();