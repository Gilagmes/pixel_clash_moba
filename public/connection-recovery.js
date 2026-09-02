(()=>{
  const originalConnect=window.connect;
  if(typeof originalConnect!=="function")return;
  let attempt=0,connecting=false;
  window.connect=function(){
    if(connecting)return;
    connecting=true;
    attempt++;
    try{if(window.ws&&window.ws.readyState===WebSocket.OPEN){connecting=false;return}}catch{}
    const proto=location.protocol==="https:"?"wss:":"ws:";
    const url=`${proto}//${location.host}`;
    try{
      if(window.ws&&window.ws.readyState===WebSocket.CONNECTING)window.ws.close();
      const socket=new WebSocket(url);
      window.ws=socket;
      statusEl.textContent="Подключение...";
      const timer=setTimeout(()=>{if(socket.readyState===WebSocket.CONNECTING){try{socket.close()}catch{}statusEl.textContent="Сервер не отвечает"}},7000);
      socket.addEventListener("open",()=>{clearTimeout(timer);connecting=false;attempt=0;statusEl.textContent="Поиск игроков...";me=null;socket.send(JSON.stringify({type:"join",mode,name:playerName(),hero}))},{once:true});
      socket.addEventListener("error",()=>{clearTimeout(timer);connecting=false;if(!finished)statusEl.textContent="Ошибка соединения"},{once:true});
      socket.addEventListener("close",()=>{clearTimeout(timer);connecting=false;if(!game.classList.contains("hidden")&&!finished){statusEl.textContent=attempt<4?"Переподключение...":"Сервер недоступен";clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>window.connect(),attempt<4?1500:4000)}});
    }catch(e){connecting=false;statusEl.textContent="Не удалось подключиться";clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>window.connect(),2500)}
  };
})();
