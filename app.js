/* =========================================================
   인내의 숲 — Firebase 실시간 스케줄 + 나만의 나무 스티커판
   ---------------------------------------------------------
   Realtime Database 주소(databaseURL)만 있으면 실시간 연동됩니다.
   databaseURL을 비우면 "데모 모드"로 동작합니다(이 기기 브라우저에만 저장).
   ========================================================= */
const FIREBASE_CONFIG = {
  databaseURL: "https://forest-of-patience-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "forest-of-patience"
};
const FIREBASE_VERSION = "10.12.2";
const ROOT = "forest";               // 데이터베이스 최상위 경로
const LS_DATA = "forest.demo.v2";    // 데모 모드 저장 키
const LS_ME = "forest.me";

/* ---------- 참여자 & 로테이션 (노션 '인내의숲 11월' 규칙) ----------
   PEOPLE 순서 = 1주차 담당 순서 (빨강·주황·노랑·초록·파랑·보라)
   매주 명단이 한 칸씩 위로 올라가고, 맨 위 사람은 맨 아래(보라)로 갑니다.
   예) 2주차: 정기주 빨강, 이지민 주황, 안서우 노랑, 정기언 초록, 이지윤 파랑, 안지우 보라
   → 한 사람 기준으로는 빨강 → 보라 → 파랑 → 초록 → 노랑 → 주황 순서로 돌아요.  */
const PEOPLE = ["안지우", "정기주", "이지민", "안서우", "정기언", "이지윤"];

/* ---------- 항목 (노션 '인내의숲 11월') ---------- */
const GROUPS = [
  { id: "red",    color: "#E5534B" },
  { id: "orange", color: "#F08A24" },
  { id: "yellow", color: "#E3AE00" },
  { id: "green",  color: "#3FA34D" },
  { id: "blue",   color: "#3B82D6" },
  { id: "purple", color: "#8E5BD6" }
];

// once: true → 일주일에 한 번만 체크 (마사지 섬김)
const TASKS = [
  { id: "t01", g: "red",    name: "엘리베이터 청소" },
  { id: "t02", g: "red",    name: "101호 화장실 청소" },
  { id: "t03", g: "red",    name: "101호 분리수거 (버리기)" },
  { id: "t04", g: "red",    name: "마사지 섬김 (아영쌤)", once: true },
  { id: "t05", g: "orange", name: "풀뽑기/눈치우기" },
  { id: "t06", g: "orange", name: "재활용 분리수거" },
  { id: "t07", g: "orange", name: "마사지 섬김 (실장님)", once: true },
  { id: "t08", g: "yellow", name: "주차장 청소" },
  { id: "t09", g: "yellow", name: "계단 청소" },
  { id: "t10", g: "yellow", name: "홈트 준비 및 뒷정리" },
  { id: "t11", g: "yellow", name: "마사지 섬김 (디렉터님)", once: true },
  { id: "t12", g: "green",  name: "106호 분리수거" },
  { id: "t13", g: "green",  name: "101호 신발장 책가방 로봇청소기" },
  { id: "t14", g: "green",  name: "104호 1층 청소기" },
  { id: "t15", g: "green",  name: "마사지 섬김 (코치님)", once: true },
  { id: "t16", g: "blue",   name: "106호 화장실 청소" },
  { id: "t17", g: "blue",   name: "104호 분리수거" },
  { id: "t18", g: "blue",   name: "마사지 섬김 (온유쌤)", once: true },
  { id: "t19", g: "purple", name: "101호 분리수거 (닦기)" },
  { id: "t20", g: "purple", name: "104호 화장실 청소" },
  { id: "t21", g: "purple", name: "재활용 분리수거 (닦기)" },
  { id: "t22", g: "purple", name: "마사지 섬김 (제인집사님)", once: true }
];

