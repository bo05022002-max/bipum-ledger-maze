export const STEP = 800;
export const letters = "ABCDEFGH";
export const rewards = {
  clip: {name:"클립", effect:"검수의 다음 이동 칸을 점선으로 표시합니다."},
  marker: {name:"형광펜", effect:"미확인 메모의 모서리를 강조합니다."},
  key: {name:"서랍 열쇠", effect:"잠긴 셀의 통로를 엽니다."}
};
export const maps = {
  main: {
    name:"비품대장", cols:8, last:14, portal:"F12", lock:"D8",
    gates:{7:"BCG",8:"BG",9:"F",10:"B",11:"G",12:"H",13:"BE"},
    walls:{7:"E"},
    patrol:"A9 B9 C9 D9 E9 F9 G9 H9 G9 F9 E9 D9 C9 B9".split(" ")
  },
  store: {
    name:"보관실", cols:6, last:12, portal:"A7", lock:"B10",
    gates:{7:"ABEF",8:"ABCF",9:"ACDF",10:"ABCDEF",11:"ADE"},
    walls:{7:"B",8:"B",10:"B",12:"B"},
    patrol:"C8 C9 C10 C11 C11 D11 E11 D11 C11 C11 C10 C9".split(" ")
  }
};
export const storeNotes=["A8","B8","B9"];
export const keys={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
export function resolveDay(value,now=new Date()){
  if(typeof value==="string" && /^\d{4}-\d{2}-\d{2}$/.test(value)){
    const date=new Date(value+"T12:00:00Z");
    if(Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value)return value;
  }
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
}
function hash(text){
  let n=2166136261;
  for(const character of text)n=Math.imul(n^character.charCodeAt(0),16777619);
  n^=n>>>16;n=Math.imul(n,0x85ebca6b);return (n^(n>>>13))>>>0;
}
export function dailyPlan(day){
  const roll=hash(day+"/first")%100;
  const first=roll<60?"marker":roll<90?"clip":"key";
  const other=Object.keys(rewards).filter(i=>i!==first);
  return {note:storeNotes[hash(day+"/location")%3],main:first,store:other[hash(day+"/second")%2]};
}
export function newRun(day,id){
  return {day,id,room:"main",cell:"A7",started:null,step:0,ended:null,result:null,
    opened:{},visited:false,checked:false,firsts:[],message:"C8 인계 메모를 확인하세요. 방향키로 이동 · Enter로 열기"};
}
export function patrol(room,step){
  const route=maps[room].patrol;
  return route[step%route.length];
}
export function nextPatrol(room,step){
  const current=patrol(room,step);
  return patrol(room,step+1)===current?patrol(room,step+2):patrol(room,step+1);
}
function caught(s,at){
  s.result="caught";s.ended=at;s.message="검수에 걸렸습니다 · Enter로 다시 작성";
}
export function advance(s,now){
  if(s.started===null||s.result)return;
  const target=Math.max(s.step,Math.floor((now-s.started)/STEP));
  const last=Math.min(target,s.step+maps[s.room].patrol.length);
  for(let i=s.step+1;i<=last;i++){
    if(patrol(s.room,i)===s.cell){
      s.step=i;caught(s,s.started+i*STEP);return;
    }
  }
  s.step=target;
}
export function hasItem(s,id){return Object.values(s.opened).includes(id);}
export function noteAt(s,room){return room==="main"?"C8":dailyPlan(s.day).note;}
export function edge(room,cell,axis,unlocked){
  const m=maps[room],col=cell[0],r=Number(cell.slice(1));
  if(axis==="right"){
    if(room==="store"&&cell===m.lock&&unlocked)return false;
    return col===letters[m.cols-1]||(m.walls[r]||"").includes(col);
  }
  if(room==="main"&&cell===m.lock&&unlocked)return false;
  return r===m.last||!m.gates[r]?.includes(col);
}
export function neighbor(room,cell,key,unlocked=false){
  const [dx,dy]=keys[key],x=letters.indexOf(cell[0]),r=Number(cell.slice(1)),m=maps[room];
  if(x+dx<0||x+dx>=m.cols||r+dy<7||r+dy>m.last)return cell;
  const next=letters[x+dx]+(r+dy);
  const source=dx<0||dy<0?next:cell;
  return edge(room,source,dx?"right":"down",unlocked)?cell:next;
}
export function move(s,key,now){
  advance(s,now);
  if(s.result||!Object.hasOwn(keys,key))return;
  if(s.started===null)s.started=now;
  const next=neighbor(s.room,s.cell,key,hasItem(s,"key"));
  if(next===s.cell){s.message="굵은 테두리 너머로는 이동할 수 없습니다.";return;}
  s.cell=next;s.message="";
  if(patrol(s.room,s.step)===next){caught(s,now);return;}
  if(s.room==="store"&&next==="E12"){s.checked=true;s.message="실사 확인 완료 · A7에서 원장으로 복귀";}
  if(s.room==="main"&&next==="H13"){s.result="won";s.ended=now;s.message="마감 완료 · 결과 복사 또는 Enter로 다시 작성";}
}
export function actionLabel(s){
  if(s.result)return "다시 작성";
  if(s.cell===noteAt(s,s.room)&&!s.opened[s.room])return "메모 열기";
  if(s.opened.main&&(s.cell===maps[s.room].portal||(s.room==="main"&&s.cell==="C8")))return "참조 이동";
  return "확인";
}
export function use(s,now){
  advance(s,now);
  if(s.result)return;
  const action=actionLabel(s);
  if(action==="메모 열기"){
    const item=dailyPlan(s.day)[s.room];s.opened[s.room]=item;
    s.message=rewards[item].effect;return item;
  }
  if(action==="참조 이동"){
    s.room=s.room==="main"?"store":"main";s.cell=maps[s.room].portal;
    if(s.room==="store")s.visited=true;
    s.message=s.room==="store"?"별도 보관실 · 미확인 메모와 E12 실사 칸을 확인하세요.":"원장 복귀 · H13 마감";return;
  }
  s.message="이 셀에 연결된 메모가 없습니다.";
}
export function resultLabel(s){
  if(s.result==="caught")return "재확인 필요";
  if(s.checked&&s.opened.main&&s.opened.store)return "전수 확인";
  return s.visited?"보관실 확인":"일반 마감";
}
export function elapsed(s,now){return s.started===null?0:Math.max(0,Math.ceil(((s.ended??now)-s.started)/1000));}
export function summary(s,origin){
  const [,m,d]=s.day.split("-").map(Number);
  const label=resultLabel(s),count=Object.keys(s.opened).length;
  const fields=[m+"/"+d+" 비품 실사",label==="전수 확인"?label+" 2/2":label+" · 메모 "+count+"/2",elapsed(s,s.ended)+"초"];
  if(s.firsts.length)fields.push(s.firsts.map(id=>rewards[id].name).join("·")+" 첫 발견");
  const url=new URL(origin);url.search="?day="+s.day;url.hash="";
  return [...fields,url.href].join(" | ");
}
