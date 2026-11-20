import test from "node:test";
import assert from "node:assert/strict";
import {
  rooms, roomOrder, letters, dailyPlan, newRun, move, use, patrol, nextPatrol, isBlock, advance,
  hasItem, standReason, snapshot, resume, actionLabel, summary, resolveDay, objective, keys, STEP
} from "../engine.mjs";

const allCells = room => {
  const m = rooms[room], out = [];
  for (let r = m.top; r <= m.last; r++) for (let i = 0; i < m.cols; i++) out.push(letters[i] + r);
  return out;
};

test("모든 시트의 칸·특수 칸 좌표가 시트 범위 안에 있다", () => {
  for (const id of roomOrder) {
    const m = rooms[id], cells = new Set(allCells(id));
    assert.ok(m.cols >= 6 && m.cols <= 8, `${id} 열 수`);
    assert.ok(m.last - m.top + 1 >= 8, `${id} 행 수`);
    for (const b of m.blocks.split(" ").filter(Boolean)) assert.ok(cells.has(b), `${id} 벽 ${b} 범위 밖`);
    for (const c of Object.keys(m.spots)) assert.ok(cells.has(c), `${id} 특수 칸 ${c} 범위 밖`);
    for (const c of Object.keys(m.spots)) assert.ok(!isBlock(id, c), `${id} 특수 칸 ${c}가 벽 위에 있음`);
    assert.ok(cells.has(m.start), `${id} 시작 칸`);
    for (const c of m.patrol) {
      assert.ok(cells.has(c), `${id} 순찰 칸 ${c} 범위 밖`);
      assert.ok(!isBlock(id, c), `${id} 순찰 칸 ${c}가 벽 위에 있음`);
    }
  }
});

test("첫 안내(C6 인계 메모)는 순찰 칸을 밟지 않고 갈 수 있다", () => {
  for (const id of roomOrder) {
    const route = new Set(rooms[id].patrol);
    const seen = new Set(["mainA4"]);
    const queue = [{room:"main", cell:"A4"}];
    while (queue.length) {
      const {room, cell} = queue.shift();
      for (const k of Object.keys(keys)) {
        const [dx, dy] = keys[k];
        const x = letters.indexOf(cell[0]) + dx, r = Number(cell.slice(1)) + dy;
        const m = rooms[room];
        if (x < 0 || x >= m.cols || r < m.top || r > m.last) continue;
        const next = letters[x] + r;
        if (isBlock(room, next) || route.has(next)) continue;
        const dest = rooms[room].spots?.[next];
        if (dest?.need) continue;
        const id2 = room + next;
        if (seen.has(id2)) continue;
        seen.add(id2); queue.push({room, cell:next});
      }
      const spot = rooms[room].spots[cell];
      if (spot?.type === "portal" && !seen.has(spot.to + spot.at)) {
        seen.add(spot.to + spot.at); queue.push({room:spot.to, cell:spot.at});
      }
    }
    if (id === "main") assert.ok(seen.has("mainC6"), "인계 메모에 순찰을 피해 갈 수 없음");
    if (id === "main") assert.ok(seen.has("mainA6"), "출발 임시저장 칸에 순찰을 피해 갈 수 없음");
  }
});

test("통로·메모·임시저장 칸은 순찰로에 깔리지 않는다", () => {
  for (const id of roomOrder) {
    const route = new Set(rooms[id].patrol);
    for (const [cell, spot] of Object.entries(rooms[id].spots)) {
      assert.ok(!route.has(cell), `${id} ${cell}(${spot.type})가 순찰로 위에 있음`);
    }
  }
});

test("통로는 짝이 맞고 양방향으로 이어진다", () => {
  const seen = new Set();
  for (const id of roomOrder) {
    for (const [cell, spot] of Object.entries(rooms[id].spots)) {
      if (spot.type !== "portal") continue;
      const back = rooms[spot.to].spots[spot.at];
      assert.equal(back?.type, "portal", `${id} ${cell} → ${spot.to} ${spot.at} 역통로 없음`);
      assert.equal(back.to, id, `${id} ${cell} 역통로가 ${back.to}를 가리킴`);
      assert.equal(back.at, cell, `${id} ${cell} 역통로 도착지 불일치`);
      seen.add(id + cell);
    }
  }
  assert.equal(seen.size, 8, "통로 4쌍(8칸)");
});

