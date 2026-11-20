/* 자동 플레이 검증: 매 걸음 다시 길을 찾는 에이전트로 90일치를 끝까지 플레이한다.
   - 잠긴 문·통로·임시저장·적발 후 재개까지 실제 엔진 규칙만 사용한다. */
import {rooms,letters,keys,dailyPlan,newRun,move,use,patrol,advance,isBlock,hasItem,resume,standReason} from "../engine.mjs";

const FLAG={key:1,stamp:2,code:4,checked:8,memoMain:16,memoStore:32};

function flagsOf(s){
  let f=0;
  if(hasItem(s,"key"))f|=FLAG.key;
  if(hasItem(s,"stamp"))f|=FLAG.stamp;
  if(hasItem(s,"code"))f|=FLAG.code;
  if(s.checked)f|=FLAG.checked;
  if(s.taken["main:C6"])f|=FLAG.memoMain;
  if(s.taken["store:B8"])f|=FLAG.memoStore;
  return f;
}

function applyUse(room,cell,flags,plan){
  const spot=rooms[room].spots[cell];
  if(!spot){if(plan.search.includes(cell)&&cell===plan.keyCell)return flags|FLAG.key;return flags;}
  if(spot.type==="memo")return flags|(room==="main"?FLAG.memoMain:FLAG.memoStore);
  if(spot.type==="cabinet")return(flags&FLAG.key)?flags|FLAG.stamp:flags;
  if(spot.type==="log")return flags|FLAG.code;
  if(spot.type==="check")return(flags&FLAG.key)?flags|FLAG.checked:flags;
  return flags;
}

const cellAt=(room,cell,key)=>{
  const[dx,dy]=keys[key];
  const x=letters.indexOf(cell[0])+dx,r=Number(cell.slice(1))+dy;
  const m=rooms[room];
  if(x<0||x>=m.cols||r<m.top||r>m.last)return null;
  return letters[x]+r;
};

const done=(flags,full)=>!full?false:(flags&FLAG.stamp)&&(flags&FLAG.code)&&(full?(flags&FLAG.checked):true);

/** 현재 상태에서 마감까지 가는 동작 목록(경로)을 찾는다. 목표: 도장+코드(+실사) */
export function planPath(s,{full=true}={}){
  const plan=dailyPlan(s.day);
  const start={room:s.room,cell:s.cell,flags:flagsOf(s),path:[]};
  const keyOf=n=>n.room+n.cell+":"+n.flags;
  const seen=new Set([keyOf(start)]);
  const q=[start];
  while(q.length){
    const n=q.shift();
    const spot=rooms[n.room].spots[n.cell];
    const flagsAfter=applyUse(n.room,n.cell,n.flags,plan);
    if(spot?.type==="goal"&&(flagsAfter&FLAG.stamp)&&(flagsAfter&FLAG.code)&&(!full||(flagsAfter&FLAG.checked))){
      return [...n.path,{type:"use"}];
    }
    if(flagsAfter!==n.flags&&spot?.type!=="goal"){
      const nx={...n,flags:flagsAfter,path:[...n.path,{type:"use"}]};
      if(!seen.has(keyOf(nx))){seen.add(keyOf(nx));q.push(nx);}
    }
    if(spot?.type==="portal"){
      const nx={room:spot.to,cell:spot.at,flags:n.flags,path:[...n.path,{type:"use"}]};
      if(!seen.has(keyOf(nx))){seen.add(keyOf(nx));q.push(nx);}
    }
    for(const k of Object.keys(keys)){
      const cell=cellAt(n.room,n.cell,k);
      if(!cell||isBlock(n.room,cell))continue;
      const fake={found:{}};
      for(const [id,bit] of [["key",FLAG.key],["stamp",FLAG.stamp],["code",FLAG.code]])if(n.flags&bit)fake.found[id]=1;
      if(standReason(fake,n.room,cell))continue;
      const nx={room:n.room,cell,flags:n.flags,path:[...n.path,{type:"move",key:k}]};
      if(!seen.has(keyOf(nx))){seen.add(keyOf(nx));q.push(nx);}
    }
  }
  return null;
}

/** 순찰을 피해 실제로 플레이한다. */
export function agent(day,{full=true,stepMs=110,maxTurns=2000}={}){
  const s=newRun(day,"agent-"+day);
  let now=1_000_000;
  let path=planPath(s,{full});
  if(!path)return{result:"stuck",s,catches:0};
  let idx=0, spins=0;
  for(let turn=0;turn<maxTurns;turn++){
    if(s.result==="won")return{result:"won",s,catches:s.caughts};
    if(s.result==="caught"){
      if(!resume(s))return{result:"dead",s,catches:s.caughts};
      path=planPath(s,{full});idx=0;
      if(!path)return{result:"stuck",s,catches:s.caughts};
      continue;
    }
    if(idx>=path.length)return{result:"path-end",s,catches:s.caughts};
    const action=path[idx];
    if(action.type==="move"){
      const next=cellAt(s.room,s.cell,action.key);
      let guard=0;
      while(next&&patrol(s.room,s.step,day)===next&&guard++<12){
        advance(s,now);now+=300;
        if(s.result)break;
      }
      if(s.result)continue;
      now+=stepMs;
      move(s,action.key,now);
      idx++;
    }else{
      now+=stepMs;
      use(s,now);
      idx++;
    }
    if(++spins>maxTurns)break;
  }
  return{result:s.result??"timeout",s,catches:s.caughts};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const days=[];
  for(let i=0;i<90;i++)days.push(new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10));
  let wins=0,caughtTotal=0,clean=0,bad=[];
  const t=Date.now();
  for(const d of days){
    const out=agent(d);
    if(out.result==="won"){
      wins++;
      caughtTotal+=out.catches;
      if(out.catches===0)clean++;
    }else bad.push(d+":"+out.result+"@"+out.s.room+out.s.cell);
  }
  console.log(`완주 ${wins}/${days.length} · 무적발 완주 ${clean} · 평균 적발 ${(caughtTotal/Math.max(1,wins)).toFixed(2)} · ${Date.now()-t}ms`);
  console.log("실패",bad.length,bad.slice(0,10));
  const sample=agent("2026-11-20");
  console.log("샘플", sample.result, "적발",sample.catches, "실사",sample.s.checked, "임시저장",!!sample.s.save, "수집",Object.keys(sample.s.found).join(","));
}
