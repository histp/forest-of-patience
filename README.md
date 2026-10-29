# 인내의 숲 — 설정 가이드

이름만 입력해서 들어가는 실시간 스케줄 게임입니다.
일정(1·2·3)을 적고 체크해서 한 줄을 다 채우면, 그 주차 나무에 담당자 색깔 스티커가 자동으로 붙습니다.
22개가 모두 붙으면 나무 꼭대기에 별이 뜹니다.

## 파일 구성

| 파일 | 내용 |
|---|---|
| `index.html` | 화면 구조 (스타트 화면, 게임 화면) |
| `style.css` | 디자인 (라이트/다크 모드 자동) |
| `app.js` | 로직 + Firebase 연동. 맨 위 `FIREBASE_CONFIG`만 채우면 됨 |
| `database.rules.json` | Realtime Database 보안 규칙 |

설정값을 비워 두면 **데모 모드**로 동작합니다(그 기기 브라우저에만 저장, 같은 브라우저의 탭끼리는 실시간 반영).

## 1. Firebase 프로젝트 만들기 (5분)

1. https://console.firebase.google.com 접속 → **프로젝트 추가** → 이름 예: `forest-of-patience`
2. 왼쪽 메뉴 **빌드 → Realtime Database** → **데이터베이스 만들기**
   - 위치: **싱가포르(asia-southeast1)** 추천 (한국에서 가장 빠름)
   - 보안 규칙: **잠금 모드**로 시작 (아래 3번에서 바꿉니다)
3. 프로젝트 개요 옆 톱니바퀴 → **프로젝트 설정** → 아래쪽 **내 앱 → 웹(</>)** 클릭 → 앱 등록
4. 화면에 나오는 `firebaseConfig = { ... }` 값을 복사

## 2. app.js에 붙여넣기

`app.js` 맨 위를 이렇게 채웁니다.

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "forest-of-patience.firebaseapp.com",
  databaseURL: "https://forest-of-patience-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "forest-of-patience",
  storageBucket: "forest-of-patience.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

`databaseURL`이 config에 없으면 Realtime Database 화면 상단의 주소(https://…firebasedatabase.app)를 그대로 넣어주세요.

## 3. 보안 규칙 넣기

Realtime Database → **규칙** 탭에 `database.rules.json` 내용을 붙여넣고 **게시**.

```json
{ "rules": { "forest": { ".read": true, ".write": true } } }
```

> 이름만으로 로그인하는 방식이라 비밀번호가 없습니다. 주소를 아는 사람은 누구나 체크할 수 있으니, 링크는 참여자끼리만 공유하세요. 나중에 더 막고 싶으면 Firebase 익명 인증을 붙이는 방법이 있습니다.

처음 접속하는 사람이 있으면 노션 '인내의숲 11월' 1주차 내용(일정·체크)이 자동으로 들어가고, 2~5주차는 담당자만 채워진 빈 표로 시작합니다.

## 4. 인터넷에 올리기 (택1)

**A. Firebase Hosting** (같은 프로젝트에서 바로)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public 폴더: . (현재 폴더), SPA: No
firebase deploy
```
→ `https://프로젝트명.web.app` 주소가 생깁니다.

**B. Netlify Drop** (가장 쉬움)
https://app.netlify.com/drop 에 이 폴더를 통째로 끌어다 놓기.

**C. 내 컴퓨터에서 테스트**
`index.html`을 더블클릭해서 열어도 동작합니다.

## 바꾸고 싶을 때

- **항목(청소 목록)**: `app.js`의 `TASKS` 배열 수정. `g`는 색깔 그룹(red/orange/yellow/green/blue/purple).
- **담당자 이름**: 앱 화면에서 그룹 이름 칸을 눌러 바로 수정(주차별로 따로 저장).
- **주차 날짜**: `app.js`의 `WEEKS` 배열.
- **처음부터 다시**: Firebase 콘솔에서 `forest` 노드를 삭제하면 다음 접속 때 초기 데이터로 다시 채워집니다.

## 데이터 구조

```
forest/
  meta/                       초기화 여부
  players/{이름}              접속한 사람 기록
  weeks/w1/groups/{색}        그 주 담당자 이름
  weeks/w1/rows/{항목}/s1     { dt: "2026-10-26T13:40", done: true, by: "체크한 사람" }
```