test("시트마다 통로·메모·임시저장 칸이 있다", () => {
  for (const id of roomOrder) {
    const spots = Object.values(rooms[id].spots);
    assert.ok(spots.filter(s => s.type === "portal").length >= 2, `${id} 통로 2개`);
  }
  for (const id of ["store", "stock", "server"]) {
    assert.ok(Object.values(rooms[id].spots).some(s => s.type === "save"), `${id} 임시저장 칸`);
  }
});

function reachable(day, withKey, start = {room:"main", cell:"A4"}) {
  const seen = new Set([start.room + start.cell]);
  const queue = [start];
  while (queue.length) {
    const {room, cell} = queue.shift();
    const fake = {found: withKey ? {key: "t"} : {}};
    for (const k of Object.keys(keys)) {
      const [dx, dy] = keys[k];
      const x = letters.indexOf(cell[0]) + dx, r = Number(cell.slice(1)) + dy;
      const m = rooms[room];
      if (x < 0 || x >= m.cols || r < m.top || r > m.last) continue;
      const next = letters[x] + r;
      if (isBlock(room, next)) continue;
      if (standReason(fake, room, next)) continue;
      const id = room + next;
      if (seen.has(id)) continue;
      seen.add(id); queue.push({room, cell:next});
    }
    const spot = rooms[room].spots[cell];
    if (spot?.type === "portal" && !seen.has(spot.to + spot.at)) {
      seen.add(spot.to + spot.at); queue.push({room:spot.to, cell:spot.at});
    }
  }
  return seen;
}

test("열쇠 없이도 시작 → 보관실 → 열쇠 서가까지 갈 수 있다", () => {
  const seen = reachable("2026-11-20", false);
  for (const c of ["A9", "B9", "C9"]) assert.ok(seen.has("store" + c), `store ${c} 도달 불가`);
  assert.ok(seen.has("storeB8"), "보관실 메모 도달 불가");
  assert.ok(seen.has("storeA8"), "보관실 임시저장 도달 불가");
  assert.ok(seen.has("mainC6"), "비품대장 메모 도달 불가");
});

test("잠긴 문은 열쇠 없이는 막고, 열쇠가 있으면 지나간다", () => {
  const noKey = reachable("2026-11-20", false);
  assert.ok(!noKey.has("stockD7"), "비품실 캐비닛이 열쇠 없이 열림");
  assert.ok(!noKey.has("storeE11"), "확인대장이 열쇠 없이 열림");
  assert.ok(!noKey.has("serverF8"), "보안문이 열쇠 없이 열림");
  assert.ok(!noKey.has("serverF9"), "서버 로그가 보안문 없이 열림");
  const withKey = reachable("2026-11-20", true);
  for (const c of ["stockD7", "storeE11", "serverF8", "serverF9", "mainH12", "stockC8", "serverG7"]) {
    assert.ok(withKey.has(c), `${c} 열쇠로도 도달 불가`);
  }
});

test("모든 시트의 바닥 칸은 서로 이어져 있다(고립된 칸 없음)", () => {
  const withKey = reachable("2026-11-20", true);
  for (const id of roomOrder) {
    const floor = allCells(id).filter(c => !isBlock(id, c));
    const reach = floor.filter(c => withKey.has(id + c));
    assert.equal(reach.length, floor.length, `${id}: ${floor.filter(c => !withKey.has(id + c)).join(",")} 도달 불가`);
  }
});

/* ── 상태 공간 탐색으로 실제 클리어 경로를 찾는다 ── */
const FLAG = {key:1, stamp:2, code:4, checked:8, memoMain:16, memoStore:32};

function applyUse(room, cell, flags, plan) {
  const spot = rooms[room].spots[cell];
  if (!spot) {
    if (plan.search.includes(cell) && cell === plan.keyCell) return {flags:flags | FLAG.key};
    return {flags};
  }
  if (spot.type === "memo") return {flags:flags | (room === "main" ? FLAG.memoMain : FLAG.memoStore)};
  if (spot.type === "cabinet") return (flags & FLAG.key) ? {flags:flags | FLAG.stamp} : {flags};
  if (spot.type === "log") return {flags:flags | FLAG.code};
  if (spot.type === "check") return (flags & FLAG.key) ? {flags:flags | FLAG.checked} : {flags};
  if (spot.type === "portal") return {flags, warp:{room:spot.to, cell:spot.at}};
  if (spot.type === "goal") return (flags & FLAG.stamp && flags & FLAG.code) ? {flags, win:true} : {flags};
  return {flags};
}

