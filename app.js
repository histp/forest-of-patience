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

// n = 전체 주차 번호(로테이션 기준, 데이터 저장 키 w1~w10), k = 그 달의 몇 주차
// 12월은 11월 5주차 다음 순서를 그대로 이어서 돕니다.
const WEEKS = [
  { n: 1,  m: "11월", k: 1, range: "10/26 – 11/1",  start: "2026-10-26" },
  { n: 2,  m: "11월", k: 2, range: "11/2 – 11/8",   start: "2026-11-02" },
  { n: 3,  m: "11월", k: 3, range: "11/9 – 11/15",  start: "2026-11-09" },
  { n: 4,  m: "11월", k: 4, range: "11/16 – 11/22", start: "2026-11-16" },
  { n: 5,  m: "11월", k: 5, range: "11/23 – 11/29", start: "2026-11-23" },
  { n: 6,  m: "12월", k: 1, range: "11/30 – 12/6",  start: "2026-11-30" },
  { n: 7,  m: "12월", k: 2, range: "12/7 – 12/13",  start: "2026-12-07" },
  { n: 8,  m: "12월", k: 3, range: "12/14 – 12/20", start: "2026-12-14" },
  { n: 9,  m: "12월", k: 4, range: "12/21 – 12/27", start: "2026-12-21" },
  { n: 10, m: "12월", k: 5, range: "12/28 – 1/3",   start: "2026-12-28" }
];
const MONTHS = [...new Set(WEEKS.map(w => w.m))];

// 1주차는 노션에 이미 적혀 있던 일정·체크를 그대로 옮겨 둡니다. [시간, 완료여부]
const SEED_W1 = {
  t01: [["2026-10-26T13:40", 0], ["2026-10-28T13:40", 0], ["2026-10-30T13:40", 0]],
  t02: [["2026-10-28T13:40", 0], ["2026-10-28T13:40", 0], ["2026-10-30T13:40", 0]],
  t03: [["2026-10-30T13:40", 0], ["2026-10-28T13:40", 0], ["2026-10-30T13:40", 0]],
  t04: [["2026-10-26T21:00", 0]],
  t12: [["2026-10-26T13:45", 0], ["2026-10-28T13:45", 0], ["2026-10-30T13:45", 0]],
  t13: [["2026-10-26T13:45", 0], ["2026-10-28T13:45", 0], ["2026-10-30T13:45", 0]],
  t14: [["2026-10-26T13:45", 0], ["2026-10-28T13:45", 0], ["2026-10-30T13:45", 0]],
  t15: [["2026-10-29T19:30", 0]],
  t16: [[null, 1]],
  t17: [[null, 1]],
  t19: [["2026-10-26T11:10", 1], ["2026-10-28T13:30", 1], ["2026-10-30T13:30", 0]],
  t20: [["2026-10-26T13:30", 1], ["2026-10-28T13:30", 1], ["2026-10-30T13:30", 0]],
  t21: [["2026-10-26T13:30", 0], ["2026-10-28T13:30", 0], ["2026-10-30T13:30", 0]],
  t22: [["2026-10-29T17:30", 0]]
};

