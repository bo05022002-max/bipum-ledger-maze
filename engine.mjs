/* 비품대장.xlsx 미로 게임 · 2차 (다중 시트 방탈출) 규칙 엔진
   시트 4장: 비품대장 → 보관실 → 비품실 → 전산실 → 비품대장 (통로로 양방향 이동)
   흐름: 인계 메모(단서) → 마스터 열쇠 → 잠긴 문(캐비닛·확인대장·보안문) → 마감 도장·보안코드 → H12 퇴근 마감 */
export const STEP = 800;
export const letters = "ABCDEFGH";
export const keys = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
export const roomOrder = ["main","store","stock","server"];

export const rewards = {
  clip:{name:"클립",effect:"검수·순찰이 다음에 갈 칸을 점선으로 표시합니다."},
  marker:{name:"형광펜",effect:"다음에 가야 할 칸을 강조합니다."},
  key:{name:"마스터 열쇠",effect:"보관실 확인대장·비품실 캐비닛·전산실 보안문을 엽니다."},
  stamp:{name:"마감 도장",effect:"퇴근 마감(H12)에 필요합니다."},
  code:{name:"보안코드",effect:"퇴근 마감(H12)에 필요합니다."}
};

export const rooms = {
  main: {
    name:"비품대장", title:"비품 관리대장", cols:8, top:4, last:12, start:"A4",
    sub:"총무팀 / 사무용 비품 · 통로 F4 보관실 · H4 전산실",
    blocks:"B5 C5 G5 B6 D6 G6 B8 D8 E8 G8 B9 G9 B10 C10 D10 F10 G10",
    spots: {
      A6:{type:"save"},
      C6:{type:"memo",text:"이번 달 마감은 마감 도장과 보안코드로 합니다. 마스터 열쇠는 보관실 서가 A9~C9, 보안코드는 전산실 서버 로그(F9)에 있습니다. 통로는 F4(보관실)·H4(전산실)."},
      F4:{type:"portal",to:"store",at:"A4"},
      H4:{type:"portal",to:"server",at:"G4"},
      H12:{type:"goal"}
    },
    patrol:"A7 B7 C7 D7 E7 F7 G7 F7 E7 D7 C7 B7".split(" ")
  },
  store: {
    name:"보관실", title:"별도 보관실 대장", cols:6, top:4, last:11, start:"A4",
    sub:"총무팀 / 보관 품목 · 통로 A4 비품대장 · F4 비품실",
    blocks:"B5 C5 D5 E5 B6 E6 B7 D7 E7 B10 D10 D11",
    spots: {
      A4:{type:"portal",to:"main",at:"F4"},
      F4:{type:"portal",to:"stock",at:"A4"},
      B8:{type:"memo",text:"확인대장(실사)은 마스터 열쇠로 엽니다. 마감 도장은 비품실 캐비닛 D7에 있고, 비품실 통로는 F4입니다."},
      A8:{type:"save"},
      E11:{type:"check",need:"key",label:"잠긴 확인대장",hint:"마스터 열쇠가 필요합니다 (보관실 A9~C9)."}
    },
    patrol:"F8 E8 D8 C8 D8 E8".split(" ")
  },
  stock: {
    name:"비품실", title:"비품실 재고 대장", cols:8, top:4, last:12, start:"A4",
    sub:"총무팀 / 비품 보관 · 통로 A4 보관실 · H4 전산실",
    blocks:"B5 C5 D5 E5 F5 G5 B6 F6 G6 B7 F7 G7 B8 F8 G8 B10 C10 E10 F10",
    spots: {
      A4:{type:"portal",to:"store",at:"F4"},
      H4:{type:"portal",to:"server",at:"A4"},
      C8:{type:"save"},
      D7:{type:"cabinet",need:"key",item:"stamp",label:"잠긴 캐비닛",
        hint:"마스터 열쇠가 필요합니다 (보관실 A9~C9).",
        text:"캐비닛 안: 마감 도장과 쪽지 — 보안코드는 전산실 F9 서버 로그, 서버실은 보안문(F8). 전산실 통로는 H4."}
    },
    patrol:"C9 D9 E9 F9 G9 G10 G11 H11 H12 G12 F12 E12 D12 C12 B12 A12 A11 A10 A9 B9".split(" ")
  },
  server: {
    name:"전산실", title:"전산실 서버 대장", cols:7, top:4, last:12, start:"A4",
    sub:"전산팀 / 서버·보안 · 통로 A4 비품실 · G4 비품대장",
    blocks:"D5 F5 B6 D6 F6 B7 E8 E9 G9 B10 D10 F10 B11",
    spots: {
      A4:{type:"portal",to:"stock",at:"H4"},
      G4:{type:"portal",to:"main",at:"H4"},
      C6:{type:"memo",text:"서버 로그는 보안문(F8) 뒤 F9에 있습니다. 문은 마스터 열쇠로 열립니다. 순찰에 걸리면 임시저장 지점에서 다시 시작합니다."},
      G7:{type:"save"},
      F8:{type:"lock",need:"key",label:"전산실 보안문",hint:"마스터 열쇠가 필요합니다."},
      F9:{type:"log",item:"code"}
    },
    patrol:"A8 B8 C8 C9 C10 C11 D11 E11 F11 F12 E12 D12 C12 B12 A12 A11 A10 A9".split(" ")
  }
};