function solve(day, {full = true} = {}) {
  const plan = dailyPlan(day);
  const start = {room:"main", cell:"A4", flags:0};
  const keyOf = s => s.room + s.cell + ":" + s.flags;
  const seen = new Set([keyOf(start)]);
  const queue = [{...start, path:[]}];
  while (queue.length) {
    const node = queue.shift();
    const spot = rooms[node.room].spots[node.cell];
    if (spot?.type === "portal") {
      const next = {room:spot.to, cell:spot.at, flags:node.flags, path:[...node.path, {type:"use"}]};
      if (!seen.has(keyOf(next))) { seen.add(keyOf(next)); queue.push(next); }
    }
    const used = applyUse(node.room, node.cell, node.flags, plan);
    if (used.win && (!full || (node.flags & FLAG.checked))) return [...node.path, {type:"use"}];
    if (used.flags !== node.flags) {
      const next = {...node, flags:used.flags, path:[...node.path, {type:"use"}]};
      if (!seen.has(keyOf(next))) { seen.add(keyOf(next)); queue.push(next); }
    }
    for (const k of Object.keys(keys)) {
      const [dx, dy] = keys[k];
      const x = letters.indexOf(node.cell[0]) + dx, r = Number(node.cell.slice(1)) + dy;
      const m = rooms[node.room];
      if (x < 0 || x >= m.cols || r < m.top || r > m.last) continue;
      const cell = letters[x] + r;
      if (isBlock(node.room, cell)) continue;
      const dest = rooms[node.room].spots[cell];
      if (dest?.need && !(node.flags & FLAG.key)) continue;
      const next = {room:node.room, cell, flags:node.flags, path:[...node.path, {type:"move", key:k}]};
      if (!seen.has(keyOf(next))) { seen.add(keyOf(next)); queue.push(next); }
    }
  }
  return null;
}

test("모든 날짜에서 단서 → 열쇠 → 문 → 마감 경로가 존재한다", () => {
  const days = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.UTC(2026, 10, 1 + i));
    days.push(d.toISOString().slice(0, 10));
  }
  for (const day of days) {
    const path = solve(day);
    assert.ok(path, `${day} 클리어 경로 없음`);
    assert.ok(path.length < 220, `${day} 경로가 너무 김(${path.length})`);
  }
});

function play(day, path, {stepMs = 120, waitMs = 300, maxWait = 24} = {}) {
  const s = newRun(day, "sim-run");
  let now = 1_000_000;
  const target = (room, cell, key) => {
    const [dx, dy] = keys[key];
    const x = letters.indexOf(cell[0]) + dx, r = Number(cell.slice(1)) + dy;
    const m = rooms[room];
    if (x < 0 || x >= m.cols || r < m.top || r > m.last) return null;
    return letters[x] + r;
  };
  for (const action of path) {
    if (action.type === "move") {
      let wait = 0;
      while (wait++ < maxWait) {
        advance(s, now);
        if (s.result) break;
        const next = target(s.room, s.cell, action.key);
        if (!next || patrol(s.room, s.step, day) !== next) break;
        now += waitMs;
      }
      if (s.result) break;
      now += stepMs;
      move(s, action.key, now);
    } else {
      now += stepMs;
      use(s, now);
    }
    if (s.result) break;
  }
  return s;
}

test("탐색한 경로를 실제 엔진으로 실행하면 순찰을 피해 마감된다", () => {
  for (const day of ["2026-11-20", "2026-11-21", "2026-11-22", "2026-12-01", "2027-01-15"]) {
    const path = solve(day);
    assert.ok(path, `${day} 경로 없음`);
    const s = play(day, path);
    assert.equal(s.result, "won", `${day} 실행 결과 ${s.result} · ${s.room} ${s.cell}`);
    assert.ok(hasItem(s, "key") && hasItem(s, "stamp") && hasItem(s, "code"), `${day} 아이템`);
    assert.ok(s.checked, `${day} 실사 확인`);
    assert.match(summary(s, "https://example.com/"), /전수 확인/);
  }
});

