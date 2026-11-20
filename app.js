import {letters,keys,rewards,rooms,roomOrder,dailyPlan,resolveDay,newRun,patrol,nextPatrol,advance,
  hasItem,isBlock,move,use,actionLabel,resultLabel,elapsed,summary,objective,resume} from "./engine.mjs?v=20261120d";
import {drawerRecords,saveReceipt} from "./records.mjs?v=20261120d";

const $=id=>document.getElementById(id);
const sheet=$("sheet"),vp=$("viewport");
const shareOrigin=location.origin+location.pathname;
const requestedDay=new URLSearchParams(location.search).get("day");
const activeKey="bipum.maze.workbook.v4";
const memory=new Map();
let storage;
try{storage=window.localStorage;}catch{}
const blank=()=>newRun(resolveDay(requestedDay),crypto.randomUUID());
let run=blank(), covered=false, pane="main", zoom=100, ribbon="home", notice=null, returnUntil=0,
    lastRender="", copyMessage="", statusNote="", visibleBoard="";
try{
  const saved=JSON.parse(sessionStorage.getItem(activeKey)||"null");
  if(saved?.day===run.day&&rooms[saved.room]&&saved.id&&saved.found&&Array.isArray(saved.firsts)){
    run=saved;covered=run.started!==null;pane=run.room;
  }
}catch{}
function persist(){try{sessionStorage.setItem(activeKey,JSON.stringify(run));}catch{}}
let toastTimer=0;
function toast(text,kind){
  const box=$("toast");
  box.textContent=text;box.className="toast"+(kind?" "+kind:"");box.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{box.hidden=true;},2800);
}

/* ── 시트에 깔리는 비품 데이터 ── */
const data={
  main:[
    ["비품-101","무선 마우스","전산","공용 서랍","총무팀","12","정상","수신기 동봉"],
    ["비품-102","라벨 프린터","전산","문서 보관실","지원팀","2","대여","라벨지 별도"],
    ["비품-103","복사용지","사무","복사실","운영팀","24","정상","개봉 시 공유"],
    ["비품-104","공용 우산","대여","안내대","총무팀","5","반납 1","반납대장 확인"],
    ["비품-105","무선 키보드","전산","장비실","총무팀","6","정상","예비 수신기"],
    ["비품-106","회의용 젠더","전산","회의실","지원팀","8","정상","옆 회의실 확인"],
    ["비품-107","서류 트레이","사무","서가 A","운영팀","8","확인","마감"],
    ["비품-108","문서 보관함","사무","자료실","총무팀","3","정상","인계 완료"],
    ["비품-109","비상 조명","안전","창고","안전팀","4","정상","월 1회 점검"]
  ],
  store:[
    ["원장 참조","보관 목록","구분","서가 A","대여","입고"],
    ["인수증","물품 확인","문구","자료함","2","예비"],
    ["전표철","관리 메모","사무","서가 B","6","정상"],
    ["건전지","예비 서랍","소모품","복사실","12","정상"],
    ["충전기","USB 케이블","전산","회의실","4","케이블 동봉"],
    ["확인대장","파일 홀더","사무","보관함","실사","날인"],
    ["라벨지","봉투 세트","문구","서가 A","8","예비"],
    ["인계 상자","현물 확인","사무","자료함","확인","마감"]
  ],
  stock:[
    ["비품-201","복사용지 A4","사무","비품실 선반","총무팀","40","정상","2박스"],
    ["비품-202","토너 카트리지","전산","캐비닛","총무팀","6","정상","모델 확인"],
    ["비품-203","문구 세트","사무","서가 B","운영팀","15","정상","분기 지급"],
    ["비품-204","마감 도장","사무","캐비닛 D","총무팀","1","보관","잉크 포함"],
    ["비품-205","우표·인지","사무","서랍","총무팀","30","정상","—"],
    ["비품-206","포장 테이프","사무","선반","운영팀","18","정상","—"],
    ["비품-207","방한 장갑","안전","선반","안전팀","24","정상","동절기"],
    ["비품-208","안전모","안전","선반","안전팀","10","정상","식별띠 부착"],
    ["비품-209","형광 조끼","안전","선반","안전팀","12","정상","—"]
  ],
  server:[
    ["서버 A","로그 수집","전산","랙 1","일 1회","정상","보존 90일"],
    ["서버 B","백업","전산","랙 1","주 1회","정상","외장 디스크"],
    ["스위치","포트 관리","네트워크","랙 2","월 1회","정상","—"],
    ["보안문","출입 기록","보안","서버실","상시","통제","마스터 열쇠"],
    ["랙 2","케이블 정리","전산","서버실","분기","정상","—"],
    ["서버 로그","접속 기록","보안","서버실","일 1회","확인","보존 30일"],
    ["UPS","전원","전산","전산실","월 1회","정상","배터리 교체"],
    ["항온항습","온도","시설","전산실","상시","정상","22도 유지"],
    ["소화기","안전","안전","출입구","월 1회","정상","—"]
  ]
};
const headings={
  main:["관리번호","품목명","구분","보관 위치","담당","수량","점검","비고"],
  store:["보관 항목","품목","분류","위치","확인","비고"],
  stock:["관리번호","품목명","구분","보관 위치","담당","수량","점검","비고"],
  server:["항목","내용","분류","위치","기록","확인","비고"]
};
const widths={
  8:["40px","13%","15%","14%","13%","11%","13%","10%","11%"],
  7:["40px","14%","16%","13%","13%","15%","13%","16%"],
  6:["40px","18%","21%","12%","16%","17%","16%"]
};

