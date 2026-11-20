import {letters,keys,rewards,maps,resolveDay,newRun,patrol,nextPatrol,advance,
  hasItem,noteAt,edge,neighbor,move,actionLabel,use,resultLabel,elapsed,summary} from "./engine.mjs";
import {drawerRecords,saveReceipt} from "./records.mjs";
const $=id=>document.getElementById(id);
const sheet=$("sheet"),vp=$("viewport");
const shareOrigin=location.origin+location.pathname;
const requestedDay=new URLSearchParams(location.search).get("day");
const activeKey="bipum.maze.workbook.v3";
const memory=new Map();
let storage;
try{storage=window.localStorage;}catch{}
const blank=()=>newRun(resolveDay(requestedDay),crypto.randomUUID());
let run=blank(), covered=false, pane="main",zoom=100,ribbon="home",notice=null,returnUntil=0,lastRender="",copyMessage="";
try{
  const saved=JSON.parse(sessionStorage.getItem(activeKey)||"null");
  if(saved?.day===run.day&&maps[saved.room]&&saved.id&&saved.opened&&Array.isArray(saved.firsts)){
    run=saved;covered=run.started!==null;pane=run.room;
  }
}catch{}
function checkpoint(){try{sessionStorage.setItem(activeKey,JSON.stringify(run));}catch{}}
const inventory={
  main:[
    ["비품-001","무선 마우스","전산","공용 서랍","총무팀","12","정상","수신기 동봉"],
    ["비품-002","라벨 프린터","인계 메모","문서 보관실","지원팀","2","대여","라벨지 별도 보관"],
    ["비품-003","복사용지","사무","복사실","운영팀","24","정상","마지막 박스 개봉 시 공유"],
    ["비품-004","공용 우산","대여","안내대","총무팀","5","반납 1","반납대장 확인"],
    ["비품-005","무선 키보드","전산","장비실","총무팀","6","정상","예비 수신기"],
    ["비품-006","회의용 젠더","전산","회의실","지원팀","별도 보관","정상","옆 회의실 확인"],
    ["비품-007","서류 트레이","사무","서가 A","운영팀","8","확인","마감"],
    ["비품-008","문서 보관함","사무","자료실","총무팀","3","정상","인계 완료"]
  ],
  store:[
    ["원장 참조","보관 목록","구분","서가 A","대여","입고"],
    ["인수증","물품 확인","문구","자료함","2","예비"],
    ["전표철","관리 메모","사무","서가 B","6","정상"],
    ["건전지","예비 서랍","소모품","복사실","12","정상"],
    ["충전기","USB 케이블","전산","회의실","4","케이블 동봉"],
    ["확인대장","파일 홀더","사무","보관함","실사 확인","날인"]
  ]
};
const headings={main:["관리번호","품목명","구분","보관 위치","담당 부서","수량","점검 상태","비고"],
  store:["관리 항목","보관 품목","분류","위치","확인","비고"]};