/* ---------- 주차 ----------
   리뉴얼 시작: 11월 4주차(2026-11-16, 월요일). 이후 주차는 날짜로 자동 생성돼요.
   n = 노션 기준 주차 번호(로테이션 기준, 데이터 저장 키 w4, w5 …)
   그 달 1일이 들어 있는 주가 1주차 (= 그 주 일요일이 속한 달).               */
const START_DATE = "2026-11-16";
const START_N = 4;
const WEEKS_AHEAD = 52;              // 시작부터 1년치 주차를 만들어 둠

/* ---------- 나무 크기 ---------- */
const TREE_SIZE = 32;                // 인내의 숲 나무 (청소·정리 항목)
const MASSAGE_TREE_SIZE = 12;        // 마사지 섬김 나무 (일주일에 1개)

function buildWeeks() {
  const out = [];
  const base = new Date(START_DATE + "T00:00:00");
  const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
  for (let i = 0; i < WEEKS_AHEAD; i++) {
    const s = new Date(base); s.setDate(base.getDate() + i * 7);
    const e = new Date(s); e.setDate(s.getDate() + 6);
    out.push({
      n: START_N + i,
      m: `${e.getMonth() + 1}월`,
      k: Math.ceil(e.getDate() / 7),
      range: `${md(s)} – ${md(e)}`,
      start: s,
      end: e
    });
  }
  return out;
}
const WEEKS = buildWeeks();

const DATA_VERSION = 3;
function buildSeed() {
  return { meta: { seededAt: Date.now(), version: DATA_VERSION } };
}

// 저장된 일정 시간(dt)을 모두 지우는 경로 목록 (체크는 그대로) — 한 번만 실행
function clearTimePaths(weeks) {
  const up = {};
  Object.entries(weeks || {}).forEach(([wk, wd]) =>
    Object.entries((wd && wd.rows) || {}).forEach(([tid, row]) =>
      Object.entries(row || {}).forEach(([sk, slot]) => {
        if (slot && slot.dt) up[`weeks/${wk}/rows/${tid}/${sk}/dt`] = null;
      })));
  return up;
}

/* =========================================================
   저장소: Firebase Realtime Database / 데모(localStorage)
   ========================================================= */
const Store = (() => {
  let mode = "demo", db = null, local = null, lastError = "";
  const subs = [], connSubs = [];
  const emit = d => subs.forEach(fn => fn(d || {}));
  const emitConn = c => connSubs.forEach(fn => fn(c));

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("load " + src));
      document.head.appendChild(s);
    });
  }
  function readLocal() { try { return JSON.parse(localStorage.getItem(LS_DATA)) || null; } catch (e) { return null; } }
  function writeLocal() { try { localStorage.setItem(LS_DATA, JSON.stringify(local)); } catch (e) {} }
  function setIn(obj, parts, val) {
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof o[parts[i]] !== "object" || o[parts[i]] === null) o[parts[i]] = {};
      o = o[parts[i]];
    }
    const k = parts[parts.length - 1];
    if (val === null || val === undefined) delete o[k]; else o[k] = val;
  }

  async function init() {
    if (FIREBASE_CONFIG.databaseURL) {
      try {
        const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
        await loadScript(base + "firebase-app-compat.js");
        await loadScript(base + "firebase-database-compat.js");
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database();
        mode = "firebase";
        const ref = db.ref(ROOT);
        // 처음 한 번만 노션 데이터로 채우기 (동시에 여러 명이 열어도 한 번만)
        await ref.transaction(cur => (cur && cur.meta) ? undefined : Object.assign({}, cur || {}, buildSeed()));
        // 한 번만: 예전에 들어간 일정 시간을 모두 비우기
        const mig = await ref.child("meta/version").transaction(v => (v || 0) < DATA_VERSION ? DATA_VERSION : undefined);
        if (mig.committed) {
          const wsnap = await ref.child("weeks").get();
          const up = clearTimePaths(wsnap.val());
          if (Object.keys(up).length) await ref.update(up);
        }
        ref.on("value", snap => emit(snap.val()));
        db.ref(".info/connected").on("value", s => emitConn(!!s.val()));
        return mode;
      } catch (e) {
        console.error("Firebase 연결 실패 → 데모 모드로 전환", e);
        lastError = /permission/i.test(String(e && (e.code || e.message)))
          ? "권한 거부 — Realtime Database '규칙' 탭에 forest 읽기/쓰기 규칙을 게시해 주세요"
          : /load https/.test(String(e && e.message))
            ? "Firebase 라이브러리를 불러오지 못했어요 (인터넷 연결 또는 미리보기 화면 제한)"
            : String((e && (e.code || e.message)) || e);
      }
    }
    mode = "demo";
    local = readLocal();
    if (!local || !local.meta) { local = buildSeed(); writeLocal(); }
    if ((local.meta.version || 0) < DATA_VERSION) {
      Object.keys(clearTimePaths(local.weeks)).forEach(p => setIn(local, p.split("/"), null));
      local.meta.version = DATA_VERSION; writeLocal();
    }
    window.addEventListener("storage", e => {
      if (e.key === LS_DATA) { local = readLocal() || local; emit(local); }
    });
    setTimeout(() => { emit(local); emitConn(true); }, 0);
    return mode;
  }

  function update(paths) {
    if (mode === "firebase") return db.ref(ROOT).update(paths);
    Object.entries(paths).forEach(([p, v]) => setIn(local, p.split("/"), v));
    writeLocal(); emit(local);
    return Promise.resolve();
  }

  return {
    init, update,
    set: (p, v) => update({ [p]: v }),
    onData: fn => subs.push(fn),
    onConn: fn => connSubs.push(fn),
    get mode() { return mode; },
    get error() { return lastError; }
  };
})();