function el(tag,txt,cls){
  const out=document.createElement(tag);
  if(txt!==undefined)out.textContent=txt;
  if(cls)out.className=cls;
  return out;
}
function base(room,cell){
  const m=rooms[room];
  const row=Number(cell.slice(1))-m.top,col=letters.indexOf(cell[0]);
  return data[room][row]?.[col]??"";
}
function activeView(){return covered?"main":pane;}
function viewOnly(){return pane!==run.room;}
function collectionCount(){return Object.keys(run.found).length;}

function buildSheet(room){
  const m=rooms[room],cols=m.cols;
  sheet.replaceChildren();sheet.className="sheet "+room;
  sheet.setAttribute("aria-label",m.title+" 시트");
  const cg=el("colgroup");
  for(const w of widths[cols]){const col=el("col");col.style.width=w;cg.append(col);}
  sheet.append(cg);
  const head=sheet.createTHead().insertRow();
  head.append(el("th","","rn"));
  for(const l of letters.slice(0,cols)){const th=el("th",l);th.id="col"+l;head.append(th);}
  const body=sheet.createTBody();
  const label=(tr,n)=>{const th=el("th",n,"rn");th.scope="row";th.id="r"+n;tr.append(th);};
  let tr=body.insertRow();label(tr,1);
  let td=el("td",m.title,"titlecell");td.colSpan=cols;tr.append(td);
  tr=body.insertRow();label(tr,2);
  td=el("td",m.sub+"   ·   "+run.day.replaceAll("-","."),"meta");td.colSpan=cols;tr.append(td);
  tr=body.insertRow();label(tr,3);tr.className="labelrow";
  headings[room].forEach(text=>tr.append(el("td",text)));
  for(let r=m.top;r<=m.last;r++){
    const row=body.insertRow();label(row,r);
    for(const l of letters.slice(0,cols)){
      const cell=l+r,cellTd=el("td",base(room,cell),"play");
      cellTd.id="p"+cell;cellTd.dataset.cell=cell;
      row.append(cellTd);
    }
  }
  const resultRow=body.insertRow();label(resultRow,m.last+1);
  const result=el("td","","resultline");result.id="resultline";result.colSpan=cols;
  resultRow.append(result);
  const hintRow=body.insertRow();label(hintRow,m.last+2);
  const hint=el("td","어두운 칸은 벽 · ⇄ 통로 · 💾 임시저장 · 검수 중/보안 순찰은 순찰조입니다","sheethint");
  hint.colSpan=cols;hintRow.append(hint);
  for(let r=m.last+3;r<=34;r++){
    const row=body.insertRow();label(row,r);
    for(let i=0;i<cols;i++)row.append(el("td","","extra"));
  }
}