function el(tag,txt,cls){
  const out=document.createElement(tag);
  if(txt!==undefined)out.textContent=txt;
  if(cls)out.className=cls;
  return out;
}
function base(room,cell){return inventory[room][Number(cell.slice(1))-7][letters.indexOf(cell[0])];}
function activeView(){return covered?"main":pane;}
function viewOnly(){return pane!==run.room;}
function noteCount(){return Object.keys(run.opened).length;}
function rowLabel(tr,n){const th=el("th",n,"rn");th.scope="row";th.id="r"+n;tr.append(th);}
let visibleBoard="";
function buildSheet(room){
  const map=maps[room],cols=map.cols;
  sheet.replaceChildren();sheet.classList.toggle("store",room==="store");
  sheet.setAttribute("aria-label",room==="main"?"비품 관리대장":"별도 보관실");
  const cg=el("colgroup");
  for(const width of cols===8?["40px","13%","15%","14%","13%","11%","13%","10%","11%"]:["40px","18%","21%","12%","16%","17%","16%"]){
    const col=el("col");col.style.width=width;cg.append(col);
  }
  sheet.append(cg);const head=sheet.createTHead().insertRow();head.append(el("th","","rn"));
  for(const l of letters.slice(0,cols)){const th=el("th",l);th.id="col"+l;head.append(th);}
  const body=sheet.createTBody();
  function band(n,text,cls){const tr=body.insertRow();rowLabel(tr,n);const td=el("td",text,cls);td.colSpan=cols;tr.append(td);return td;}
  band(1,"","blank");band(2,room==="main"?"비품 관리대장":"별도 보관실 대장","titlecell");
  band(3,"총무팀   /   "+(room==="main"?"사무용 비품":"별도 보관 품목")+"   ·   "+run.day.replaceAll("-","."),"meta");
  band(4,"","blank");const labels=body.insertRow();rowLabel(labels,5);labels.className="labelrow";
  headings[room].forEach(label=>labels.append(el("td",label)));
  band(6,room==="main"?"사무용 비품   /   인수인계":"보관 기록   /   현물 확인","sectionband");
  for(let r=7;r<=map.last;r++){
    const tr=body.insertRow();rowLabel(tr,r);
    for(const l of letters.slice(0,cols)){
      const cell=l+r,td=el("td",base(room,cell),"play");td.id="p"+cell;td.dataset.cell=cell;
      tr.append(td);
    }
  }
  const result=band(map.last+1,"","resultline");result.id="resultline";
  for(let r=map.last+2;r<=32;r++){
    const tr=body.insertRow();rowLabel(tr,r);for(let i=0;i<cols;i++)tr.append(el("td","","extra"));
  }
}
function contextHint(){
  if(run.result)return run.message;
  if(viewOnly())return "열람 중 · 현재 셀은 "+maps[run.room].name+" "+run.cell+"입니다.";
  if(run.message)return run.message;
  if(actionLabel(run)==="메모 열기")return run.room==="main"?"인계 확인 · 예비 라벨지는 별도 보관실에 인계했습니다. Enter로 확인":"미확인 메모 · 현물 인계 내역을 Enter로 확인하세요.";
  if(actionLabel(run)==="참조 이동")return "보관 위치 참조 · Enter로 이동";
  return base(run.room,run.cell);
}
function markTarget(room){
  if(!hasItem(run,"marker"))return null;
  if(room==="store")return !run.opened.store?noteAt(run,room):!run.checked?"E12":null;
  return !run.opened.store?"C8":"H13";
}
function paintBoard(room,now){
  const map=maps[room],heldKey=hasItem(run,"key");
  const guard=patrol(room,run.step),forecast=nextPatrol(room,run.step);
  const note=noteAt(run,room),target=markTarget(room);
  for(const td of sheet.querySelectorAll("[data-cell]")){
    const cell=td.dataset.cell,sel=!covered&&room===run.room&&cell===run.cell;
    let value=base(room,cell),cls="play",tip="";
    if(cell[0]==="A")cls+=" codecell";if(room==="main"&&cell[0]==="F")cls+=" num";
    if(!covered){
      if(edge(room,cell,"right",heldKey))cls+=" vwall";
      if(edge(room,cell,"down",heldKey))cls+=" hwall";
      if(cell===map.lock){value=heldKey?"열림":"잠금";if(heldKey)cls+=" lockopen";}
      if(cell===note&&!run.opened[room]){value=room==="main"?"인계 확인":"미확인 메모";cls+=" hasnote";tip="인계 확인 · Enter";}
      if(cell===note&&run.opened[room])value=room==="main"?"보관 위치 참조":rewards[run.opened.store].name;
      if(run.opened.main&&(cell===map.portal||(room==="main"&&cell==="C8"))){
        cls+=" refcell";value=room==="store"?"원장 위치 참조":"보관 위치 참조";
      }
      if(cell===target)cls+=" hasnote marked";
      if(room==="main"&&cell==="H13"){cls+=" goal";if(run.result==="won")value=resultLabel(run);}
      if(room==="store"&&cell==="E12"){value=run.checked?"실사 완료":"실사 확인";cls+=" goal";}
      if(cell===guard){value="검수 중";cls+=" guard";}
      if(hasItem(run,"clip")&&cell===forecast&&!run.result){cls+=" forecast";tip="다음 검수 칸";}
      if(sel){cls+=" selected";if(returnUntil>now)cls+=" returned";}
      if(sel&&run.result==="caught"){value="재확인";cls+=" collision";}
    }else if(cell==="A7")cls+=" selected";
    const gain=!covered&&notice?.room===room&&notice.cell===cell&&notice.until>now?notice.text:"";
    if(gain)cls+=" withgain";
    if(td.className!==cls)td.className=cls;
    if(td.dataset.value!==value||td.dataset.gain!==gain){
      td.textContent=value;if(gain)td.append(el("small",gain,"gain"));
      td.dataset.value=value;td.dataset.gain=gain;
    }
    if(td.title!==tip)td.title=tip;
  }
  for(const th of sheet.querySelectorAll(".rcactive"))th.classList.remove("rcactive");
  const selected=covered?"A7":room===run.room?run.cell:null;
  if(selected){$("col"+selected[0]).classList.add("rcactive");$("r"+selected.slice(1)).classList.add("rcactive");}
  const result=$("resultline");
  const showResult=!covered&&run.result&&(room===run.room||room==="main");
  const resultKey=showResult?run.result+"|"+copyMessage:"";
  if(result.dataset.key!==resultKey){
    result.dataset.key=resultKey;result.replaceChildren();
    if(showResult){
      result.append(el("span","마감 기록　"+resultLabel(run)+"　·　메모 "+noteCount()+"/2　·　"+elapsed(run,now)+"초"));
      if(run.result==="won"){const b=el("button",copyMessage||"결과 복사","copybtn");b.id="copyResult";b.onclick=copyResult;result.append(b);}
    }
  }
}
function drawDrawer(){
  const records=drawerRecords(storage,memory);$("drawerCount").textContent="기록 품목 "+Object.keys(records).length+" / 3";
  const body=$("items");body.replaceChildren();
  for(const [id,item] of Object.entries(rewards)){
    const rec=records[id],tr=el("tr");
    for(const v of rec?[item.name,rec.first,(rec.legacy?"기존 기록":"")+(rec.legacy&&rec.count?" + ":"")+(!rec.legacy||rec.count?rec.count+"회":"")]:["미확인","—","—"])tr.append(el("td",v));
    body.append(tr);
  }
}
function paint(now=Date.now()){
  const room=activeView(),drawer=room==="drawer",preview=!covered&&viewOnly();
  sheet.hidden=drawer;$("drawerPanel").hidden=!drawer;
  if(!drawer){if(visibleBoard!==room){buildSheet(room);visibleBoard=room;}paintBoard(room,now);}
  for(const [id,target] of [["mainTab","main"],["storeTab","store"],["drawerTab","drawer"]]){
    const tab=$(id);if(room===target)tab.setAttribute("aria-current","page");else tab.removeAttribute("aria-current");
  }
  $("storeTab").disabled=covered||!run.opened.main;
  $("storeTab").classList.toggle("marked",!covered&&hasItem(run,"marker")&&!run.opened.store);
  $("drawerTab").hidden=covered;$("returnTab").hidden=!preview;
  $("home").disabled=covered;$("view").disabled=covered;$("help").disabled=covered;
  $("ribbonHome").hidden=covered||ribbon!=="home";$("ribbonView").hidden=covered||ribbon!=="view";$("normalTools").hidden=!covered;
  $("home").setAttribute("aria-pressed",String(covered||ribbon==="home"));$("view").setAttribute("aria-pressed",String(!covered&&ribbon==="view"));
  $("home").classList.toggle("active",covered||ribbon==="home");$("view").classList.toggle("active",!covered&&ribbon==="view");
  $("address").textContent=covered?"A7":drawer?"서랍":preview?"열람":run.cell;
  const hint=covered?base("main","A7"):drawer?"비품별 발견 기록":preview?"열람 중 · 현재 셀로 돌아가려면 ‘현재 셀’을 누르세요.":contextHint();
  if($("formula").textContent!==hint)$("formula").textContent=hint;
  const action=actionLabel(run);
  $("copyTop").hidden=covered||preview||run.result!=="won";$("copyTop").textContent=copyMessage||"결과 복사";
  $("memo").disabled=preview;$("actionText").textContent=action==="확인"?"메모 확인":action;
  $("touchline").hidden=covered||preview;$("touchAction").textContent=action;
  const status=covered?"준비":drawer?"서랍":preview?"읽기 전용":run.result?resultLabel(run):"준비";
  if($("status").textContent!==status)$("status").textContent=status;
  $("progress").textContent=covered?"":("메모 "+noteCount()+" / 2");
}
function focusBoard(center=false){
  vp.focus({preventScroll:true});
  if(covered||viewOnly())return;
  const current=$("p"+run.cell);if(!current)return;
  const rect=current.getBoundingClientRect(),area=vp.getBoundingClientRect();
  if(center){vp.scrollLeft+=rect.left+rect.width/2-area.left-area.width/2;vp.scrollTop+=rect.top+rect.height/2-area.top-area.height/2;return;}
  if(rect.left<area.left+42)vp.scrollLeft-=area.left+42-rect.left;
  if(rect.right>area.right-3)vp.scrollLeft+=rect.right-area.right+3;
  if(rect.top<area.top+24)vp.scrollTop-=area.top+24-rect.top;
  if(rect.bottom>area.bottom-3)vp.scrollTop+=rect.bottom-area.bottom+3;
}
function sync(now){
  const before=run.result;
  advance(run,now);
  if(!before&&run.result){
    if(!covered)pane=run.room;
    checkpoint();
  }
}
function reset(){
  run=blank();pane="main";covered=false;notice=null;copyMessage="";returnUntil=0;
  $("guide").hidden=true;checkpoint();paint();vp.scrollTo(0,0);focusBoard();
}
function hideSheet(){
  if(covered)return;
  sync(Date.now());covered=true;notice=null;$("guide").hidden=true;$("help").setAttribute("aria-expanded","false");checkpoint();paint();vp.scrollTo(0,0);
}
function reveal(){
  const now=Date.now();sync(now);covered=false;pane=run.room;returnUntil=now+800;
  paint(now);focusBoard(true);checkpoint();
}
function switchPane(target){
  if(covered||(target==="store"&&!run.opened.main))return;
  sync(Date.now());pane=target;if(target==="drawer")drawDrawer();paint();vp.scrollTo(0,0);focusBoard();
}
function interact(key){
  if(covered||viewOnly())return;
  if(run.started===null&&run.day!==resolveDay(requestedDay))reset();
  const now=Date.now(),wasEnded=Boolean(run.result);
  sync(now);
  if(run.result){
    if(key==="Enter"&&wasEnded)reset();else paint(now);
    return;
  }
  if(key==="Enter"){
    const item=use(run,now);
    if(item){
      const place=maps[run.room].name+" "+run.cell;
      const record=saveReceipt(storage,memory,run,item,place,now);
      if(!record.persistent)$("localState").textContent="세션 기록";
      if(record.first)run.firsts.push(item);
      notice={room:run.room,cell:run.cell,until:now+2200,text:rewards[item].name+(record.first?" · 처음 발견":" · 발견")};
      run.message=notice.text+" · "+rewards[item].effect;
      if(run.room==="main")run.message+=" 현재 칸은 안전합니다. 숨겨도 검수는 계속됩니다.";
    }
  }else move(run,key,now);
  pane=run.room;checkpoint();paint(now);focusBoard();
}
async function copyResult(){
  if(run.result!=="won"||covered)return;
  const line=summary(run,shareOrigin);
  let ok=false;
  try{await navigator.clipboard.writeText(line);ok=true;}catch{}
  if(!ok&&!covered){
    const output=el("input");output.id="copyFallback";output.value=line;output.readOnly=true;
    $("resultline").append(output);output.focus();output.select();
    try{ok=document.execCommand("copy");}catch{}
    if(!ok){run.message="선택된 결과 한 줄을 복사하세요.";paint();return;}
    output.remove();
  }
  if(ok){copyMessage="복사 완료";paint();focusBoard();}
}
/* ── 💬 개선 의견 / 버그 제보 ── */
const FB_MAIL=["woong6.park","gmail.com"].join("@");
const FB_ENDPOINT="https://formsubmit.co/ajax/d83b0ce6a217a9f7f21da579c2a7bd96";
const fbDialog=$("feedbackDialog"),fbForm=$("feedbackForm"),fbStatus=$("fbStatus"),fbSend=$("fbSend");
let fbBusy=false,fbTimer=0,fbWatch=0;
function fbSet(text,cls){fbStatus.textContent=text;fbStatus.className="fb-status"+(cls?" "+cls:"");}
function fbMailtoHref(){
  const subject=$("fbSubject").value.trim(),body=$("fbBody").value.trim(),mail=$("fbEmail").value.trim();
  const lines=[body||"(내용을 적어 주세요)"];
  if(mail)lines.push("","회신 받을 이메일: "+mail);
  lines.push("","— 비품대장 미로 게임",location.href);
  return "mailto:"+FB_MAIL+"?subject="+encodeURIComponent("[비품대장] "+(subject||"개선 의견"))+"&body="+encodeURIComponent(lines.join("\n"));
}
function fbRefreshMailto(){$("fbMailto").href=fbMailtoHref();}
function fbOpen(){
  if(fbDialog.open)return;
  $("fbPage").value=location.href;
  $("fbEnv").value=["날짜 "+run.day,"화면 "+innerWidth+"x"+innerHeight,"보기 "+(covered?"일반":pane==="drawer"?"서랍":(maps[pane]?.name||pane)),"기기 "+navigator.userAgent.slice(0,120)].join(" · ");
  fbSet("","");fbSend.textContent="보내기";fbSend.disabled=false;fbBusy=false;clearTimeout(fbTimer);clearTimeout(fbWatch);
  fbRefreshMailto();fbDialog.showModal();
  setTimeout(()=>$("fbSubject").focus({preventScroll:true}),40);
}
function fbClose(){clearTimeout(fbTimer);clearTimeout(fbWatch);fbBusy=false;if(fbDialog.open)fbDialog.close();}
function fbDone(){
  clearTimeout(fbTimer);clearTimeout(fbWatch);fbBusy=false;fbSend.disabled=true;fbSend.textContent="보냄";
  fbSet("보냈습니다. 알려 주셔서 고맙습니다!","");
  for(const id of ["fbSubject","fbBody","fbEmail","fbHoney"]){const field=$(id);if(field)field.value="";}
  fbRefreshMailto();
  fbTimer=setTimeout(fbClose,2600);
}
function fbFail(reason){
  clearTimeout(fbWatch);fbBusy=false;fbSend.disabled=false;fbSend.textContent="보내기";
  fbSet(reason||"전송을 확인하지 못했습니다. 잠시 뒤 다시 보내 보시거나 아래 ‘메일 앱으로 보내기’를 이용해 주세요.","err");
}
async function fbSubmit(event){
  event.preventDefault();
  if(fbBusy)return;
  const subject=$("fbSubject").value.trim(),body=$("fbBody").value.trim(),mail=$("fbEmail").value.trim();
  if($("fbHoney")&&$("fbHoney").value){fbDone();return;}
  if(!subject||!body){fbSet("제목과 내용을 적어 주세요.","err");(subject?$("fbBody"):$("fbSubject")).focus();return;}
  if(mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)){fbSet("회신 이메일 주소 형식을 확인해 주세요.","err");$("fbEmail").focus();return;}
  fbBusy=true;fbSend.disabled=true;fbSend.textContent="보내는 중…";fbSet("보내는 중입니다…","busy");
  const data={"_subject":"[비품대장] "+subject.slice(0,80),"_template":"table","_captcha":"false",
    "제목":subject,"내용":body,"보낸곳":"비품대장 미로 게임","페이지":$("fbPage").value,"환경":$("fbEnv").value};
  if(mail){data.email=mail;data._replyto=mail;data["회신 이메일"]=mail;}
  fbWatch=setTimeout(()=>{if(fbBusy)fbFail();},20000);
  try{
    const response=await fetch(FB_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data)});
    const result=await response.json().catch(()=>null);
    if(response.ok&&result&&String(result.success)==="true"){fbDone();return;}
    fbFail();
  }catch(error){
    fbFail();
  }
}
window.addEventListener("online",()=>{if(fbDialog.open&&fbStatus.className.includes("err"))fbSet("","");});
$("feedbackOpen").onclick=fbOpen;
$("feedbackClose").onclick=fbClose;
fbForm.addEventListener("submit",fbSubmit);
fbForm.addEventListener("input",()=>{fbRefreshMailto();if(fbStatus.className.includes("err"))fbSet("","");});
fbDialog.addEventListener("click",event=>{if(event.target===fbDialog)fbClose();});
fbDialog.addEventListener("cancel",()=>{clearTimeout(fbTimer);});
fbDialog.addEventListener("close",()=>{if(!fbDialog.open)focusBoard();});
$("copyTop").onclick=copyResult;
$("fileName").onclick=()=>covered?reveal():hideSheet();$("cover").onclick=hideSheet;
$("mainTab").onclick=()=>switchPane("main");$("storeTab").onclick=()=>switchPane("store");
$("drawerTool").onclick=$("drawerTab").onclick=()=>switchPane("drawer");
$("returnTab").onclick=$("back").onclick=$("follow").onclick=()=>switchPane(run.room);
$("memo").onclick=()=>interact("Enter");$("restart").onclick=reset;
$("help").onclick=()=>{$("guide").hidden=!$("guide").hidden;$("help").setAttribute("aria-expanded",String(!$("guide").hidden));focusBoard();};
$("home").onclick=()=>{ribbon="home";paint();focusBoard();};$("view").onclick=()=>{ribbon="view";paint();focusBoard();};
function setZoom(delta){zoom=Math.min(140,Math.max(80,zoom+delta));document.documentElement.style.setProperty("--cell-scale",zoom/100);$("zoomtag").textContent=zoom+"%";focusBoard();}
$("zoomIn").onclick=()=>setZoom(10);$("zoomOut").onclick=()=>setZoom(-10);
document.querySelectorAll("[data-key]").forEach(b=>b.onclick=()=>interact(b.dataset.key));
window.addEventListener("keydown",e=>{
  if(fbDialog.open)return;
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches("input,textarea"))return;
  if(e.key==="Escape"){e.preventDefault();if(!e.repeat){if(covered)reveal();else hideSheet();}return;}
  if(covered||viewOnly())return;
  if(e.key==="Enter"&&e.target.closest("button"))return;
  if(Object.hasOwn(keys,e.key)||e.key==="Enter"){e.preventDefault();if(e.key==="Enter"&&e.repeat)return;interact(e.key);}
});
sheet.addEventListener("click",e=>{
  if(covered||viewOnly()||run.result)return;
  const cell=e.target.closest("[data-cell]")?.dataset.cell;
  if(!cell)return;
  if(cell===run.cell){interact("Enter");return;}
  for(const key of Object.keys(keys)){
    if(neighbor(run.room,run.cell,key,hasItem(run,"key"))===cell){interact(key);return;}
  }
});
function background(){if(run.started!==null)hideSheet();}
window.addEventListener("blur",background);
document.addEventListener("visibilitychange",()=>{if(document.hidden)background();else{sync(Date.now());paint();}});
window.addEventListener("pagehide",()=>{background();checkpoint();});
window.addEventListener("pageshow",()=>{sync(Date.now());paint();});
window.addEventListener("storage",()=>{if(pane==="drawer"&&!covered)drawDrawer();});
setInterval(()=>{
  const now=Date.now();sync(now);
  if(covered||document.hidden)return;
  const signature=[run.step,run.result,notice?.until>now,returnUntil>now].join("/");
  if(signature!==lastRender){lastRender=signature;paint(now);}
},80);
sync(Date.now());paint();
