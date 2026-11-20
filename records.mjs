import {rewards} from "./engine.mjs?v=20261120g";
const prefix="bipum.maze.receipt.v3/";
const legacyKeys=["bipum.maze.drawer.v1"];
const legacyPrefixes=["bipum.maze.receipt.v2/","bipum.maze.receipt.v3/"];
export function drawerRecords(storage,sessionReceipts){
  const records={};
  const events=new Map(sessionReceipts);
  try{
    const old=JSON.parse(storage.getItem(legacyKeys[0])||"[]");
    if(Array.isArray(old))for(const item of old){
      if(Object.hasOwn(rewards,item))records[item]={first:"이전 판 · 장소 미기록",count:0,legacy:true};
    }
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(key&&legacyPrefixes.some(p=>key.startsWith(p))){
        const data=JSON.parse(storage.getItem(key));
        if(data&&Object.hasOwn(rewards,data.item))events.set(key,data);
      }
    }
  }catch{/* 저장소가 막혀 있으면 이번 판 기록만 남긴다. */}
  for(const entry of [...events.values()].sort((a,b)=>a.at-b.at)){
    const record=records[entry.item]??={first:entry.place,count:0,legacy:false};
    record.count++;
  }
  return records;
}
export function saveReceipt(storage,sessionReceipts,s,item,place,at){
  const first=!drawerRecords(storage,sessionReceipts)[item];
  const key=prefix+s.id+"/"+s.room+"/"+s.cell;
  const entry={item,place,at,sheet:s.room};
  sessionReceipts.set(key,entry);
  let persistent=true;
  try{storage.setItem(key,JSON.stringify(entry));}catch{persistent=false;}
  return {first,persistent};
}