function contextHint(){
  if(run.result)return run.message;
  if(viewOnly())return "열람 중 · 현재 셀은 "+rooms[run.room].name+" "+run.cell+"입니다.";
  if(run.message)return run.message;
  const spot=rooms[run.room].spots?.[run.cell],plan=dailyPlan(run.day);
  if(spot){
    if(spot.type==="memo")return "메모 · Enter로 확인하세요";
    if(spot.type==="portal")return "통로 · Enter로 "+rooms[spot.to].name+" 이동";
    if(spot.type==="save")return "임시저장 지점 · 적발되면 이 칸에서 재개합니다";
    if(spot.type==="goal")return "퇴근 마감 · 마감 도장과 보안코드가 필요합니다";
    if(spot.type==="cabinet")return hasItem(run,"key")?"캐비닛 · Enter로 열기":"잠긴 캐비닛 · 마스터 열쇠 필요";
    if(spot.type==="check")return run.checked?"실사 확인 완료":"확인대장 · Enter로 실사 확인";
    if(spot.type==="log")return "서버 로그 · Enter로 열람";
    if(spot.type==="lock")return "보안문 · 열려 있습니다";
  }
  if(plan.search.includes(run.cell)&&!hasItem(run,"key"))return "서가 · Enter로 뒤져보기";
  return base(run.room,run.cell);
}

const guardLabel=room=>room==="server"?"보안 순찰":"검수 중";

function paintBoard(room,now){
  const plan=dailyPlan(run.day),m=rooms[room];
  const live=!covered&&room===run.room&&!viewOnly();
  const guard=patrol(room,run.step,run.day),forecast=nextPatrol(room,run.step,run.day);
  const target=hasItem(run,"marker")&&!run.result?objective(run):null;
  const hasKey=hasItem(run,"key");
  for(const td of sheet.querySelectorAll("[data-cell]")){
    const cell=td.dataset.cell;
    let value=base(room,cell),cls="play",tip="";
    if(isBlock(room,cell)){
      value="";cls+=" wallcell";
    }else{
      const spot=m.spots?.[cell],taken=run.taken[room+":"+cell];
      if(spot){
        if(spot.type==="portal"){value="⇄ "+rooms[spot.to].name;cls+=" portalcell";tip="통로 · Enter로 "+rooms[spot.to].name;}
        else if(spot.type==="memo"){value=taken?"메모 확인":"메모";cls+=taken?" openedcell":" hasnote";tip="인계 메모 · Enter";}
        else if(spot.type==="save"){value="💾 임시저장";cls+=" savecell";tip="임시저장 지점 · 적발되면 여기서 재개";}
        else if(spot.type==="cabinet"){
          if(!hasKey){value="잠금";cls+=" lockcell";tip="잠긴 캐비닛 · 마스터 열쇠 필요";}
          else if(taken){value="비었음";cls+=" openedcell";}
          else{value="캐비닛";cls+=" dooropen hasnote";tip="캐비닛 · Enter로 열기";}
        }
        else if(spot.type==="check"){
          if(run.checked){value="실사 완료";cls+=" dooropen";}
          else if(!hasKey){value="잠금";cls+=" lockcell";tip="잠긴 확인대장 · 마스터 열쇠 필요";}
          else{value="실사 확인";cls+=" checkcell hasnote";tip="확인대장 · Enter로 실사 확인";}
        }
        else if(spot.type==="lock"){
          if(hasKey){value="열림";cls+=" dooropen";tip="보안문 · 열려 있습니다";}
          else{value="잠금";cls+=" lockcell";tip="전산실 보안문 · 마스터 열쇠 필요";}
        }
        else if(spot.type==="log"){value=hasItem(run,"code")?"보안코드":"서버 로그";cls+=" logcell"+(hasItem(run,"code")?" openedcell":" hasnote");tip="서버 로그 · Enter";}
        else if(spot.type==="goal"){value=run.result==="won"?resultLabel(run):"퇴근 마감";cls+=" goalcell";}
      }else if(room==="store"&&plan.search.includes(cell)&&run.searched["store:"+cell]&&!hasItem(run,"key")){
        cls+=" openedcell";
      }
      if(!covered){
        if(cell===guard&&!viewOnly()){value=guardLabel(room);cls+=" guard";}
        else if(cell===guard){cls+=" guardfar";tip=guardLabel(room);}
        if(hasItem(run,"clip")&&cell===forecast&&!run.result){cls+=" forecast";tip="다음 순찰 칸";}
        if(target&&target.room===room&&target.cell===cell)cls+=" marked";
        if(room===run.room&&cell===run.cell){
          cls+=" selected";if(returnUntil>now)cls+=" returned";
          if(run.result==="caught"){value="재확인";cls+=" collision";}
          if(run.result==="won")cls+=" goalcell";
        }
      }
    }
    const gain=!covered&&notice?.room===room&&notice.cell===cell&&notice.until>now?notice.text:"";
    if(gain)cls+=" withgain";
    if(td.className!==cls)td.className=cls;
    if(td.dataset.value!==value||td.dataset.gain!==gain){
      td.textContent=value;
      if(gain)td.append(el("small",gain,"gain"));
      td.dataset.value=value;td.dataset.gain=gain;
    }
    if(td.title!==tip)td.title=tip;
  }
  for(const th of sheet.querySelectorAll(".rcactive"))th.classList.remove("rcactive");
  if(!covered){
    const sel=room===run.room?run.cell:null;
    if(sel){$("col"+sel[0]).classList.add("rcactive");$("r"+sel.slice(1)).classList.add("rcactive");}
  }
  const result=$("resultline");
  const showResult=!covered&&run.result&&room===run.room;
  const resultKey=showResult?run.result+"|"+copyMessage+"|"+collectionCount():"";
  if(result.dataset.key!==resultKey){
    result.dataset.key=resultKey;result.replaceChildren();
    if(showResult){
      result.append(el("span","마감 기록　"+resultLabel(run)+"　·　수집 "+collectionCount()+"/"+Object.keys(rewards).length+"　·　"+elapsed(run,now)+"초"));
      if(run.result==="won"){
        const b=el("button",copyMessage||"결과 복사","copybtn");b.id="copyResult";b.onclick=copyResult;result.append(b);
      }else{
        result.append(el("span",run.save?"　·　Enter로 "+rooms[run.save.room].name+" "+run.save.cell+"에서 재개":"　·　Enter로 다시 시작","resumetip"));
      }
    }
  }
}

