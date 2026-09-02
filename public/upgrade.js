const upgradeToggle=document.getElementById("upgradeToggle"),upgradePanel=document.getElementById("upgradePanel");
function refreshUpgrades(){const points=me?.skillPoints||0;if(upgradeToggle)upgradeToggle.textContent=`⭐ НАВЫКИ (${points})`;document.querySelectorAll("[data-upgrade]").forEach(b=>{const k=b.dataset.upgrade,lvl=me?.skillLevels?.[k]||1;b.querySelector("small").textContent=`ур. ${lvl}/5`;b.disabled=!me?.alive||points<1||lvl>=5})}
upgradeToggle?.addEventListener("click",()=>upgradePanel?.classList.toggle("hidden"));
document.querySelectorAll("[data-upgrade]").forEach(b=>b.addEventListener("click",()=>{if(ws?.readyState===WebSocket.OPEN&&me?.alive&&me.skillPoints>0)ws.send(JSON.stringify({type:"upgrade",key:b.dataset.upgrade}))}));
setInterval(refreshUpgrades,250);