/* =========================================================
   상태 & 유틸
   ========================================================= */
let DATA = {};
let ME = "";
let WEEK = pickCurrentWeek();
let ready = false;
let prevDone = null;     // 직전 스티커 상태 (새로 붙은 스티커 감지용)
let popKeys = new Set();
let scrollTabs = true;   // 주차 탭을 선택된 주로 스크롤할지

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const keyOf = name => name.trim().replace(/[.#$\[\]\/]/g, "_");
const mod = (a, n) => ((a % n) + n) % n;
const weekOf = n => WEEKS.find(w => w.n === n);

function pickCurrentWeek() {
  const now = new Date();
  for (let i = WEEKS.length - 1; i >= 0; i--) {
    if (now >= WEEKS[i].start) return WEEKS[i].n;
  }
  return WEEKS[0].n;   // 시작 전에는 첫 주(11월 4주차)를 보여줌
}

/* 로테이션: w주차에 그룹 gi를 맡는 사람 / 사람 p가 맡는 그룹 */
const assigneeOf = (w, gi) => PEOPLE[mod(gi + (w - 1), PEOPLE.length)];
const groupIndexOf = (w, name) => {
  const p = PEOPLE.indexOf(name);
  return p < 0 ? -1 : mod(p - (w - 1), GROUPS.length);
};
const groupIdx = gid => GROUPS.findIndex(g => g.id === gid);
const tasksOfGroup = gi => TASKS.filter(t => t.g === GROUPS[gi].id);
const tasksOf = (w, name) => { const gi = groupIndexOf(w, name); return gi < 0 ? [] : tasksOfGroup(gi); };
const taskOwner = (w, t) => assigneeOf(w, groupIdx(t.g));

const weekData = w => (DATA.weeks && DATA.weeks["w" + w]) || {};
const rowOf = (w, t) => (weekData(w).rows || {})[t] || {};
const slotOf = (row, n) => row["s" + n] || {};
const slotNums = t => t.once ? [1] : [1, 2, 3];
const slotCount = t => slotNums(t).length;
const doneCount = (w, t) => slotNums(t).filter(n => slotOf(rowOf(w, t.id), n).done).length;
const isDone = (w, t) => doneCount(w, t) === slotCount(t);
// 항목이 완료된 시각 = 마지막으로 체크한 칸의 시각
const doneAt = (w, t) => Math.max(0, ...slotNums(t).map(n => slotOf(rowOf(w, t.id), n).at || 0));

/* 나무 두 그루: 인내의 숲(청소·정리 항목) / 마사지 섬김 */
const TREES = {
  main:    { size: TREE_SIZE,         title: "인내의 숲 나무",  match: t => !t.once },
  massage: { size: MASSAGE_TREE_SIZE, title: "마사지 섬김 나무", match: t => !!t.once }
};
const treeOfTask = t => t.once ? "massage" : "main";

// 받은 스티커를 완료한 순서대로
function earnedList(name, kind) {
  const out = [];
  WEEKS.forEach(w => tasksOf(w.n, name).filter(TREES[kind].match).forEach(t => {
    if (isDone(w.n, t)) out.push({ w: w.n, t, at: doneAt(w.n, t), i: TASKS.indexOf(t) });
  }));
  out.sort((a, b) => (a.at - b.at) || (a.w - b.w) || (a.i - b.i));
  return out;
}

function stickerSet() {
  const s = new Set();
  WEEKS.forEach(w => TASKS.forEach(t => { if (isDone(w.n, t)) s.add(`${w.n}:${t.id}`); }));
  return s;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
function fmtDT(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return v;
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h < 12 ? "오전" : "오후"; h = h % 12 || 12;
  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]}) ${ap} ${h}:${m}`;
}

/* =========================================================
   렌더링
   ========================================================= */
function renderTabs() {
  const cur = pickCurrentWeek();
  $("#weekTabs").innerHTML = WEEKS.map(w => {
    const mine = tasksOf(w.n, ME);
    const main = mine.filter(t => !t.once), ms = mine.filter(t => t.once);
    const d = main.filter(t => isDone(w.n, t)).length + ms.filter(t => isDone(w.n, t)).length;
    const all = main.length + ms.length;
    return `<button type="button" role="tab" aria-selected="${w.n === WEEK}" data-week="${w.n}" class="${w.n === cur ? "now" : ""}${d === all && all ? " full" : ""}">
      <b>${w.m} ${w.k}주차</b><small>${w.range} · ${d}/${all}</small></button>`;
  }).join("");
  if (scrollTabs) {
    const sel = $("#weekTabs [aria-selected='true']");
    if (sel) sel.scrollIntoView({ block: "nearest", inline: "center" });
    scrollTabs = false;
  }
}

/* ---------- 스티커판 자리 ----------
   1번 칸은 맨 위 왼쪽, 왼쪽 → 오른쪽, 위 → 아래 순서로 채워져요.          */
const LAYOUTS = {
  // [y, 그 줄 칸 수]
  32: { gap: 38, r: 14, rows: [[48, 3], [84, 4], [120, 5], [156, 6], [192, 6], [228, 5], [264, 3]] },
  12: { gap: 50, r: 18, rows: [[64, 2], [116, 3], [168, 4], [222, 3]] }
};
function layoutFor(size) {
  if (LAYOUTS[size]) return LAYOUTS[size];
  // 다른 크기로 바꿨을 때: 32칸 배치를 기준으로 줄마다 고르게 나눔
  const base = LAYOUTS[32], cap = base.rows.reduce((a, r) => a + r[1], 0);
  const per = base.rows.map(([, c]) => Math.floor(c * size / cap));
  let left = size - per.reduce((a, b) => a + b, 0);
  for (let i = Math.floor(per.length / 2); left > 0; i = (i + 1) % per.length) { per[i]++; left--; }
  return { gap: base.gap, r: base.r, rows: base.rows.map(([y], i) => [y, per[i]]) };
}
function slotPositions(size) {
  const L = layoutFor(size), pts = [];
  L.rows.forEach(([y, c]) => { for (let i = 0; i < c; i++) pts.push([200 + (i - (c - 1) / 2) * L.gap, y]); });
  return { pts, r: L.r };
}

const TREE_ART = `
  <ellipse cx="200" cy="424" rx="170" ry="13" class="t-ground"/>
  <path d="M178 424 C184 370 182 330 172 292 L228 292 C218 330 216 370 222 424 Z" class="t-trunk"/>
  <path d="M190 312 C170 296 150 282 128 262" class="t-branch"/>
  <path d="M210 312 C232 294 252 280 274 258" class="t-branch"/>
  <circle cx="112" cy="198" r="84" class="t-canopy2"/>
  <circle cx="288" cy="198" r="84" class="t-canopy2"/>
  <circle cx="200" cy="248" r="80" class="t-canopy2"/>
  <circle cx="200" cy="165" r="126" class="t-canopy"/>
  <circle cx="146" cy="100" r="78" class="t-canopy"/>
  <circle cx="254" cy="100" r="78" class="t-canopy"/>
  <circle cx="200" cy="68" r="66" class="t-canopy"/>`;

function renderTree(kind) {
  const T = TREES[kind];
  const earned = earnedList(ME, kind);
  // 한 그루를 다 채우면 다음 나무로
  const treeNo = earned.length === 0 ? 1 : Math.ceil(earned.length / T.size);
  const onTree = earned.slice((treeNo - 1) * T.size, treeNo * T.size);
  const { pts, r } = slotPositions(T.size);
  const s = r / 16;   // 스티커 크기 배율

  let slots = "";
  pts.forEach(([x, y], i) => {
    const e = onTree[i];
    let inner, tip;
    if (e) {
      const g = GROUPS[groupIdx(e.t.g)];
      const R = r + 2;
      inner = `<circle r="${R}" fill="${g.color}"/>
        <circle r="${R}" class="stk-ring" opacity=".5"/>
        <ellipse cx="${-5 * s}" cy="${-6 * s}" rx="${5 * s}" ry="${3.5 * s}" class="stk-shine"/>
        <path d="M1 -15 C4 -24 12 -25 15 -21 C11 -17 5 -14 1 -15 Z" transform="scale(${(R / 16).toFixed(2)})" class="stk-leaf"/>`;
      const w = weekOf(e.w);
      tip = `${i + 1}번째 · ${w.m} ${w.k}주차 · ${e.t.name}`;
    } else {
      inner = `<circle r="${r}" class="slot-empty"/>
        <text class="slot-num" text-anchor="middle" dy="0.35em" font-size="${(r * 0.8).toFixed(1)}">${i + 1}</text>`;
      tip = `${i + 1}번째 칸`;
    }
    const key = e ? `${e.w}:${e.t.id}` : "";
    slots += `<g transform="translate(${x.toFixed(1)} ${y})"><title>${esc(tip)}</title>
      <g class="slot-in${key && popKeys.has(key) ? " pop" : ""}">${inner}</g></g>`;
  });

  const filled = onTree.length;
  const full = filled >= T.size;
  const star = full ? `<polygon class="tree-star" points="${starPoints(200, 14, 16, 7)}"/>` : "";

  const svg = $(`#tree-${kind}`);
  svg.innerHTML = TREE_ART + slots + star;
  svg.setAttribute("aria-label", `${T.title}, ${T.size}칸 중 ${filled}개 붙음`);
  $(`#tree-${kind}-title`).textContent = treeNo > 1 ? `${T.title} · ${treeNo}번째` : T.title;
  $(`#tree-${kind}-count`).innerHTML = full ? `<b>완성!</b> ${filled}/${T.size}` : `<b>${filled}</b>/${T.size}`;
}

