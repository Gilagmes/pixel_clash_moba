const LANES=[180,450,720];
const BOT_NAMES=["Pixel","Nova","Byte","Rex","Luna","Volt","Kiro","Echo","Zed"];
const HEROES=["warrior","mage","assassin"];
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function ensureBots(room){
  if(!room||room.finished||!room.players.length)return;
  if(room.botSpawnAt==null)room.botSpawnAt=Date.now()+3500;
  if(Date.now()<room.botSpawnAt)return;
  const humans=room.players.filter(p=>!p.isBot).length;
  const wanted=room.maxPlayers-humans;
  let bots=room.players.filter(p=>p.isBot);
  while(bots.length<wanted){
    const i=room.players.length,team=i<room.maxPlayers/2?1:2;
    const hero=HEROES[(bots.length+team)%HEROES.length];
    const stats={warrior:[130,16,150,1],mage:[90,10,180,1],assassin:[80,22,140,1.18]}[hero];
    const bot={id:`bot-${Math.random().toString(36).slice(2,9)}`,name:BOT_NAMES[bots.length%BOT_NAMES.length],hero,heroName:hero[0].toUpperCase()+hero.slice(1),team,x:team===1?115:885,y:LANES[bots.length%3],hp:stats[0],maxHp:stats[0],alive:true,respawnAt:0,gold:500,kills:0,deaths:0,damageBonus:0,speedBonus:0,inventory:[],level:1,xp:0,skillPoints:0,skillLevels:{q:1,w:1,e:1,r:1},isBot:true,botAttackAt:0,botSkillAt:0,botLane:LANES[bots.length%3]};
    room.players.push(bot);bots.push(bot);
  }
}
function gainXp(p,n){while(p.level<10&&p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.skillPoints++;p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+12);p.damageBonus+=2}}
function damage(room,attacker,target,amount){if(!target.alive)return;target.hp=Math.max(0,target.hp-amount);if(target.hp>0)return;target.alive=false;target.deaths=(target.deaths||0)+1;target.respawnAt=Date.now()+5000;if(attacker&&attacker.isBot){attacker.kills++;attacker.gold+=100;gainXp(attacker,100)}}
function tickBots(room){
  const now=Date.now();
  for(const b of room.players.filter(p=>p.isBot)){
    if(!b.alive){if(b.respawnAt&&now>=b.respawnAt){b.alive=true;b.hp=b.maxHp;b.x=b.team===1?115:885;b.y=b.botLane||LANES[0];b.respawnAt=0}continue}
    const enemyPlayers=room.players.filter(p=>p.alive&&!p.isBot&&p.team!==b.team);
    const enemyMinions=room.minions.filter(m=>m.hp>0&&m.team!==b.team);
    let target=enemyPlayers.filter(e=>Math.abs(e.y-b.y)<80).sort((a,c)=>dist(b,a)-dist(b,c))[0];
    if(!target)target=enemyMinions.filter(m=>Math.abs(m.y-b.y)<45).sort((a,c)=>dist(b,a)-dist(b,c))[0];
    const dir=b.team===1?1:-1;
    if(target&&dist(b,target)<170){
      if(now>=b.botAttackAt){b.botAttackAt=now+650;damage(room,b,target,(b.hero==="assassin"?18:b.hero==="warrior"?14:12)+b.damageBonus)}
    }else{
      const lane=LANES.reduce((best,y)=>Math.abs(y-b.botLane)<Math.abs(best-b.botLane)?y:best,LANES[0]);
      b.y+=(lane-b.y)*0.12;
      b.x+=dir*1.1;
      if(now>=b.botAttackAt){
        const tower=room.towers.find(t=>t.alive&&t.team!==b.team&&t.laneY===lane&&Math.abs(t.x-b.x)<150);
        if(tower){tower.hp=Math.max(0,tower.hp-(b.hero==="mage"?9:7)+b.damageBonus);if(tower.hp===0){tower.alive=false;for(const p of room.players)if(p.team===b.team){p.gold+=75;gainXp(p,50)}}}
        b.botAttackAt=now+800;
      }
    }
    if(now>=b.botSkillAt&&enemyPlayers.some(e=>dist(b,e)<240)){b.botSkillAt=now+5000;const e=enemyPlayers.sort((a,c)=>dist(b,a)-dist(b,c))[0];damage(room,b,e,(b.hero==="mage"?30:b.hero==="assassin"?35:25)+b.damageBonus)}
    if(b.hp<b.maxHp*0.35&&now>=b.botSkillAt){b.hp=Math.min(b.maxHp,b.hp+25);b.botSkillAt=now+5000}
    b.x=Math.max(90,Math.min(910,b.x));b.y=Math.max(90,Math.min(810,b.y));
  }
}
module.exports={ensureBots,tickBots};