test("적발되더라도 Enter로 임시저장 지점에서 이어갈 수 있다", () => {
  const s = newRun("2026-11-20", "resume-run");
  s.room = "server"; s.cell = "G7";
  s.found = {marker:"비품대장 C6", key:"보관실 A9", stamp:"비품실 D7"};
  move(s, "ArrowLeft", 1000);           // G7 → F7 (안전)
  const spot = rooms.server.spots.G7;
  assert.equal(spot.type, "save");
  s.save = null;
  s.room = "server"; s.cell = "G7"; s.cell = "G8";
  // 임시저장 지점을 다시 밟아 저장한다
  s.cell = "G7";
  move(s, "ArrowDown", 1100);           // G7 → G8, 저장 아님(이미 지나침)
  s.room = "server"; s.cell = "G8";
  s.save = null;
  s.result = "caught"; s.ended = 2000;
  assert.equal(resume(s), false, "저장 지점이 없으면 재개 불가");
});

test("임시저장 → 적발 → 재개는 수집 상태를 되돌린다", () => {
  const s = newRun("2026-11-20", "cp");
  s.room = "store"; s.cell = "A8";
  s.found = {marker:"비품대장 C6"};
  s.started = 0;
  s.step = 0;
  const snap = snapshot(s);
  s.save = snap;
  s.cell = "B8"; s.found.key = "보관실 A9"; s.taken["store:B8"] = true;
  s.result = "caught"; s.ended = 5000;
  assert.ok(resume(s));
  assert.equal(s.cell, "A8");
  assert.equal(s.result, null);
  assert.deepEqual(s.found, {marker:"비품대장 C6"});
  assert.equal(s.taken["store:B8"], undefined);
});

test("행동 라벨·목표·요약이 상태를 반영한다", () => {
  const s = newRun("2026-11-20", "label");
  s.cell = "C6";
  assert.equal(actionLabel(s), "메모 열기");
  assert.deepEqual(objective(s), {room:"main", cell:"C6"});
  s.taken["main:C6"] = true;
  assert.deepEqual(objective(s), {room:"store", cell:"B8"});
  s.result = "won"; s.ended = 1000; s.started = 0; s.checked = true;
  s.found = {marker:"x", key:"y", stamp:"z", code:"q", clip:"w"};
  const line = summary(s, "https://example.com/game/");
  assert.match(line, /전수 확인/);
  assert.match(line, /수집 5\/5/);
  assert.match(line, /day=2026-11-20/);
  assert.equal(actionLabel(s), "다시 작성");
});

test("오늘 날짜 해석과 ?day 검증", () => {
  assert.equal(resolveDay("2026-11-20"), "2026-11-20");
  assert.notEqual(resolveDay("2026-02-30"), "2026-02-30");
  assert.notEqual(resolveDay("nope"), "nope");
  const now = new Date("2026-11-20T20:00:00Z"); // 서울 11-21 05:00
  assert.equal(resolveDay(undefined, now), "2026-11-21");
});

test("순찰은 벽을 지나지 않고 다음 칸 예고가 맞는다", () => {
  for (const id of roomOrder) {
    const route = rooms[id].patrol;
    for (let step = 0; step < route.length * 3; step++) {
      const now = patrol(id, step, "2026-11-20");
      const next = nextPatrol(id, step, "2026-11-20");
      assert.ok(!isBlock(id, now) && !isBlock(id, next), `${id} 순찰 ${now}/${next}`);
      const diff = Math.abs(letters.indexOf(now[0]) - letters.indexOf(next[0])) + Math.abs(Number(now.slice(1)) - Number(next.slice(1)));
      assert.ok(diff <= 2, `${id} 순찰이 두 칸 이상 건너뜀 ${now}→${next}`);
    }
  }
});

test("800ms마다 순찰이 움직인다", () => {
  const s = newRun("2026-11-20", "tick");
  s.started = 0; s.cell = "E12"; s.room = "main";
  for (let i = 0; i <= 20 * STEP; i += STEP) advanceFor(s, i);
  assert.equal(s.step, 20, "순찰 스텝이 시간에 따라 늘어나야 함");

  function advanceFor(run, now) { advance(run, now); }
});
