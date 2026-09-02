(()=>{
  const boot=()=>{
    const NativeWS=window.WebSocket;let socket=null;
    window.WebSocket=class extends NativeWS{constructor(...args){super(...args);socket=this;this.addEventListener('close',()=>{if(socket===this)socket=null},{passive:true})}};
    const send=payload=>{if(socket&&socket.readyState===NativeWS.OPEN){socket.send(JSON.stringify(payload));return true}return false};
    const buttons={q:'skill',w:'abilityW',e:'abilityE',r:'abilityR'};
    const fireAbility=key=>{if(send({type:'ability',key})){const b=document.getElementById(buttons[key]);if(b){b.classList.add('pressed');setTimeout(()=>b.classList.remove('pressed'),160)}}};
    ['q','w','e','r'].forEach(k=>{const b=document.getElementById(buttons[k]);if(!b)return;b.disabled=false;b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();fireAbility(k)},true)});
    document.addEventListener('click',e=>{
      const buy=e.target.closest?.('[data-buy]');if(buy){e.preventDefault();e.stopPropagation();send({type:'buy',item:buy.dataset.buy});return}
      const up=e.target.closest?.('[data-upgrade]');if(up){e.preventDefault();e.stopPropagation();send({type:'upgrade',key:up.dataset.upgrade});return}
    },true);
    const shopToggle=document.getElementById('shopToggle'),shopPanel=document.getElementById('shopPanel');
    if(shopToggle&&shopPanel)shopToggle.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();shopPanel.classList.toggle('hidden')},true);
    const upgradeToggle=document.getElementById('upgradeToggle'),upgradePanel=document.getElementById('upgradePanel');
    if(upgradeToggle&&upgradePanel)upgradeToggle.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();upgradePanel.classList.toggle('hidden')},true);
    window.pixelInteractionFix={fireAbility};
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
