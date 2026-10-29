/* =========================================================
   인내의 숲 — Firebase 실시간 스케줄 + 나무 스티커판
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
const LS_DATA = "forest.demo.v1";    // 데모 모드 저장 키
const LS_ME = "forest.me";

/* ---------- 노션 '인내의숲 11월'에서 가져온 구성 ---------- */
const GROUPS = [
  { id: "red",    color: "#E5534B" },
  { id: "orange", color: "#F08A24" },
  { id: "yellow", color: "#E3AE00" },
  { id: "green",  color: "#3FA34D" },
  { id: "blue",   color: "#3B82D6" },
  { id: "purple", color: "#8E5BD6" }
];
const DEFAULT_NAMES = { red: "안지우", orange: "정기주", yellow: "이지민", green: "안서우", blue: "정기언", purple: "이지윤" };

const TASKS = [
  { id: "t01", g: "red",    name: "엘리베이터 청소" },
  { id: "t02", g: "red",    name: "101호 화장실 청소" },
  { id: "t03", g: "red",    name: "101호 분리수거 (버리기)" },
  { id: "t04", g: "red",    name: "마사지 섬김 (아영쌤)" },
  { id: "t05", g: "orange", name: "풀뽑기/눈치우기" },
  { id: "t06", g: "orange", name: "재활용 분리수거" },
  { id: "t07", g: "orange", name: "마사지 섬김 (실장님)" },
  { id: "t08", g: "yellow", name: "주차장 청소" },
  { id: "t09", g: "yellow", name: "계단 청소" },
  { id: "t10", g: "yellow", name: "홈트 준비 및 뒷정리" },
  { id: "t11", g: "yellow", name: "마사지 섬김 (디렉터님)" },
  { id: "t12", g: "green",  name: "106호 분리수거" },
  { id: "t13", g: "green",  name: "101호 신발장 책가방 로봇청소기" },
  { id: "t14", g: "green",  name: "104호 1층 청소기" },
  { id: "t15", g: "green",  name: "마사지 섬김 (코치님)" },
  { id: "t16", g: "blue",   name: "106호 화장실 청소" },
  { id: "t17", g: "blue",   name: "104호 분리수거" },
  { id: "t18", g: "blue",   name: "마사지 섬김 (온유쌤)" },
  { id: "t19", g: "purple", name: "101호 분리수거 (닦기)" },
  { id: "t20", g: "purple", name: "104호 화장실 청소" },
  { id: "t21", g: "purple", name: "재활용 분리수거 (닦기)" },
  { id: "t22", g: "purple", name: "마사지 섬김 (제인집사님)" }
];