function starPoints(cx, cy, R, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
    p.push((cx + rad * Math.cos(a)).toFixed(1) + "," + (cy + rad * Math.sin(a)).toFixed(1));
  }
  return p.join(" ");
}

const CHECK_SVG = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5 L8.5 15 L16 6"/></svg>`;

function renderGroups() {
  const gi = groupIndexOf(WEEK, ME);
  const w = weekOf(WEEK);
  $("#schedTitle").textContent = `${w.m} ${w.k}주차 나의 스케줄`;
  $("#schedRange").textContent = w.range;
  if (gi < 0) { $("#groups").innerHTML = ""; return; }

  const g = GROUPS[gi];
  const ts = tasksOfGroup(gi);
  let html = `<div class="group" style="--gc:${g.color}">`;
  ts.forEach(t => {
    const row = rowOf(WEEK, t.id);
    const k = doneCount(WEEK, t), n = slotCount(t);
    const done = k === n;
    html += `<div class="row${done ? " done" : ""}${t.once ? " massage" : ""}">
      <div class="row-title"><span>${esc(t.name)}</span>
        <em class="badge">${done ? (t.once ? "마사지 나무에 스티커" : "스티커 받음") : `${k}/${n}`}</em></div>
      <div class="slots${t.once ? " one" : ""}">`;
    slotNums(t).forEach(sn => {
      const s = slotOf(row, sn);
      html += `<div class="slot">
        ${t.once ? "" : `<span class="slot-n">${sn}</span>`}
        <div class="slot-face${s.dt ? " has" : ""}">
          ${s.dt ? `<span>${esc(fmtDT(s.dt))}</span>` : `<span class="ph">날짜·시간</span>`}
          <input type="datetime-local" id="dt-${t.id}-${sn}" class="slot-dt" data-t="${t.id}" data-n="${sn}" value="${esc(s.dt || "")}" aria-label="${esc(t.name)} ${sn}번째 일정">
          ${s.dt ? `<button type="button" class="slot-clear" data-t="${t.id}" data-n="${sn}" aria-label="일정 지우기">×</button>` : ""}
        </div>
        <button type="button" class="chk" id="chk-${t.id}-${sn}" data-t="${t.id}" data-n="${sn}" aria-pressed="${!!s.done}" aria-label="${esc(t.name)} ${sn}번째 완료">${CHECK_SVG}</button>
      </div>`;
    });
    html += `</div></div>`;
  });
  html += `</div>`;
  $("#groups").innerHTML = html;
}

