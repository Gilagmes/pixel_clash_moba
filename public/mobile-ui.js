(()=>{
  const game=document.getElementById('game');
  if(!game)return;
  const controls=document.querySelector('.controls');
  const shop=document.querySelector('.shop');
  const upgrades=document.querySelector('.upgrades');
  if(!controls||!shop||!upgrades)return;

  const arsenal=document.createElement('div');
  arsenal.className='arsenal';
  arsenal.innerHTML='<button id="arsenalToggle" class="arsenal-toggle">🧰</button><div id="arsenalPanel" class="arsenal-panel hidden"><div class="arsenal-title">АРСЕНАЛ</div></div>';
  game.appendChild(arsenal);
  const panel=arsenal.querySelector('.arsenal-panel');
  const toggle=arsenal.querySelector('#arsenalToggle');

  const shopPanel=document.getElementById('shopPanel');
  const upgradePanel=document.getElementById('upgradePanel');
  if(shopPanel){
    const title=document.createElement('div'); title.className='arsenal-section-title'; title.textContent='🛒 МАГАЗИН';
    panel.appendChild(title); panel.appendChild(shopPanel);
  }
  if(upgradePanel){
    const title=document.createElement('div'); title.className='arsenal-section-title'; title.textContent='⭐ НАВЫКИ';
    panel.appendChild(title); panel.appendChild(upgradePanel);
  }
  shop.classList.add('legacy-hidden');
  upgrades.classList.add('legacy-hidden');

  toggle.addEventListener('click',()=>panel.classList.toggle('hidden'));
  panel.addEventListener('click',e=>{if(e.target.closest('button[data-buy],button[data-upgrade]'))panel.classList.add('hidden')});

  const target=document.createElement('button');
  target.id='targetLock';
  target.className='target-lock';
  target.type='button';
  target.textContent='🎯';
  target.title='Ближайшая цель';
  controls.appendChild(target);
  target.addEventListener('click',()=>{
    target.classList.toggle('active');
    target.textContent=target.classList.contains('active')?'🔒':'🎯';
  });

  const hud=document.getElementById('combatHud');
  if(hud){
    const collapse=document.createElement('button');
    collapse.className='hud-collapse';
    collapse.textContent='⌄';
    collapse.type='button';
    hud.appendChild(collapse);
    collapse.addEventListener('click',()=>{
      hud.classList.toggle('compact');
      collapse.textContent=hud.classList.contains('compact')?'⌃':'⌄';
    });
    if(matchMedia('(max-width:520px)').matches)hud.classList.add('compact');
  }
})();
