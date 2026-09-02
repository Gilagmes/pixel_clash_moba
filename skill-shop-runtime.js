const fs=require('fs');
const original=fs.readFileSync;
fs.readFileSync=function(file,...args){let text=original.call(this,file,...args);if(String(file).endsWith('server.js')&&typeof text==='string'){text=text.replace(/skillPoints:0,skillLevels:/,'skillPoints:1,skillLevels:');}return text};
require('./bot-runtime');