function buildSeed() {
  const rows = {};
  Object.entries(SEED_W1).forEach(([tid, slots]) => {
    rows[tid] = {};
    slots.forEach(([dt, done], i) => {
      const s = {};
      if (dt) s.dt = dt;
      if (done) s.done = true;
      if (Object.keys(s).length) rows[tid]["s" + (i + 1)] = s;
    });
  });
  return { meta: { seededAt: Date.now(), version: 2 }, weeks: { w1: { rows } } };
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
let MONTH = WEEKS.find(w => w.n === WEEK).m;
let ready = false;
let prevDone = null;     // 직전 스티커 상태 (새로 붙은 스티커 감지용)
let popKeys = new Set();

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const keyOf = name => name.trim().replace(/[.#$\[\]\/]/g, "_");
const mod = (a, n) => ((a % n) + n) % n;

function pickCurrentWeek() {
  const now = new Date();
  for (let i = WEEKS.length - 1; i >= 0; i--) {
    if (now >= new Date(WEEKS[i].start + "T00:00:00")) return WEEKS[i].n;
  }
  return 1;
}

/* 로테이션: w주차에 그룹 gi를 맡는 사람 / 사람 p가 맡는 그룹 */
const assigneeOf = (w, gi) => PEOPLE[mod(gi + (w - 1), PEOPLE.length)];
const groupIndexOf = (w, name) => {
  const p = PEOPLE.indexOf(name);
  return p < 0 ? -1 : mod(p - (w - 1), GROUPS.length);
};
const groupIdx = gid => GROUPS.findIndex(g => g.id === gid);
const taskOwner = (w, t) => assigneeOf(w, groupIdx(t.g));
const tasksOfGroup = gi => TASKS.filter(t => t.g === GROUPS[gi].id);
const tasksOf = (w, name) => { const gi = groupIndexOf(w, name); return gi < 0 ? [] : tasksOfGroup(gi); };

const weekData = w => (DATA.weeks && DATA.weeks["w" + w]) || {};
const rowOf = (w, t) => (weekData(w).rows || {})[t] || {};
const slotOf = (row, n) => row["s" + n] || {};
const slotCount = t => t.once ? 1 : 3;
const slotNums = t => t.once ? [1] : [1, 2, 3];
const doneCount = (w, t) => slotNums(t).filter(n => slotOf(rowOf(w, t.id), n).done).length;
const isDone = (w, t) => doneCount(w, t) === slotCount(t);

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
function fmtDT(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return v;
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h < 12 ? "오전" : "오후"; h = h % 12 || 12;
  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS[d.getDay()]}) ${ap} ${h}:${m}`;
}

function stickerSet() {
  const s = new Set();
  WEEKS.forEach(w => TASKS.forEach(t => { if (isDone(w.n, t)) s.add(`${w.n}:${t.id}`); }));
  return s;
}
const monthWeeks = (m = MONTH) => WEEKS.filter(w => w.m === m);
const monthOf = n => WEEKS.find(w => w.n === n).m;
function personStats(name, weeks = WEEKS) {
  let done = 0, total = 0;
  weeks.forEach(w => tasksOf(w.n, name).forEach(t => { total++; if (isDone(w.n, t)) done++; }));
  return { done, total };
}

/* =========================================================
   렌더링
   ========================================================= */

function renderTabs() {
  $("#monthTabs").innerHTML = MONTHS.map(m =>
    `<button type="button" data-month="${m}" aria-pressed="${m === MONTH}">${m}</button>`).join("");
  $("#weekTabs").innerHTML = monthWeeks().map(w => {
    const mine = tasksOf(w.n, ME);
    const sub = mine.length
      ? `내 스티커 ${mine.filter(t => isDone(w.n, t)).length}/${mine.length}`
      : `${TASKS.filter(t => isDone(w.n, t)).length}/${TASKS.length}`;
    return `<button type="button" role="tab" aria-selected="${w.n === WEEK}" data-week="${w.n}">
      <b>${w.k}주차</b><small>${w.range} · ${sub}</small></button>`;
  }).join("");
}

/* ---------- 나만의 나무 ----------
   아래에서 위로 자라는 나무: 맨 아래 줄 = 1주차, 맨 위 줄 = 5주차.
   한 줄에 그 주에 맡은 항목 수만큼 스티커 자리가 생깁니다.            */
const TREE_ROWS = [ // [y, 줄 너비]
  [254, 170], [208, 238], [162, 268], [116, 228], [70, 150]
];


function renderTree() {
  const who = ME;
  const C = 2 * Math.PI * 16;
  let slots = "", filled = 0, total = 0;

  monthWeeks().forEach((w, wi) => {
    const [y] = TREE_ROWS[wi];
    const ts = tasksOf(w.n, who);
    ts.forEach((t, i) => {
      total++;
      const x = 200 + (i - (ts.length - 1) / 2) * 52;
      const g = GROUPS[groupIdx(t.g)];
      const k = doneCount(w.n, t), n = slotCount(t);
      const key = `${w.n}:${t.id}`;
      let inner;
      if (k === n) {
        filled++;
        inner = `<circle r="18" fill="${g.color}"/>
          <circle r="18" class="stk-ring" opacity=".5"/>
          <ellipse cx="-6" cy="-7" rx="6" ry="4" class="stk-shine"/>
          <path d="M1 -17 C4 -27 13 -28 17 -24 C12 -19 6 -16 1 -17 Z" class="stk-leaf"/>`;
      } else {
        inner = `<circle r="16" class="slot-empty"/>` +
          (k ? `<circle r="16" class="slot-prog" stroke="${g.color}" stroke-dasharray="${(C * k / n).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90)"/>` : "");
      }
      slots += `<g transform="translate(${x.toFixed(1)} ${y})">
        <title>${esc(t.name)} · ${k}/${n}</title>
        <g class="slot-in${popKeys.has(key) ? " pop" : ""}">${inner}</g></g>`;
    });
  });

  const allDone = total > 0 && filled === total;
  const star = allDone ? `<polygon class="tree-star" points="${starPoints(200, 26, 20, 9)}"/>` : "";

  $("#treeSvg").innerHTML = `
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
    <circle cx="200" cy="68" r="66" class="t-canopy"/>
    ${slots}${star}`;

  $("#treeTitle").textContent = `나의 ${MONTH} 나무`;
  $("#treeCount").innerHTML = allDone ? `<b>완성!</b> ${filled}/${total}` : `<b>${filled}</b>/${total} 스티커`;
  $("#treeSvg").setAttribute("aria-label", `${who}의 나무 스티커판, ${total}칸 중 ${filled}개 붙음`);
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
  const myGi = groupIndexOf(WEEK, ME);
  const list = myGi < 0 ? [] : [myGi];   // 내 항목만

  let html = "";
  list.forEach(gi => {
    const g = GROUPS[gi];
    const ts = tasksOfGroup(gi);
    const name = assigneeOf(WEEK, gi);
    const gd = ts.filter(t => isDone(WEEK, t)).length;
    html += `<div class="group" style="--gc:${g.color}">
      <div class="group-head">
        <span class="gname">${esc(name)}</span>
        ${name === ME ? `<span class="tag-me">나</span>` : ""}
        <span class="gprog">스티커 ${gd}/${ts.length}</span>
      </div>`;
    ts.forEach(t => {
      const row = rowOf(WEEK, t.id);
      const k = doneCount(WEEK, t), n = slotCount(t);
      html += `<div class="row${k === n ? " done" : ""}">
        <div class="row-title"><span>${esc(t.name)}</span><em class="badge">${k === n ? "스티커 받음" : `${k}/${n}`}</em></div>
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
  });
  $("#groups").innerHTML = html;
}


