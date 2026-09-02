const LANES=[180,450,720];
const BOT_NAMES=["Pixel","Nova","Byte","Rex","Luna","Volt","Kiro","Echo","Zed"];
const HEROES=["warrior","mage","assassin"];
const COSTS={blade:250,armor:250,boots:300};
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function laneFor(b){return b.botLane||LANES[0]}
function gainXp(p,n){if(!p||p.level>=10)return;p.xp+=n;while(p.level<10&&p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.skillPoints++;p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+12);p.damageBonus+=2}if(p.level>=10)p.xp=0}
function buyBot(b){if(!b.alive)return;const wants=b.hero==="warrior"?["armor","blade","boots"]:b.hero==="mage"?["blade","boots","armor"]:["blade","boots","armor"];for(const key of wants){const count=b.inventory.filter(x=>x===key).length,max=key==="boots"?2:3;if(count>=max)continue;const cost=COSTS[key]*(count+1);if(b.gold<cost)continue;b.gold-=cost;b.inventory.push(key);if(key==="blade")b.damageBonus+=6;if(key==="armor"){b.maxHp+=35;b.hp+=35}if(key==="boots")b.speedBonus+=.22;break}}
function ensureBots(room){
  if(!room||room.finished||!room.players.length)return;
  if(room.botSpawnAt==null)room.botSpawnAt=Date.now()+3500;
  if(Date.now()<room.botSpawnAt)return;
  const humans=room.players.filter(p=>!p.isBot).length;
  const wanted=room.maxPlayers-humans;
  let bots=room.players.filter(p=>p.isBot);
  while(bots.length<wanted){
    const team=room.players.filter(p=>p.team===1).length<=room.players.filter(p=>p.team===2).length?1:2;
    const hero=HEROES[(bots.length+team)%HEROES.length];
    const stats={warrior:[130,16],mage:[90,10],assassin:[80,22]}[hero];
    const bot={id:`bot-${Math.random().toString(36).slice(2,9)}`,name:BOT_NAMES[bots.length%BOT_NAMES.length],hero,heroName:hero[0].toUpperCase()+hero.slice(1),team,x:team===1?115:885,y:LANES[bots.length%3],hp:stats[0],maxHp:stats[0],alive:true,respawnAt:0,gold:500,kills:0,deaths:0,damageBonus:0,speedBonus:0,inventory:[],level:1,xp:0,skillPoints:0,skillLevels:{q:1,w:1,e:1,r:1},isBot:true,botAttackAt:0,botSkillAt:0,botHealAt:0,botBuyAt:Date.now()+5000,botLane:LANES[bots.length%3],botTargetId:null,damageDealt:0,towerDamage:0};
    room.players.push(bot);bots.push(bot);
  }
}
function damage(room,attacker,target,amount){if(!target||target.alive===false)return;const dealt=Math.max(0,Math.min(target.hp,amount));target.hp=Math.max(0,target.hp-amount);if(attacker)attacker.damageDealt=(attacker.damageDealt||0)+dealt;if(target.hp>0)return;target.alive=false;target.deaths=(target.deaths||0)+1;target.respawnAt=Date.now()+5000;if(attacker){attacker.kills=(attacker.kills||0)+1;attacker.gold=(attacker.gold||0)+100;gainXp(attacker,100)}}
function nearest(arr,b,limit,filter){let best=null,d=Infinity;for(const t of arr){if(filter&&!filter(t))continue;const n=dist(b,t);if(n<=limit&&n<d){d=n;best=t}}return best}
function tickBots(room){
  const now=Date.now();
  for(const b of room.players.filter(p=>p.isBot)){
    if(!b.alive){if(b.respawnAt&&now>=b.respawnAt){b.alive=true;b.hp=b.maxHp;b.x=b.team===1?115:885;b.y=laneFor(b);b.respawnAt=0;b.botTargetId=null;b.botAttackAt=now+500}continue}
    if(now>=b.botBuyAt){buyBot(b);b.botBuyAt=now+3500}
    const lane=laneFor(b),dir=b.team===1?1:-1;
    const enemies=room.players.filter(p=>p.alive&&!p.isBot&&p.team!==b.team);
    const enemyMinions=room.minions.filter(m=>m.hp>0&&m.team!==b.team&&m.laneY===lane);
    const allyHeroes=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id);
    let target=nearest(enemies,b,b.hero==="mage"?260:220,p=>Math.abs(p.y-b.y)<95);
    if(!target)target=nearest(enemyMinions,b,150,m=>Math.abs(m.y-b.y)<48);
    const low=b.hp<b.maxHp*.35;
    const danger=nearest(enemies,b,180,p=>Math.abs(p.y-b.y)<100);
    if(low){
      const retreatX=b.team===1?135:865;b.x+=(retreatX-b.x)*.09;b.y+=(lane-b.y)*.1;
      if(now>=b.botHealAt){b.botHealAt=now+5000;b.hp=Math.min(b.maxHp,b.hp+Math.round(b.maxHp*.22))}
    }else if(target){
      b.botTargetId=target.id;
      const attackRange=b.hero==="mage"?190:b.hero==="assassin"?155:170;
      if(dist(b,target)>attackRange*.72){b.x+=Math.sign(target.x-b.x)*1.55;b.y+=(target.y-b.y)*.055}else if(now>=b.botAttackAt){b.botAttackAt=now+(b.hero==="assassin"?500:700);damage(room,b,target,(b.hero==="assassin"?18:b.hero==="warrior"?14:12)+b.damageBonus)}
      if(now>=b.botSkillAt&&target.alive){
        const key=b.hero==="mage"?"q":b.hero==="assassin"?"e":"q",rank=b.skillLevels[key]||1,skillRange=key==="e"?125:240;
        if(dist(b,target)<=skillRange){
          b.botSkillAt=now+(key==="q"?3500:8000);
          if(key==="e"){const offset=b.team===1?35:-35;b.x=clamp(target.x-offset,80,920);b.y=clamp(target.y,90,810)}
          damage(room,b,target,(key==="q"?30:key==="e"?35:25)+b.damageBonus+rank*3);
        }
      }
    }else{
      b.botTargetId=null;
      const ally=nearest(allyHeroes,b,140,p=>p.hp<p.maxHp*.6);
      if(ally&&b.hero==="warrior"){b.x+=(ally.x-b.x)*.025;b.y+=(ally.y-b.y)*.025}else{b.y+=(lane-b.y)*.12;b.x+=dir*1.15}
      if(now>=b.botAttackAt){
        const tower=room.towers.find(t=>t.alive&&t.team!==b.team&&t.laneY===lane&&Math.abs(t.x-b.x)<170);
        if(tower){const dmg=(b.hero==="mage"?9:7)+b.damageBonus;tower.hp=Math.max(0,tower.hp-dmg);b.towerDamage=(b.towerDamage||0)+dmg;b.botAttackAt=now+800;if(tower.hp===0){tower.alive=false;for(const p of room.players)if(p.team===b.team){p.gold+=75;gainXp(p,50)}}}
        else b.botAttackAt=now+500;
      }
    }
    if(!low&&danger&&now>=b.botSkillAt){
      if(b.hero==="warrior"){b.hp=Math.min(b.maxHp,b.hp+Math.round(b.maxHp*.18));b.botSkillAt=now+6000}
      else if(dist(b,danger)<240){b.botSkillAt=now+(b.hero==="assassin"?8000:3500);damage(room,b,danger,(b.hero==="assassin"?35:25)+(b.skillLevels.q||1)*3+b.damageBonus)}
    }
    const base=room.bases.find(x=>x.team!==b.team);
    if(base&&Math.abs(base.x-b.x)<70&&Math.abs(base.y-b.y)<80&&!low&&now>=b.botAttackAt){const dmg=5+b.damageBonus*.5;base.hp=Math.max(0,base.hp-dmg);b.towerDamage=(b.towerDamage||0)+dmg;b.botAttackAt=now+900}
    b.x=clamp(b.x,90,910);b.y=clamp(b.y,90,810);
  }
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
module.exports={ensureBots,tickBots};