function drawDrawer(){
  const records=drawerRecords(storage,memory);
  $("drawerCount").textContent="기록 품목 "+Object.keys(records).length+" / "+Object.keys(rewards).length;
  const body=$("items");body.replaceChildren();
  for(const [id,item] of Object.entries(rewards)){
    const rec=records[id],tr=el("tr");
    const cells=rec?[item.name,rec.first,(rec.legacy?"기존 기록":"" )+(rec.legacy&&rec.count?" + ":"")+(!rec.legacy||rec.count?rec.count+"회":"")]:["· "+item.name,"미확인","—"];
    for(const v of cells)tr.append(el("td",v));
    body.append(tr);
  }
}

function progressText(){
  if(covered)return "";
  const bits=["수집 "+collectionCount()+"/"+Object.keys(rewards).length,
    "도장 "+(hasItem(run,"stamp")?"✓":"✗"),"코드 "+(hasItem(run,"code")?"✓":"✗")];
  if(run.save)bits.push("임시저장 "+rooms[run.save.room].name+" "+run.save.cell);
  return bits.join(" · ");
}

function paint(now=Date.now()){
  const room=activeView(),drawer=room==="drawer",preview=!covered&&viewOnly();
  sheet.hidden=drawer;$("drawerPanel").hidden=!drawer;
  if(!drawer){
    if(visibleBoard!==room){buildSheet(room);visibleBoard=room;}
    paintBoard(room,now);
  }
  for(const [id,target] of [["mainTab","main"],["storeTab","store"],["stockTab","stock"],["serverTab","server"],["drawerTab","drawer"]]){
    const tab=$(id);
    if(room===target)tab.setAttribute("aria-current","page");else tab.removeAttribute("aria-current");
    if(target!=="main"&&target!=="drawer"){
      const opened=target===run.room||run.visited?.[target];
      tab.classList.toggle("lockedtab",!opened);
      tab.title=opened?"":"아직 가 보지 않은 시트입니다";
    }
  }
  $("drawerTab").hidden=covered;$("returnTab").hidden=!preview;
  $("home").disabled=covered;$("view").disabled=covered;$("help").disabled=covered;
  $("ribbonHome").hidden=covered||ribbon!=="home";$("ribbonView").hidden=covered||ribbon!=="view";$("normalTools").hidden=!covered;
  $("home").setAttribute("aria-pressed",String(covered||ribbon==="home"));$("view").setAttribute("aria-pressed",String(!covered&&ribbon==="view"));
  $("home").classList.toggle("active",covered||ribbon==="home");$("view").classList.toggle("active",!covered&&ribbon==="view");
  $("address").textContent=covered?"A7":drawer?"서랍":preview?"열람":run.cell;
  const hint=covered?base("main","A4"):drawer?"비품별 발견 기록":preview?"열람 중 · ‘현재 셀’을 누르면 돌아갑니다.":contextHint();
  if($("formula").textContent!==hint)$("formula").textContent=hint;
  const action=actionLabel(run);
  $("copyTop").hidden=covered||preview||run.result!=="won";$("copyTop").textContent=copyMessage||"결과 복사";
  $("memo").disabled=preview;$("actionText").textContent=action;
  $("touchline").hidden=covered||preview;$("touchAction").textContent=action;
  const status=covered?"준비":drawer?"서랍":preview?"읽기 전용":statusNote||(run.result?resultLabel(run):"준비");
  if($("status").textContent!==status)$("status").textContent=status;
  $("progress").textContent=progressText();
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
    statusNote="";
    persist();
  }
}