function renderHud() {
  const a = earnedList(ME, "main").length, b = earnedList(ME, "massage").length;
  $("#meChip").innerHTML = `${esc(ME)} <b>★ ${a}</b><i>♥ ${b}</i>`;
}

function renderModeBadges() {
  const demo = Store.mode === "demo";
  const el = $("#modeStart");
  el.classList.toggle("err", !!Store.error);
  el.textContent = !demo ? "Firebase 실시간 연동 중"
    : Store.error ? `Firebase 연결 실패: ${Store.error} · 지금은 데모 모드예요`
    : "데모 모드 · 이 기기 브라우저에만 저장돼요 (app.js에 Realtime Database 주소를 넣으면 실시간 공유)";
}

function renderAll() {
  renderTabs();
  renderTree("main");
  renderTree("massage");
  renderGroups();
  renderHud();
  popKeys = new Set();
}

/* =========================================================
   스티커 지급 감지
   ========================================================= */
function onDataChange(d) {
  DATA = d || {};
  const now = stickerSet();
  if (prevDone && ready) {
    [...now].filter(k => !prevDone.has(k)).forEach(k => {
      const [w, tid] = k.split(":");
      const t = TASKS.find(x => x.id === tid);
      if (taskOwner(+w, t) !== ME) return;          // 내 스티커만 알림
      popKeys.add(k);
      const kind = treeOfTask(t);
      toast(`${TREES[kind].title}에 스티커! · ${t.name}`);
      const n = earnedList(ME, kind).length;
      if (n > 0 && n % TREES[kind].size === 0) setTimeout(() => toast(`${TREES[kind].title}가 완성됐어요! 수고했어요`), 1400);
    });
  }
  prevDone = now;
  if (ready) renderAll();
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

/* =========================================================
   로그인 / 이벤트
   ========================================================= */
function login(name) {
  name = (name || "").trim().replace(/\s+/g, "").slice(0, 12);
  if (!name) return;
  const err = $("#loginErr");
  if (!PEOPLE.includes(name)) {
    err.textContent = `'${name}' 이름이 명단에 없어요. 이름을 정확히 입력해 주세요.`;
    err.hidden = false;
    return;
  }
  err.hidden = true;
  ME = name;
  try { localStorage.setItem(LS_ME, ME); } catch (e) {}
  Store.set(`players/${keyOf(ME)}`, { name: ME, lastSeen: Date.now() });
  WEEK = pickCurrentWeek();
  scrollTabs = true;
  $("#start").hidden = true;
  $("#game").hidden = false;
  ready = true;
  renderAll();
  window.scrollTo(0, 0);
  toast(`${ME}님, 인내의 숲에 오신 걸 환영해요!`);
}

function logout() {
  try { localStorage.removeItem(LS_ME); } catch (e) {}
  ME = ""; ready = false;
  $("#game").hidden = true;
  $("#start").hidden = false;
  $("#nameInput").value = "";
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", e => { e.preventDefault(); login($("#nameInput").value); });
  $("#logoutBtn").addEventListener("click", logout);

  $("#weekTabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-week]");
    if (!b) return;
    WEEK = +b.dataset.week;
    renderAll();
  });
  $("#todayBtn").addEventListener("click", () => { WEEK = pickCurrentWeek(); scrollTabs = true; renderAll(); });

  const groups = $("#groups");
  groups.addEventListener("click", e => {
    const chk = e.target.closest(".chk");
    if (chk) {
      const { t, n } = chk.dataset;
      const cur = !!slotOf(rowOf(WEEK, t), n).done;
      const base = `weeks/w${WEEK}/rows/${t}/s${n}`;
      chk.setAttribute("aria-pressed", String(!cur));   // 누르자마자 바로 보이게
      Store.update({
        [`${base}/done`]: cur ? null : true,
        [`${base}/by`]: cur ? null : ME,
        [`${base}/at`]: cur ? null : Date.now()
      }).catch(err => {
        chk.setAttribute("aria-pressed", String(cur));
        toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
        console.error(err);
      });
      return;
    }
    const clr = e.target.closest(".slot-clear");
    if (clr) {
      e.stopPropagation();
      Store.set(`weeks/w${WEEK}/rows/${clr.dataset.t}/s${clr.dataset.n}/dt`, null);
      return;
    }
    const dt = e.target.closest(".slot-dt");
    if (dt && dt.showPicker) { try { dt.showPicker(); } catch (err) {} }
  });
  groups.addEventListener("change", e => {
    const el = e.target;
    if (el.classList.contains("slot-dt")) {
      Store.set(`weeks/w${WEEK}/rows/${el.dataset.t}/s${el.dataset.n}/dt`, el.value || null);
    }
  });
}

/* =========================================================
   시작
   ========================================================= */
(async function boot() {
  bindEvents();
  Store.onData(onDataChange);
  Store.onConn(c => {
    const el = $("#syncBadge");
    if (Store.mode === "demo") {
      el.className = "sync" + (Store.error ? " off" : "");
      el.textContent = Store.error ? "연결 실패 · 데모 모드" : "데모 모드";
      el.title = Store.error || "";
      return;
    }
    el.className = "sync " + (c ? "on" : "off");
    el.textContent = c ? "실시간 연결" : "연결 끊김";
  });
  await Store.init();
  renderModeBadges();
  let saved = "";
  try { saved = localStorage.getItem(LS_ME) || ""; } catch (e) {}
  if (saved && PEOPLE.includes(saved)) {
    const wait = () => (DATA.meta ? login(saved) : setTimeout(wait, 50));
    wait();
  }
})();
