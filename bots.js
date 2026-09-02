const LANES=[180,450,720];
const BOT_NAMES=["Pixel","Nova","Byte","Rex","Luna","Volt","Kiro","Echo","Zed","Milo"];
const HEROES=["warrior","mage","assassin"];
const STATS={warrior:{maxHp:130,damage:16,range:150,speed:1},mage:{maxHp:90,damage:10,range:180,speed:1},assassin:{maxHp:80,damage:22,range:140,speed:1.18}};
const COSTS={blade:250,armor:250,boots:300};
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function gainXp(p,n){if(!p||p.level>=10)return;p.xp+=n;while(p.level<10&&p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.skillPoints++;p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+12);p.damageBonus+=2}if(p.level>=10)p.xp=0}
function buyBot(b){if(!b.alive)return;const wants=b.hero==="warrior"?["armor","blade","boots"]:b.hero==="mage"?["blade","boots","armor"]:["blade","boots","armor"];for(const key of wants){const count=b.inventory.filter(x=>x===key).length,max=key==="boots"?2:3;if(count>=max)continue;const cost=COSTS[key]*(count+1);if(b.gold<cost)continue;b.gold-=cost;b.inventory.push(key);if(key==="blade")b.damageBonus+=6;if(key==="armor"){b.maxHp+=35;b.hp+=35}if(key==="boots")b.speedBonus+=.22;break}}
function ensureBots(room){
  if(!room||room.finished||!room.players.some(p=>!p.isBot))return;
  if(room.botSpawnAt==null)room.botSpawnAt=Date.now()+3500;
  if(Date.now()<room.botSpawnAt)return;
  const humans=room.players.filter(p=>!p.isBot).length,wanted=room.maxPlayers-humans;
  let bots=room.players.filter(p=>p.isBot);
  while(bots.length<wanted){
    const t1=room.players.filter(p=>p.team===1).length,t2=room.players.filter(p=>p.team===2).length,team=t1<=t2?1:2;
    const hero=HEROES[(bots.length+team)%HEROES.length],s=STATS[hero],lane=LANES[bots.length%3];
    const bot={id:`bot-${Math.random().toString(36).slice(2,9)}`,name:BOT_NAMES[bots.length%BOT_NAMES.length],hero,heroName:hero[0].toUpperCase()+hero.slice(1),team,x:team===1?115:885,y:lane,hp:s.maxHp,maxHp:s.maxHp,alive:true,respawnAt:0,gold:500,kills:0,deaths:0,damageBonus:0,speedBonus:0,inventory:[],level:1,xp:0,skillPoints:0,skillLevels:{q:1,w:1,e:1,r:1},isBot:true,botLane:lane,botTargetId:null,botAttackAt:0,botSkillAt:{q:0,w:0,e:0,r:0},botBuyAt:Date.now()+4000,damageDealt:0,towerDamage:0};
    room.players.push(bot);bots.push(bot);
  }
}
function damage(room,a,t,amount){if(!t||t.alive===false||t.hp<=0)return false;const dealt=Math.min(t.hp,Math.max(0,amount));t.hp=Math.max(0,t.hp-amount);if(a)a.damageDealt=(a.damageDealt||0)+dealt;if(t.hp>0)return false;if(t.id?.startsWith("m-")){t.hp=0;if(a){a.gold=(a.gold||0)+15;gainXp(a,25)}return true}t.alive=false;t.deaths=(t.deaths||0)+1;t.respawnAt=Date.now()+5000;if(a){a.kills=(a.kills||0)+1;a.gold=(a.gold||0)+100;gainXp(a,100)}return true}
function nearest(arr,b,limit,filter){let best=null,d=Infinity;for(const t of arr){if(filter&&!filter(t))continue;const n=dist(b,t);if(n<=limit&&n<d){d=n;best=t}}return best}
function useSkill(room,b,key,target){const now=Date.now(),cd={q:3500,w:6000,e:8000,r:20000}[key];if(now<b.botSkillAt[key])return false;b.botSkillAt[key]=now+cd;const rank=b.skillLevels[key]||1;if(key==="w"){const heal=(b.hero==="warrior"?42:28)+Math.round(b.maxHp*(b.hero==="warrior"?.18:.12))+rank*4;b.hp=Math.min(b.maxHp,b.hp+heal);return true}if(!target||target.alive===false){b.botSkillAt[key]=now;return false}const base=b.hero==="mage"?(key==="r"?110:46):b.hero==="assassin"?(key==="r"?125:key==="q"?58:38):(key==="r"?85:key==="q"?34:28),range=key==="e"?125:key==="r"?240:(b.hero==="mage"?280:190);if(dist(b,target)>range)return false;if(key==="e"){const dir=b.team===1?1:-1;b.x=clamp(target.x-dir*35,80,920);b.y=clamp(target.y,90,810)}return damage(room,b,target,base+b.damageBonus+rank*(key==="r"?5:key==="q"?3:2))}
function tickBots(room){
  const now=Date.now();
  for(const b of room.players.filter(p=>p.isBot)){
    if(!b.alive){if(b.respawnAt&&now>=b.respawnAt){b.alive=true;b.hp=b.maxHp;b.x=b.team===1?115:885;b.y=b.botLane;b.respawnAt=0;b.botTargetId=null}continue}
    if(now>=b.botBuyAt){buyBot(b);b.botBuyAt=now+3500}
    const lane=b.botLane||LANES[0],dir=b.team===1?1:-1,enemies=room.players.filter(p=>p.alive&&!p.isBot&&p.team!==b.team),allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id);
    const low=b.hp<b.maxHp*.32,danger=nearest(enemies,b,190,p=>Math.abs(p.y-b.y)<100);
    let target=nearest(enemies,b,b.hero==="mage"?280:240,p=>Math.abs(p.y-b.y)<100);
    if(!target)target=nearest(room.minions.filter(m=>m.hp>0&&m.team!==b.team&&m.laneY===lane),b,170);
    if(low){const home=b.team===1?125:875;b.x+=(home-b.x)*.1;b.y+=(lane-b.y)*.1;useSkill(room,b,"w",b)}
    else if(target){b.botTargetId=target.id;const range=b.hero==="mage"?180:b.hero==="assassin"?145:150;if(dist(b,target)>range*.75){b.x+=Math.sign(target.x-b.x)*(1.1+(b.speedBonus||0));b.y+=(target.y-b.y)*.06}else if(now>=b.botAttackAt){b.botAttackAt=now+(b.hero==="assassin"?500:700);damage(room,b,target,STATS[b.hero].damage+b.damageBonus)}
      if(b.hero==="mage"){if(dist(b,target)<=240)useSkill(room,b,"r",target);else useSkill(room,b,"q",target)}else if(b.hero==="assassin"){if(dist(b,target)<=160)useSkill(room,b,"e",target);else useSkill(room,b,"q",target)}else{if(dist(b,target)<=190)useSkill(room,b,"q",target)}
    }else{
      b.botTargetId=null;const ally=nearest(allies,b,180,p=>p.hp<p.maxHp*.55);if(ally&&b.hero==="warrior"){b.x+=(ally.x-b.x)*.025;b.y+=(ally.y-b.y)*.025}else{b.y+=(lane-b.y)*.12;b.x+=dir*(1.05+(b.speedBonus||0))}
      const tower=room.towers.find(t=>t.alive&&t.team!==b.team&&t.laneY===lane&&Math.abs(t.x-b.x)<175);if(tower&&now>=b.botAttackAt){const dealt=(b.hero==="mage"?9:7)+b.damageBonus;tower.hp=Math.max(0,tower.hp-dealt);b.towerDamage=(b.towerDamage||0)+dealt;b.botAttackAt=now+800;if(tower.hp===0){tower.alive=false;for(const p of room.players)if(p.team===b.team){p.gold+=75;gainXp(p,50)}}}
    }
    if(!low&&danger&&b.hero!=="warrior"&&now>=b.botSkillAt.w){if(b.hero==="mage")useSkill(room,b,"w",b);else if(b.hp<b.maxHp*.7)useSkill(room,b,"w",b)}
    const base=room.bases.find(x=>x.team!==b.team);if(base&&Math.abs(base.x-b.x)<65&&Math.abs(base.y-b.y)<85&&!low&&now>=b.botAttackAt){const dealt=5+b.damageBonus*.5;base.hp=Math.max(0,base.hp-dealt);b.towerDamage=(b.towerDamage||0)+dealt;b.botAttackAt=now+900}
    b.x=clamp(b.x,90,910);b.y=clamp(b.y,90,810);
  }
}
module.exports={ensureBots,tickBots};