/* ── 다시 시작 / 임시저장 지점 재개 ── */
function restart(){
  run=blank();pane="main";covered=false;notice=null;copyMessage="";returnUntil=0;statusNote="";
  $("guide").hidden=true;persist();paint();vp.scrollTo(0,0);focusBoard();
}
function resumeRun(){
  if(!resume(run)){restart();return;}
  pane=run.room;covered=false;notice=null;copyMessage="";returnUntil=0;
  statusNote="임시저장 지점에서 재개 · "+rooms[run.room].name+" "+run.cell;
  toast("임시저장 지점에서 재개 · "+rooms[run.room].name+" "+run.cell);persist();paint();vp.scrollTo(0,0);focusBoard(true);

}
function hideSheet(){
  if(covered)return;
  sync(Date.now());covered=true;notice=null;$("guide").hidden=true;$("help").setAttribute("aria-expanded","false");
  persist();paint();vp.scrollTo(0,0);
}
function reveal(){
  const now=Date.now();sync(now);covered=false;pane=run.room;returnUntil=now+800;
  paint(now);focusBoard(true);persist();
}
function switchPane(target){
  if(covered)return;
  if(target!=="main"&&target!=="drawer"&&target!==run.room&&!run.visited?.[target])return;
  sync(Date.now());pane=target;if(target==="drawer")drawDrawer();paint();vp.scrollTo(0,0);focusBoard();
}

function applyUse(out,now){
  if(out.type==="item"){
    const place=rooms[run.room].name+" "+run.cell;
    const record=saveReceipt(storage,memory,run,out.item,place,now);
    toast(rewards[out.item].name+" 획득 · "+place,"gain");
    if(!record.persistent)$("localState").textContent="세션 기록";
    if(record.first)run.firsts.push(out.item);
    notice={room:run.room,cell:run.cell,until:now+2400,text:rewards[out.item].name+(record.first?" · 처음 발견":" · 발견")};
    run.message=notice.text+" · "+rewards[out.item].effect+(out.text?" · "+out.text:"");
    statusNote=notice.text;
  }else if(out.type==="checked"){
    run.message=out.text+" · 마감 결과가 ‘전수 확인’이 됩니다";
    statusNote="실사 확인 완료";
  }else if(out.text){
    run.message=out.text;
  }
}