const WEEKS = [
  { n: 1, range: "10/26 – 11/1",  start: "2026-10-26" },
  { n: 2, range: "11/2 – 11/8",   start: "2026-11-02" },
  { n: 3, range: "11/9 – 11/15",  start: "2026-11-09" },
  { n: 4, range: "11/16 – 11/22", start: "2026-11-16" },
  { n: 5, range: "11/23 – 11/29", start: "2026-11-23" }
];

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
  const weeks = {};
  WEEKS.forEach(w => { weeks["w" + w.n] = { groups: { ...DEFAULT_NAMES } }; });
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
  weeks.w1.rows = rows;
  return { meta: { seededAt: Date.now(), version: 1 }, weeks };
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
let FILTER = "mine";
let ready = false;
let prevDone = null;     // 직전 스티커 상태 (새로 붙은 스티커 감지용)
let popKeys = new Set();

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const keyOf = name => name.trim().replace(/[.#$\[\]\/]/g, "_");
const groupOf = id => GROUPS.find(g => g.id === id);

function pickCurrentWeek() {
  const now = new Date();
  for (let i = WEEKS.length - 1; i >= 0; i--) {
    if (now >= new Date(WEEKS[i].start + "T00:00:00")) return WEEKS[i].n;
  }
  return 1;
}
const weekData = w => (DATA.weeks && DATA.weeks["w" + w]) || {};
const groupName = (w, g) => (weekData(w).groups || {})[g] || "";
const rowOf = (w, t) => (weekData(w).rows || {})[t] || {};
const slotOf = (row, n) => row["s" + n] || {};
const doneCount = row => [1, 2, 3].filter(n => slotOf(row, n).done).length;
const isRowDone = row => doneCount(row) === 3;

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
  WEEKS.forEach(w => TASKS.forEach(t => { if (isRowDone(rowOf(w.n, t.id))) s.add(`${w.n}:${t.id}`); }));
  return s;
}
function myStickerTotal() {
  let c = 0;
  WEEKS.forEach(w => TASKS.forEach(t => {
    if (groupName(w.n, t.g) === ME && isRowDone(rowOf(w.n, t.id))) c++;
  }));
  return c;
}

/* =========================================================
   렌더링
   ========================================================= */
function renderQuickNames() {
  const box = $("#quickNames");
  const names = [];
  GROUPS.forEach(g => {
    const n = groupName(WEEK, g.id);
    if (n && !names.find(x => x.n === n)) names.push({ n, c: g.color });
  });
  Object.values(DATA.players || {}).forEach(p => {
    if (p && p.name && !names.find(x => x.n === p.name)) names.push({ n: p.name, c: "var(--muted)" });
  });
  box.innerHTML = names.map(x => `<button type="button" data-name="${esc(x.n)}"><i style="background:${x.c}"></i>${esc(x.n)}</button>`).join("");
}

function renderTabs() {
  $("#weekTabs").innerHTML = WEEKS.map(w => {
    const done = TASKS.filter(t => isRowDone(rowOf(w.n, t.id))).length;
    return `<button type="button" role="tab" aria-selected="${w.n === WEEK}" data-week="${w.n}">
      <b>${w.n}주차</b><small>${w.range} · ${done}/${TASKS.length}</small></button>`;
  }).join("");
}

// 나무 위 스티커 자리 22개
function slotPositions() {
  const rows = [[60, 3, 100], [110, 5, 212], [160, 6, 264], [210, 5, 222], [256, 3, 124]];
  const pts = [];
  rows.forEach(([y, count, width]) => {
    for (let i = 0; i < count; i++) pts.push([200 - width / 2 + (count > 1 ? i * width / (count - 1) : width / 2), y]);
  });
  return pts;
}

function renderTree() {
  const pos = slotPositions();
  const C = 2 * Math.PI * 16;
  let filled = 0;
  let slots = "";
  TASKS.forEach((t, i) => {
    const [x, y] = pos[i];
    const g = groupOf(t.g);
    const row = rowOf(WEEK, t.id);
    const k = doneCount(row);
    const who = groupName(WEEK, t.g);
    const mine = who && who === ME;
    const key = `${WEEK}:${t.id}`;
    let inner;
    if (k === 3) {
      filled++;
      inner = `<circle r="18" fill="${g.color}"/>
        <circle r="18" class="stk-ring" opacity=".5"/>
        <ellipse cx="-6" cy="-7" rx="6" ry="4" class="stk-shine"/>
        <path d="M1 -17 C4 -27 13 -28 17 -24 C12 -19 6 -16 1 -17 Z" class="stk-leaf"/>`;
    } else {
      inner = `<circle r="16" class="slot-empty"/>` +
        (k ? `<circle r="16" class="slot-prog" stroke="${g.color}" stroke-dasharray="${(C * k / 3).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90)"/>` : "");
    }
    slots += `<g class="slot-g${mine ? " mine" : ""}" transform="translate(${x.toFixed(1)} ${y})">
      <title>${esc(t.name)} · ${esc(who || "담당자 없음")} · ${k}/3</title>
      <g class="slot-in${popKeys.has(key) ? " pop" : ""}">${inner}</g></g>`;
  });

  const allDone = filled === TASKS.length;
  const star = allDone ? `<polygon class="tree-star" points="${starPoints(200, 28, 20, 9)}"/>` : "";

  $("#treeSvg").innerHTML = `
    <ellipse cx="200" cy="424" rx="170" ry="13" class="t-ground"/>
    <path d="M178 424 C184 370 182 330 172 292 L228 292 C218 330 216 370 222 424 Z" class="t-trunk"/>
    <path d="M190 312 C170 296 150 282 128 262" class="t-branch"/>
    <path d="M210 312 C232 294 252 280 274 258" class="t-branch"/>
    <circle cx="115" cy="195" r="82" class="t-canopy2"/>
    <circle cx="285" cy="195" r="82" class="t-canopy2"/>
    <circle cx="200" cy="245" r="78" class="t-canopy2"/>
    <circle cx="200" cy="165" r="124" class="t-canopy"/>
    <circle cx="148" cy="100" r="78" class="t-canopy"/>
    <circle cx="252" cy="100" r="78" class="t-canopy"/>
    <circle cx="200" cy="70" r="66" class="t-canopy"/>
    ${slots}${star}`;

  const wk = WEEKS.find(w => w.n === WEEK);
  $("#treeTitle").textContent = `${WEEK}주차 나무`;
  $("#treeCount").innerHTML = allDone ? `<b>완성!</b> ${filled}/${TASKS.length}` : `<b>${filled}</b>/${TASKS.length} 스티커`;
  $("#treeSvg").setAttribute("aria-label", `${WEEK}주차(${wk.range}) 나무 스티커판, ${filled}개 붙음`);

  $("#legend").innerHTML = GROUPS.map(g => {
    const ts = TASKS.filter(t => t.g === g.id);
    const d = ts.filter(t => isRowDone(rowOf(WEEK, t.id))).length;
    const n = groupName(WEEK, g.id);
    return `<li class="${n && n === ME ? "me" : ""}"><i style="background:${g.color}"></i>
      <span>${esc(n || "담당자 없음")}</span><em>${d}/${ts.length}</em></li>`;
  }).join("");
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
  const box = $("#groups");
  const hasMine = GROUPS.some(g => groupName(WEEK, g.id) === ME);
  const list = GROUPS.filter(g => FILTER === "all" || !hasMine || groupName(WEEK, g.id) === ME);
  $("#fMine").setAttribute("aria-pressed", FILTER === "mine");
  $("#fAll").setAttribute("aria-pressed", FILTER === "all");

  let html = "";
  if (FILTER === "mine" && !hasMine) {
    html += `<p class="empty-note">${WEEK}주차에 '${esc(ME)}' 이름으로 배정된 항목이 없어서 전체를 보여드려요.<br>담당자 칸에 내 이름을 적으면 내 것만 볼 수 있어요.</p>`;
  }
  list.forEach(g => {
    const ts = TASKS.filter(t => t.g === g.id);
    const name = groupName(WEEK, g.id);
    const gd = ts.filter(t => isRowDone(rowOf(WEEK, t.id))).length;
    html += `<div class="group" style="--gc:${g.color}">
      <div class="group-head">
        <label class="sr-only" for="gname-${g.id}">담당자 이름</label>
        <input class="gname" id="gname-${g.id}" data-g="${g.id}" value="${esc(name)}" placeholder="담당자 이름" maxlength="12">
        ${name && name === ME ? `<span class="tag-me">나</span>` : ""}
        <span class="gprog">스티커 ${gd}/${ts.length}</span>
      </div>`;
    ts.forEach(t => {
      const row = rowOf(WEEK, t.id);
      const k = doneCount(row);
      html += `<div class="row${k === 3 ? " done" : ""}">
        <div class="row-title"><span>${esc(t.name)}</span><em class="badge">${k === 3 ? "스티커 받음" : k + "/3"}</em></div>
        <div class="slots">`;
      [1, 2, 3].forEach(n => {
        const s = slotOf(row, n);
        const id = `dt-${t.id}-${n}`;
        html += `<div class="slot">
          <span class="slot-n">${n}</span>
          <div class="slot-face${s.dt ? " has" : ""}">
            ${s.dt ? `<span>${esc(fmtDT(s.dt))}</span>` : `<span class="ph">날짜·시간</span>`}
            <input type="datetime-local" id="${id}" class="slot-dt" data-t="${t.id}" data-n="${n}" value="${esc(s.dt || "")}" aria-label="${esc(t.name)} ${n}번째 일정">
            ${s.dt ? `<button type="button" class="slot-clear" data-t="${t.id}" data-n="${n}" aria-label="일정 지우기">×</button>` : ""}
          </div>
          <button type="button" class="chk" id="chk-${t.id}-${n}" data-t="${t.id}" data-n="${n}" aria-pressed="${!!s.done}" aria-label="${esc(t.name)} ${n}번째 완료">${CHECK_SVG}</button>
        </div>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;
  });
  box.innerHTML = html;
}

function renderForest() {
  const people = [];
  WEEKS.forEach(w => GROUPS.forEach(g => {
    const n = groupName(w.n, g.id);
    if (n && !people.find(p => p.name === n)) people.push({ name: n, color: g.color });
  }));
  let total = 0;
  const rows = people.map(p => {
    let sum = 0;
    const cells = WEEKS.map(w => {
      const items = [];
      GROUPS.forEach(g => {
        if (groupName(w.n, g.id) !== p.name) return;
        TASKS.filter(t => t.g === g.id).forEach(t => items.push({ done: isRowDone(rowOf(w.n, t.id)), c: g.color }));
      });
      if (!items.length) return `<td><span class="dots"><small>–</small></span></td>`;
      const d = items.filter(x => x.done).length; sum += d;
      return `<td><span class="dots" title="${d}/${items.length}">${items.map(x =>
        `<i style="${x.done ? `background:${x.c}` : `box-shadow:inset 0 0 0 1.5px var(--line)`}"></i>`).join("")}</span></td>`;
    }).join("");
    total += sum;
    return `<tr class="${p.name === ME ? "me" : ""}"><td class="name"><i style="background:${p.color}"></i>${esc(p.name)}</td>${cells}<td class="total">${sum}</td></tr>`;
  }).join("");
  $("#forestTable").innerHTML = `<thead><tr><th>이름</th>${WEEKS.map(w => `<th>${w.n}주차</th>`).join("")}<th>합계</th></tr></thead><tbody>${rows}</tbody>`;
  $("#forestCount").innerHTML = `숲 전체 <b>${total}</b>/${TASKS.length * WEEKS.length}`;
}

function renderHud() {
  $("#meChip").innerHTML = `${esc(ME)} <b>★ ${myStickerTotal()}</b>`;
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
  // 입력 중이던 칸의 포커스·값 유지
  const a = document.activeElement;
  const keep = a && a.id && a.classList.contains("gname") ? { id: a.id, v: a.value, s: a.selectionStart } : null;

  renderTabs();
  renderTree();
  renderGroups();
  renderForest();
  renderHud();

  if (keep) {
    const el = document.getElementById(keep.id);
    if (el) { el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch (e) {} }
  }
  popKeys = new Set();
}

/* =========================================================
   스티커 지급 감지
   ========================================================= */
function onDataChange(d) {
  DATA = d || {};
  const now = stickerSet();
  if (prevDone && ready) {
    const fresh = [...now].filter(k => !prevDone.has(k));
    fresh.forEach(k => {
      popKeys.add(k);
      const [w, tid] = k.split(":");
      const t = TASKS.find(x => x.id === tid);
      const who = groupName(+w, t.g) || "누군가";
      toast(`${who}님 나무에 스티커! · ${t.name}`);
      if (+w !== WEEK) popKeys.delete(k);
    });
    const wDone = TASKS.every(t => now.has(`${WEEK}:${t.id}`));
    const wWas = TASKS.every(t => prevDone.has(`${WEEK}:${t.id}`));
    if (wDone && !wWas) setTimeout(() => toast(`${WEEK}주차 나무가 완성됐어요! 모두 수고했어요`), 1400);
  }
  prevDone = now;

  if (!$("#start").hidden) renderQuickNames();
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
  name = (name || "").trim().slice(0, 12);
  if (!name) return;
  ME = name;
  try { localStorage.setItem(LS_ME, ME); } catch (e) {}
  Store.set(`players/${keyOf(ME)}`, { name: ME, lastSeen: Date.now() });
  const hasMine = GROUPS.some(g => groupName(WEEK, g.id) === ME);
  FILTER = hasMine ? "mine" : "all";
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
  renderQuickNames();
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", e => { e.preventDefault(); login($("#nameInput").value); });
  $("#quickNames").addEventListener("click", e => {
    const b = e.target.closest("button[data-name]");
    if (b) login(b.dataset.name);
  });
  $("#logoutBtn").addEventListener("click", logout);

  $("#weekTabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-week]");
    if (!b) return;
    WEEK = +b.dataset.week;
    renderAll();
  });

  document.querySelector(".seg").addEventListener("click", e => {
    const b = e.target.closest("button[data-filter]");
    if (!b) return;
    FILTER = b.dataset.filter;
    renderGroups();
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
    } else if (el.classList.contains("gname")) {
      Store.set(`weeks/w${WEEK}/groups/${el.dataset.g}`, el.value.trim() || null);
    }
  });
  groups.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.classList.contains("gname")) e.target.blur();
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
    // 데이터가 처음 도착한 뒤 자동 로그인
    const wait = () => (DATA.weeks ? login(saved) : setTimeout(wait, 50));
    wait();
  }
})();