function renderHud() {
  const { done } = personStats(ME);
  $("#meChip").innerHTML = `${esc(ME)} <b>★ ${done}</b>`;
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
  renderTree();
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
      const who = taskOwner(+w, t);
      const m = monthOf(+w);
      if (who !== ME) return;                       // 내 스티커만 알림
      if (m === MONTH) popKeys.add(k);
      toast(`내 ${m} 나무에 스티커! · ${t.name}`);
      const s = personStats(who, monthWeeks(m));
      if (s.done === s.total) setTimeout(() => toast(`${m} 나무가 완성됐어요! 수고했어요`), 1400);
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

  $("#monthTabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-month]");
    if (!b || b.dataset.month === MONTH) return;
    MONTH = b.dataset.month;
    const cur = pickCurrentWeek();
    WEEK = monthOf(cur) === MONTH ? cur : monthWeeks()[0].n;
    renderAll();
  });

  const groups = $("#groups");
  groups.addEventListener("click", e => {
    const chk = e.target.closest(".chk");
    if (chk) {
      const { t, n } = chk.dataset;
      const cur = !!slotOf(rowOf(WEEK, t), n).done;
      const base = `weeks/w${WEEK}/rows/${t}/s${n}`;
      Store.update({ [`${base}/done`]: cur ? null : true, [`${base}/by`]: cur ? null : ME });
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
  if (saved) {
    const wait = () => (DATA.meta ? login(saved) : setTimeout(wait, 50));
    wait();
  }
})();
