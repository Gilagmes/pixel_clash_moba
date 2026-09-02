const LANES=[180,450,720];
const BOT_NAMES=["Pixel","Nova","Byte","Rex","Luna","Volt","Kiro","Echo","Zed","Milo"];
const HEROES=["warrior","mage","assassin"];
const STATS={warrior:{maxHp:145,damage:16,range:150,speed:1,armor:16},mage:{maxHp:90,damage:10,range:210,speed:1,armor:5},assassin:{maxHp:80,damage:22,range:155,speed:1.18,armor:7}};
const COSTS={blade:250,armor:250,boots:300,crit:350,haste:350,vampire:400};
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function roleOf(p){return p?.hero||"warrior"}
function gainXp(p,n){if(!p||p.level>=10)return;p.xp+=n;while(p.level<10&&p.xp>=p.level*100){p.xp-=p.level*100;p.level++;p.skillPoints++;p.maxHp+=12;p.hp=Math.min(p.maxHp,p.hp+12);p.damageBonus+=2}if(p.level>=10)p.xp=0}
function buyBot(b){if(!b.alive)return;const wants=b.hero==="warrior"?["armor","blade","boots","vampire"]:b.hero==="mage"?["haste","blade","boots","crit"]:["blade","crit","boots","vampire"];for(const key of wants){const count=b.inventory.filter(x=>x===key).length,max=key==="boots"?2:key==="armor"||key==="blade"?3:2;if(count>=max)continue;const cost=COSTS[key]*(count+1);if(b.gold<cost)continue;b.gold-=cost;b.inventory.push(key);if(key==="blade")b.damageBonus+=6;if(key==="armor"){b.maxHp+=35;b.hp+=35}if(key==="boots")b.speedBonus+=.22;if(key==="crit"){b.critChance=(b.critChance||0)+.12;b.attackSpeed=(b.attackSpeed||0)+.04}if(key==="haste")b.cooldownReduction=Math.min(.35,(b.cooldownReduction||0)+.12);if(key==="vampire")b.lifesteal=Math.min(.4,(b.lifesteal||0)+.08);break}}
function chooseLane(room,b){const alive=room.towers.filter(t=>t.alive&&t.team!==b.team);if(!alive.length)return b.botLane||LANES[0];let best={lane:LANES[0],score:-Infinity};for(const lane of LANES){const enemy=alive.filter(t=>t.laneY===lane),friendly=room.towers.filter(t=>t.alive&&t.team===b.team&&t.laneY===lane),enemyHp=enemy.reduce((s,t)=>s+t.hp,0),friendlyHp=friendly.reduce((s,t)=>s+t.hp,0),friendlyMinions=room.minions.filter(m=>m.hp>0&&m.team===b.team&&m.laneY===lane).length,enemyMinions=room.minions.filter(m=>m.hp>0&&m.team!==b.team&&m.laneY===lane).length;const score=friendlyHp-enemyHp*.7+friendlyMinions*8-enemyMinions*3;if(score>best.score)best={lane,score}}return best.lane}
function ensureBots(room){if(!room||room.finished||!room.players.some(p=>!p.isBot))return;for(const p of room.players)if(!p.role)p.role=roleOf(p);if(room.botSpawnAt==null)room.botSpawnAt=Date.now()+3500;if(Date.now()<room.botSpawnAt)return;const humans=room.players.filter(p=>!p.isBot).length,wanted=room.maxPlayers-humans;let bots=room.players.filter(p=>p.isBot);while(bots.length<wanted){const t1=room.players.filter(p=>p.team===1).length,t2=room.players.filter(p=>p.team===2).length,team=t1<=t2?1:2,hero=HEROES[(bots.length+team)%HEROES.length],s=STATS[hero],lane=LANES[bots.length%3],bot={id:`bot-${Math.random().toString(36).slice(2,9)}`,name:BOT_NAMES[bots.length%BOT_NAMES.length],hero,heroName:hero[0].toUpperCase()+hero.slice(1),role:hero,rolePassive:hero===`warrior`?`Iron Will`:hero===`mage`?`Arcane Focus`:`Death Mark`,team,x:team===1?115:885,y:lane,hp:s.maxHp,maxHp:s.maxHp,alive:true,respawnAt:0,gold:500,kills:0,deaths:0,damageBonus:0,speedBonus:0,inventory:[],level:1,xp:0,skillPoints:0,skillLevels:{q:1,w:1,e:1,r:1},isBot:true,botLane:lane,botTargetId:null,botFocusId:null,botAttackAt:0,botSkillAt:{q:0,w:0,e:0,r:0},botBuyAt:Date.now()+4000,botLaneAt:Date.now()+6000,botJungleAt:Date.now()+9000,damageDealt:0,towerDamage:0,buffs:[],buffUntil:0,armor:s.armor||0,critChance:hero===`assassin`?.05:0,cooldownReduction:0,lifesteal:0,attackSpeed:hero===`assassin`?.05:0};room.players.push(bot);bots.push(bot)}}
function roleDamage(a,t,amount){let mult=1;if(roleOf(a)==="assassin"&&t&&t.maxHp&&t.hp<t.maxHp*.35)mult*=1.22;if(roleOf(a)==="mage")mult*=1.06;return amount*mult}
function damage(room,a,t,amount){if(!t||t.alive===false||t.hp<=0)return false;let final=roleDamage(a,t,amount);if(t.armor!=null)final=final*100/(100+Math.max(0,t.armor||0));if(a?.critChance&&Math.random()<a.critChance)final*=2;if(roleOf(t)==="warrior"&&a?.team!==t.team)final*=.88;const dealt=Math.min(t.hp,Math.max(0,final));t.hp=Math.max(0,t.hp-final);if(a){a.damageDealt=(a.damageDealt||0)+dealt;if(a.lifesteal)a.hp=Math.min(a.maxHp,a.hp+dealt*a.lifesteal)}if(t.hp>0)return false;if(t.id?.startsWith("m-")){t.hp=0;if(a){a.gold=(a.gold||0)+15;gainXp(a,25)}return true}t.alive=false;t.deaths=(t.deaths||0)+1;t.respawnAt=Date.now()+5000;if(a){a.kills=(a.kills||0)+1;a.gold=(a.gold||0)+100;gainXp(a,100)}return true}
function useSkill(room,b,key,target){const now=Date.now(),baseCd={q:3500,w:6000,e:8000,r:20000}[key],cd=Math.round(baseCd*(1-(b.cooldownReduction||0)));if(now<b.botSkillAt[key])return false;b.botSkillAt[key]=now+cd;const rank=b.skillLevels[key]||1;if(key==="w"){const heal=(b.hero==="warrior"?42:28)+Math.round(b.maxHp*(b.hero==="warrior"?.18:.12))+rank*4;b.hp=Math.min(b.maxHp,b.hp+heal);return true}if(!target||target.alive===false){b.botSkillAt[key]=now;return false}const base=b.hero==="mage"?(key==="r"?110:46):b.hero==="assassin"?(key==="r"?125:key==="q"?58:38):(key==="r"?85:key==="q"?34:28),range=key==="e"?125:key==="r"?240:(b.hero==="mage"?280:190);if(dist(b,target)>range)return false;if(key==="e"){const dir=b.team===1?1:-1;b.x=clamp(target.x-dir*35,80,920);b.y=clamp(target.y,90,810)}return damage(room,b,target,base+b.damageBonus+rank*(key==="r"?5:key==="q"?3:2))}
function targetScore(t,b){const d=dist(b,t);let score=320-d;if(t.hp<t.maxHp*.35)score+=b.hero==="assassin"?190:110;if(t.hero==="mage")score+=b.hero==="assassin"?35:22;if(t.hero==="assassin")score+=b.hero==="warrior"?28:14;const ally=roomlessAllyScore(t,b);return score+ally}
function roomlessAllyScore(){return 0}
function chooseHeroTarget(enemies,b,limit,focusId){let best=null,score=-Infinity;for(const e of enemies){if(!e.alive||dist(b,e)>limit||Math.abs(e.y-b.y)>160)continue;let s=targetScore(e,b);if(focusId&&e.id===focusId)s+=180;if(b.hero==="assassin"&&e.hp<e.maxHp*.35)s+=150;if(b.hero==="mage"){const nearby=enemies.filter(x=>x.alive&&dist(e,x)<130).length;s+=nearby*45}if(b.hero==="warrior"&&e.hero!=="mage")s+=20;if(s>score){score=s;best=e}}return best}
function nearest(arr,b,limit,filter){let best=null,d=Infinity;for(const t of arr){if(filter&&!filter(t))continue;const n=dist(b,t);if(n<=limit&&n<d){d=n;best=t}}return best}
function chooseTeamFocus(room,b,enemies){const candidates=enemies.filter(e=>e.alive&&dist(b,e)<360);if(!candidates.length)return null;let best=null,score=-Infinity;for(const e of candidates){const alliesNear=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id&&dist(p,e)<250).length;const enemyNear=room.players.filter(p=>p.alive&&p.team!==b.team&&dist(p,e)<160).length;const s=targetScore(e,b)+alliesNear*65-enemyNear*15;if(s>score){score=s;best=e}}return best?.id||null}
function tickBots(room){const now=Date.now();for(const b of room.players.filter(p=>p.isBot)){
if(!b.alive){if(b.respawnAt&&now>=b.respawnAt){b.alive=true;b.hp=b.maxHp;b.x=b.team===1?115:885;b.y=b.botLane;b.respawnAt=0;b.botTargetId=null;b.botFocusId=null;b.botLaneAt=now+5000;b.botJungleAt=now+5000}continue}
if(now>=b.botBuyAt){buyBot(b);b.botBuyAt=now+3500}
if(now>=b.botLaneAt){b.botLane=chooseLane(room,b);b.botLaneAt=now+6000}
const lane=b.botLane||LANES[0],dir=b.team===1?1:-1;
const enemies=room.players.filter(p=>p.alive&&p.team!==b.team);
const allies=room.players.filter(p=>p.alive&&p.team===b.team&&p.id!==b.id);
const low=b.hp<b.maxHp*(b.hero==="warrior"?.26:.32);
if(now%5000<60){const focus=chooseTeamFocus(room,b,enemies);if(focus)b.botFocusId=focus}
const focused=enemies.find(e=>e.id===b.botFocusId&&e.alive);
const danger=chooseHeroTarget(enemies,b,210);
let target=focused&&dist(b,focused)<330?focused:chooseHeroTarget(enemies,b,b.hero==="mage"?300:260,b.botFocusId);
const enemyMinions=room.minions.filter(m=>m.hp>0&&m.team!==b.team&&m.laneY===lane);
if(!target)target=nearest(enemyMinions,b,170);
const camp=room.jungle?.filter(j=>j.alive).sort((a,c)=>dist(b,a)-dist(b,c))[0];
const wantsJungle=!target&&!danger&&camp&&now>=b.botJungleAt&&(b.gold<900||b.hp>b.maxHp*.65);
if(wantsJungle){
  b.botTargetId=camp.id;
  if(dist(b,camp)>150){b.x+=(camp.x-b.x)*.035;b.y+=(camp.y-b.y)*.035}
  else if(now>=b.botAttackAt){b.botAttackAt=now+(b.hero==="assassin"?500:700);const dmg=(STATS[b.hero].damage+b.damageBonus)*(1+(b.damageBuff||0))*(1+(b.attackSpeed||0)*.35);const dealt=Math.min(camp.hp,dmg);camp.hp=Math.max(0,camp.hp-dmg);b.damageDealt=(b.damageDealt||0)+dealt;if(camp.hp<=0){camp.alive=false;camp.respawnAt=Date.now()+camp.respawn;b.gold+=(camp.type==="boss"?250:camp.type==="red"?90:75);gainXp(b,camp.type==="boss"?180:60);b.buffs=[...new Set([...(b.buffs||[]),camp.buff])];b.buffUntil=Date.now()+(camp.type==="boss"?60000:30000);if(camp.buff==="red")b.damageBuff=.18;if(camp.buff==="dragon")b.damageBuff=.3;if(camp.buff==="blue")b.cooldownReduction=Math.min(.35,(b.cooldownReduction||0)+.25)}}
  b.botJungleAt=now+3000;
}else if(low){
  const home=b.team===1?125:875;b.x+=(home-b.x)*.1;b.y+=(lane-b.y)*.1;if(now>=b.botSkillAt.w)useSkill(room,b,"w",b)
}else if(target){
  b.botTargetId=target.id;
  const nearbyAllies=allies.filter(a=>dist(a,target)<230).length;
  const range=b.hero==="mage"?210:b.hero==="assassin"?155:150;
  if(b.hero==="warrior"&&danger&&danger.id!==target.id&&dist(b,danger)<190){b.x+=(danger.x-b.x)*.055;b.y+=(danger.y-b.y)*.055}
  else if(b.hero==="mage"){if(dist(b,target)<125){b.x-=(target.x-b.x)*.08;b.y+=(b.y-target.y)*.05}else if(dist(b,target)>range*.72){b.x+=Math.sign(target.x-b.x)*(1+(b.speedBonus||0));b.y+=(target.y-b.y)*.04}}
  else if(b.hero==="assassin"&&dist(b,target)<320){const flank=b.team===1?-1:1;b.x+=(target.x-b.x)*.07+flank*1.5;b.y+=(target.y-b.y)*.09+Math.sin(now/350)*2}
  else if(dist(b,target)>range*.75){b.x+=Math.sign(target.x-b.x)*(1.1+(b.speedBonus||0));b.y+=(target.y-b.y)*.06}
  else if(now>=b.botAttackAt){b.botAttackAt=now+(b.hero==="assassin"?500:700);damage(room,b,target,(STATS[b.hero].damage+b.damageBonus)*(1+(b.damageBuff||0))*(1+(b.attackSpeed||0)*.35))}
  if(b.hero==="mage"){if(dist(b,target)<=240)useSkill(room,b,"r",target);else useSkill(room,b,"q",target)}
  else if(b.hero==="assassin"){if(dist(b,target)<=160)useSkill(room,b,"e",target);else useSkill(room,b,"q",target)}
  else if(dist(b,target)<=190)useSkill(room,b,"q",target)
}else{
  b.botTargetId=null;
  const ally=nearest(allies,b,260,p=>p.hp<p.maxHp*.55);
  if(ally&&b.hero==="warrior"){b.x+=(ally.x-b.x)*.035;b.y+=(ally.y-b.y)*.035}
  else{b.y+=(lane-b.y)*.12;b.x+=dir*(1.05+(b.speedBonus||0))}
  const tower=room.towers.find(t=>t.alive&&t.team!==b.team&&t.laneY===lane&&Math.abs(t.x-b.x)<175);
  const alliedMinions=room.minions.some(m=>m.hp>0&&m.team===b.team&&m.laneY===lane&&Math.abs(m.x-(tower?.x||b.x))<100);
  if(tower&&alliedMinions&&now>=b.botAttackAt){const dealt=((b.hero==="mage"?9:7)+b.damageBonus)*(1+(b.damageBuff||0));const actual=Math.min(tower.hp,dealt);tower.hp=Math.max(0,tower.hp-dealt);b.towerDamage=(b.towerDamage||0)+actual;b.botAttackAt=now+800;if(tower.hp===0){tower.alive=false;for(const p of room.players)if(p.team===b.team){p.gold+=75;gainXp(p,50)}}}
}
if(!low&&danger&&b.hero!=="warrior"&&now>=b.botSkillAt.w){if(b.hero==="mage"&&b.hp<b.maxHp*.8)useSkill(room,b,"w",b);else if(b.hp<b.maxHp*.7)useSkill(room,b,"w",b)}
const base=room.bases.find(x=>x.team!==b.team);const alliedMinionsNearBase=room.minions.some(m=>m.hp>0&&m.team===b.team&&Math.abs(m.x-(base?.x||999))<120);if(base&&alliedMinionsNearBase&&Math.abs(base.x-b.x)<65&&Math.abs(base.y-b.y)<85&&!low&&now>=b.botAttackAt){const dealt=(5+b.damageBonus*.5)*(1+(b.damageBuff||0));const actual=Math.min(base.hp,dealt);base.hp=Math.max(0,base.hp-dealt);b.towerDamage=(b.towerDamage||0)+actual;b.botAttackAt=now+900}
b.x=clamp(b.x,90,910);b.y=clamp(b.y,90,810);
}}
module.exports={ensureBots,tickBots};