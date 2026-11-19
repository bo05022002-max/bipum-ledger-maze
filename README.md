# 비품대장.xlsx 미로 미니게임

엑셀 통합 문서처럼 보이는 정적(Static) 웹 미니게임입니다. 방향키로 셀을 이동해 인계 메모와 비품을 찾고, `보관실` 시트까지 확인한 뒤 `H13`에서 마감합니다. 빌드 과정 없이 `index.html` 하나로 열리는 순수 HTML/CSS/JavaScript입니다.

## 플레이

https://bo05022002-max.github.io/bipum-ledger-maze/

## 조작

- `↑ ↓ ← →` : 셀 이동
- `Enter` : 메모 열기 / 참조 이동(시트 워프) / 다시 작성
- `Esc` 또는 파일명 클릭 : 일반 보기 전환(숨김 — 검수와 시간은 계속 흐릅니다)
- `?day=YYYY-MM-DD` : 같은 날짜는 같은 배치로 시작

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 구조(엑셀 창 UI) |
| `style.css` | 스타일 |
| `app.js` | 화면 렌더링·입력 처리 |
| `engine.mjs` | 게임 규칙(맵, 순찰, 메모, 보상, 결과) |
| `records.mjs` | 서랍 기록(로컬 저장) |

## 기타

- 저장은 브라우저 `localStorage`/`sessionStorage`만 사용하며 서버로 아무것도 보내지 않습니다.
- 결과 복사 시 공유 URL은 접속한 페이지의 주소(`location.origin + location.pathname`)를 그대로 사용합니다.