function interact(key){
  if(covered||viewOnly())return;
  if(run.started===null&&run.day!==resolveDay(requestedDay))restart();
  const now=Date.now();
  sync(now);
  if(run.result){
    if(key==="Enter"){run.result==="caught"&&run.save?resumeRun():restart();return;}
    paint(now);return;
  }
  if(key==="Enter"){
    applyUse(use(run,now),now);
  }else{
    const before=run.room+run.cell;
    const outcome=move(run,key,now);
    if(outcome==="saved"){
      statusNote=run.message;toast("💾 임시저장 완료 · "+rooms[run.room].name+" "+run.cell);
    }
    else if(run.room+run.cell!==before)statusNote="";
  }
  pane=run.room;persist();paint(now);focusBoard();
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
  $("fbEnv").value=["날짜 "+run.day,"화면 "+innerWidth+"x"+innerHeight,"보기 "+(covered?"일반":pane==="drawer"?"서랍":(rooms[pane]?.name||pane)),"기기 "+navigator.userAgent.slice(0,120)].join(" · ");
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
  const payload={"_subject":"[비품대장] "+subject.slice(0,80),"_template":"table","_captcha":"false",
    "제목":subject,"내용":body,"보낸곳":"비품대장 미로 게임","페이지":$("fbPage").value,"환경":$("fbEnv").value};
  if(mail){payload.email=mail;payload._replyto=mail;payload["회신 이메일"]=mail;}
  fbWatch=setTimeout(()=>{if(fbBusy)fbFail();},20000);
  try{
    const response=await fetch(FB_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload)});
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
$("mainTab").onclick=()=>switchPane("main");
$("storeTab").onclick=()=>switchPane("store");
$("stockTab").onclick=()=>switchPane("stock");
$("serverTab").onclick=()=>switchPane("server");
$("drawerTool").onclick=$("drawerTab").onclick=()=>switchPane("drawer");
$("returnTab").onclick=$("back").onclick=$("follow").onclick=()=>switchPane(run.room);
$("memo").onclick=()=>interact("Enter");
$("restart").onclick=restart;$("touchRestart").onclick=restart;
$("help").onclick=()=>{$("guide").hidden=!$("guide").hidden;$("help").setAttribute("aria-expanded",String(!$("guide").hidden));focusBoard();};
$("home").onclick=()=>{ribbon="home";paint();focusBoard();};$("view").onclick=()=>{ribbon="view";paint();focusBoard();};
function setZoom(delta){zoom=Math.min(140,Math.max(80,zoom+delta));document.documentElement.style.setProperty("--cell-scale",zoom/100);$("zoomtag").textContent=zoom+"%";focusBoard();}
$("zoomIn").onclick=()=>setZoom(10);$("zoomOut").onclick=()=>setZoom(-10);
document.querySelectorAll("[data-key]").forEach(b=>b.onclick=()=>interact(b.dataset.key));

window.addEventListener("keydown",e=>{
  if(fbDialog.open)return;                                      /* 의견 창에서는 브라우저 기본 동작 그대로 */
  if(e.target.matches("input,textarea"))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==="r"||e.key==="R"){e.preventDefault();if(!e.repeat)restart();return;}   /* R = 다시 시작 (F5는 브라우저 새로고침) */
  if(e.key==="Escape"){e.preventDefault();if(!e.repeat){covered?reveal():hideSheet();}return;}
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
    let x=letters.indexOf(run.cell[0])+(keys[key][0]),r=Number(run.cell.slice(1))+keys[key][1];
    const m=rooms[run.room];
    if(x<0||x>=m.cols||r<m.top||r>m.last)continue;
    if(letters[x]+r===cell){interact(key);return;}
  }
});
function background(){if(run.started!==null)hideSheet();}
window.addEventListener("blur",background);
document.addEventListener("visibilitychange",()=>{if(document.hidden)background();else{sync(Date.now());paint();}});
window.addEventListener("pagehide",()=>{background();persist();});
window.addEventListener("pageshow",()=>{sync(Date.now());paint();});
window.addEventListener("storage",()=>{if(pane==="drawer"&&!covered)drawDrawer();});
setInterval(()=>{
  const now=Date.now();sync(now);
  if(covered||document.hidden)return;
  const signature=[run.step,run.result,notice?.until>now,returnUntil>now,statusNote].join("/");
  if(signature!==lastRender){lastRender=signature;paint(now);}
},80);
sync(Date.now());paint();