const blockSets = {};
for (const [id, room] of Object.entries(rooms)) {
  blockSets[id] = new Set(room.blocks ? room.blocks.split(" ").filter(Boolean) : []);
}

export function isBlock(room, cell) { return blockSets[room].has(cell); }

export function resolveDay(value, now = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + "T12:00:00Z");
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value) return value;
  }
  return new Intl.DateTimeFormat("sv-SE", {timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit"}).format(now);
}

function hash(text) {
  let n = 2166136261;
  for (const character of text) n = Math.imul(n ^ character.charCodeAt(0), 16777619);
  n ^= n >>> 16;
  n = Math.imul(n, 0x85ebca6b);
  return (n ^ (n >>> 13)) >>> 0;
}

const planCache = new Map();
export function dailyPlan(day) {
  const cached = planCache.get(day);
  if (cached) return cached;
  const search = ["A9", "B9", "C9"];
  const first = hash(day + "/first") % 2 ? "marker" : "clip";
  const shift = {};
  for (const id of roomOrder) shift[id] = hash(day + "/" + id) % rooms[id].patrol.length;
  const plan = {
    search,
    keyCell: search[hash(day + "/key") % search.length],
    mainItem: first,
    storeItem: first === "marker" ? "clip" : "marker",
    shift
  };
  planCache.set(day, plan);
  return plan;
}

export function newRun(day, id) {
  return {
    day, id, room:"main", cell:rooms.main.start,
    started:null, step:0, ended:null, result:null,
    found:{}, taken:{}, searched:{}, visited:{main:true},
    checked:false, caughts:0, save:null, firsts:[],
    message:"C6 인계 메모를 확인하세요 · 방향키로 이동, Enter로 열기"
  };
}

export function hasItem(s, id) { return Object.hasOwn(s.found, id); }
const spotKey = (room, cell) => room + ":" + cell;

export function patrol(room, step, day) {
  const route = rooms[room].patrol;
  const shift = day ? dailyPlan(day).shift[room] : 0;
  return route[(step + shift) % route.length];
}
export function nextPatrol(room, step, day) {
  const current = patrol(room, step, day);
  return patrol(room, step + 1, day) === current ? patrol(room, step + 2, day) : patrol(room, step + 1, day);
}

function caught(s, at) {
  s.result = "caught";
  s.ended = at;
  s.caughts += 1;
  s.message = s.save
    ? "검수에 걸렸습니다 · Enter로 임시저장 지점(" + rooms[s.save.room].name + " " + s.save.cell + ")에서 재개"
    : "검수에 걸렸습니다 · Enter로 다시 시작";
}

export function advance(s, now) {
  if (s.started === null || s.result) return;
  const target = Math.max(s.step, Math.floor((now - s.started) / STEP));
  const last = Math.min(target, s.step + rooms[s.room].patrol.length);
  for (let i = s.step + 1; i <= last; i++) {
    if (patrol(s.room, i, s.day) === s.cell) { s.step = i; caught(s, s.started + i * STEP); return; }
  }
  s.step = target;
}

export function neighbor(room, cell, key) {
  const [dx, dy] = keys[key] ?? [0, 0];
  const m = rooms[room];
  const x = letters.indexOf(cell[0]) + dx;
  const r = Number(cell.slice(1)) + dy;
  if (x < 0 || x >= m.cols || r < m.top || r > m.last) return cell;
  return letters[x] + r;
}

/** 이동할 수 없는 이유(벽·잠긴 문)를 돌려준다. 갈 수 있으면 null. */
export function standReason(s, room, cell) {
  if (isBlock(room, cell)) return {kind:"wall"};
  const spot = rooms[room].spots?.[cell];
  if (spot?.need && !hasItem(s, spot.need)) return {kind:"door", spot};
  return null;
}

export function snapshot(s) {
  return {
    room:s.room, cell:s.cell, step:s.step, started:s.started, checked:s.checked,
    found:{...s.found}, taken:{...s.taken}, searched:{...s.searched},
    visited:{...s.visited}, firsts:[...s.firsts], caughts:s.caughts
  };
}

export function saveCheckpoint(s) {
  s.save = snapshot(s);
  return s.save;
}

export function resume(s) {
  if (!s.save) return false;
  const snap = s.save;
  s.room = snap.room; s.cell = snap.cell; s.step = snap.step; s.started = snap.started;
  s.checked = snap.checked;
  s.found = {...snap.found}; s.taken = {...snap.taken}; s.searched = {...snap.searched};
  s.visited = {...snap.visited}; s.firsts = [...snap.firsts]; s.caughts = snap.caughts;
  s.result = null; s.ended = null;
  s.message = "임시저장 지점에서 재개 · " + rooms[s.room].name + " " + s.cell;
  return true;
}

function finish(s, now) {
  const need = [];
  if (!hasItem(s, "stamp")) need.push("마감 도장");
  if (!hasItem(s, "code")) need.push("보안코드");
  if (need.length) {
    s.message = "마감 서류가 부족합니다 · " + need.join(" · ") + " 필요";
    return "need";
  }
  s.result = "won";
  s.ended = now;
  s.message = "퇴근 마감 완료" + (s.checked ? " · 전수 확인" : "") + " · Enter로 다시 작성";
  return "won";
}

export function move(s, key, now) {
  advance(s, now);
  if (s.result || !Object.hasOwn(keys, key)) return "blocked";
  if (s.started === null) s.started = now;
  const next = neighbor(s.room, s.cell, key);
  if (next === s.cell) { s.message = "시트 끝입니다. 다른 방향으로 이동하세요."; return "blocked"; }
  const reason = standReason(s, s.room, next);
  if (reason) {
    s.message = reason.kind === "wall"
      ? "벽입니다 · 어둡게 칠한 칸은 통과할 수 없습니다."
      : reason.spot.label + " · " + reason.spot.hint;
    return "blocked";
  }
  s.cell = next;
  if (patrol(s.room, s.step, s.day) === next) { caught(s, now); return "caught"; }
  const spot = rooms[s.room].spots?.[next];
  if (spot?.type === "save") {
    saveCheckpoint(s);
    s.message = "임시저장 완료 · " + rooms[s.room].name + " " + next + " (적발되면 여기서 재개)";
    return "saved";
  }
  if (spot?.type === "goal") return finish(s, now);
  if (spot?.type === "portal") { s.message = "통로 · Enter로 " + rooms[spot.to].name + " 이동"; return "moved"; }
  s.message = "";
  return "moved";
}

export function actionLabel(s) {
  if (s.result === "won") return "다시 작성";
  if (s.result === "caught") return s.save ? "임시저장 지점에서" : "다시 시작";
  const spot = rooms[s.room].spots?.[s.cell];
  if (!spot) {
    const plan = dailyPlan(s.day);
    if (plan.search.includes(s.cell) && !s.searched[spotKey(s.room, s.cell)]) return hasItem(s, "key") ? "확인" : "서가 확인";
    return "확인";
  }
  switch (spot.type) {
    case "memo": return s.taken[spotKey(s.room, s.cell)] ? "확인" : "메모 열기";
    case "cabinet": return s.taken[spotKey(s.room, s.cell)] ? "확인" : "캐비닛 열기";
    case "check": return s.checked ? "확인" : "실사 확인";
    case "portal": return "통로 이동";
    case "goal": return "퇴근 마감";
    case "save": return "임시저장";
    case "lock": return "보안문";
    case "log": return hasItem(s, spot.item) ? "확인" : "로그 열람";
  }
  return "확인";
}

/** Enter 동작. 결과 종류: item / checked / warp / won / need / none */
export function use(s, now) {
  advance(s, now);
  if (s.result) return {type:"none"};
  const room = s.room, cell = s.cell;
  const spot = rooms[room].spots?.[cell];
  const plan = dailyPlan(s.day);
  const key = spotKey(room, cell);
  if (spot) {
    if (spot.type === "memo") {
      if (s.taken[key]) return {type:"none", text:"이미 확인한 메모입니다."};
      const item = room === "main" ? plan.mainItem : plan.storeItem;
      s.taken[key] = true;
      if (!hasItem(s, item)) s.found[item] = rooms[room].name + " " + cell;
      return {type:"item", item, text:spot.text};
    }
    if (spot.type === "cabinet") {
      if (!hasItem(s, spot.need ?? "key")) return {type:"none", text:spot.label + " · " + spot.hint};
      if (s.taken[key]) return {type:"none", text:"캐비닛은 이미 비웠습니다."};
      s.taken[key] = true;
      if (!hasItem(s, spot.item)) s.found[spot.item] = rooms[room].name + " " + cell;
      return {type:"item", item:spot.item, text:spot.text};
    }
    if (spot.type === "check") {
      if (s.checked) return {type:"none", text:"실사 확인은 이미 마쳤습니다."};
      s.checked = true;
      return {type:"checked", text:"실사 확인 완료 · 확인대장에 날인했습니다"};
    }
    if (spot.type === "log") {
      if (hasItem(s, spot.item)) return {type:"none", text:"서버 로그는 이미 확인했습니다."};
      s.found[spot.item] = rooms[room].name + " " + cell;
      return {type:"item", item:spot.item, text:"서버 로그에서 보안코드를 확인했습니다"};
    }
    if (spot.type === "portal") {
      s.room = spot.to; s.cell = spot.at; s.visited[spot.to] = true;
      s.message = rooms[spot.to].name + " 도착 · 통로에서 Enter를 다시 누르면 되돌아갑니다";
      return {type:"warp"};
    }
    if (spot.type === "goal") return {type:finish(s, now)};
    if (spot.type === "lock") { s.message = "보안문이 열려 있습니다."; return {type:"none"}; }
    s.message = "임시저장 지점입니다 · 적발되면 여기서 재개합니다";
    return {type:"none"};
  }
  if (plan.search.includes(cell) && !hasItem(s, "key")) {
    if (cell === plan.keyCell) {
      s.found.key = rooms[room].name + " " + cell;
      s.searched[key] = true;
      return {type:"item", item:"key", text:"서가 뒤에서 마스터 열쇠를 찾았습니다"};
    }
    s.searched[key] = true;
    return {type:"none", text:"빈 서가입니다 · 다른 칸을 확인하세요"};
  }
  return {type:"none"};
}

/** 형광펜(다음 목표) 표시용 */
export function objective(s) {
  if (s.result) return null;
  const plan = dailyPlan(s.day);
  if (!s.taken["main:C6"]) return {room:"main", cell:"C6"};
  if (!hasItem(s, "key")) {
    if (!s.taken["store:B8"]) return {room:"store", cell:"B8"};
    const left = plan.search.filter(c => !s.searched["store:" + c]);
    return {room:"store", cell:left[0] ?? plan.keyCell};
  }
  if (!hasItem(s, "stamp")) return {room:"stock", cell:"D7"};
  if (!hasItem(s, "code")) return {room:"server", cell:"F9"};
  if (!s.checked) return {room:"store", cell:"E11"};
  return {room:"main", cell:"H12"};
}

export function resultLabel(s) {
  if (s.result === "caught") return "재확인 필요";
  if (s.result === "won") return s.checked ? "전수 확인" : "일반 마감";
  return "진행 중";
}

export function elapsed(s, now) { return s.started === null ? 0 : Math.max(0, Math.ceil(((s.ended ?? now) - s.started) / 1000)); }

export function summary(s, origin) {
  const [, m, d] = s.day.split("-").map(Number);
  const label = resultLabel(s), n = Object.keys(s.found).length;
  const fields = [m + "/" + d + " 비품 실사", label + " · 수집 " + n + "/" + Object.keys(rewards).length, elapsed(s, s.ended) + "초"];
  if (s.caughts) fields.push("적발 " + s.caughts + "회");
  if (s.firsts.length) fields.push(s.firsts.map(id => rewards[id].name).join("·") + " 첫 발견");
  const url = new URL(origin); url.search = "?day=" + s.day; url.hash = "";
  return [...fields, url.href].join(" | ");
}
