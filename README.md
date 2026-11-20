# 비품대장.xlsx 미로 미니게임

엑셀 통합 문서처럼 보이는 정적(Static) 웹 미니게임입니다. 방향키로 셀을 이동해 인계 메모와 비품을 찾고, `보관실` 시트까지 확인한 뒤 `H13`에서 마감합니다. 빌드 과정 없이 `index.html` 하나로 열리는 순수 HTML/CSS/JavaScript입니다.

## 플레이

https://bo05022002-max.github.io/bipum-ledger-maze/

## 조작

- `↑ ↓ ← →` : 셀 이동
- `Enter` : 메모 열기 / 참조 이동(시트 워프) / 다시 작성
- `Esc` 또는 파일명 클릭 : 일반 보기 전환(숨김 — 검수와 시간은 계속 흐릅니다)
- `?day=YYYY-MM-DD` : 같은 날짜는 같은 배치로 시작

## 의견 보내기

화면 오른쪽 위 `💬 의견` 버튼을 누르면 개선 의견·버그 제보 창이 열립니다. 제목, 내용, 회신 받을 이메일(선택)을 적고 `보내기`를 누르면 정적 페이지(서버·계정 없음)에서도 [FormSubmit](https://formsubmit.co) 무료 폼 전달 서비스를 거쳐 `woong6.park@gmail.com`으로 전달됩니다.

- 전송 방식: `https://formsubmit.co/ajax/<토큰>`으로 `fetch` POST(JSON)하고, 돌아온 `{"success":"true"}` 응답을 확인했을 때만 창에 `보냈습니다`를 표시합니다. 20초 안에 확인되지 않거나 실패하면 같은 창의 `메일 앱으로 보내기`(mailto)를 안내합니다.
- 받는 메일 주소는 페이지 소스에 그대로 두지 않습니다. FormSubmit이 발급한 대체 토큰(`formsubmit.co/ajax/<토큰>`)을 전송 주소로 쓰고, 실제 주소는 `app.js`에서 조합해 mailto에만 씁니다.
- 스팸 봇 차단용 숨김 필드(`#fbHoney`)에 값이 있으면 전송하지 않고 조용히 성공 화면만 보여 줍니다. `_captcha=false`, `_subject`, `_template=table`, `페이지`, `환경`(날짜·화면 크기·보기 상태·기기)을 함께 보냅니다.
- `index.html`이 최대 10분 캐시되므로, 배포 후 화면이 그대로면 `?v=` 값을 올려 다시 배포하면 즉시 반영됩니다.

## 검색 노출(SEO)

- `index.html`: `description`, `keywords`, `canonical`, `robots`, Open Graph(`og:*`), Twitter 카드, `application/ld+json`(WebSite·VideoGame), 파비콘(SVG data URI), 화면 읽기용 `h1`과 `<noscript>` 소개 문단
- `robots.txt`: 전체 허용 + 사이트맵 위치
- `sitemap.xml`: 대표 URL 1건(`lastmod` 포함)
- `og.png`: 공유 미리보기 이미지(1200×630)

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 구조(엑셀 창 UI) + SEO 메타 |
| `style.css` | 스타일 |
| `app.js` | 화면 렌더링·입력 처리·의견 폼 전송 |
| `engine.mjs` | 게임 규칙(맵, 순찰, 메모, 보상, 결과) |
| `records.mjs` | 서랍 기록(로컬 저장) |
| `robots.txt`, `sitemap.xml` | 검색 로봇 안내 |
| `og.png` | 공유 미리보기 이미지 |

## 기타

- 저장은 브라우저 `localStorage`/`sessionStorage`만 사용하며 게임 기록은 서버로 보내지 않습니다. 의견 폼으로 보낸 내용만 FormSubmit을 거쳐 메일로 전달됩니다.
- 결과 복사 시 공유 URL은 접속한 페이지의 주소(`location.origin + location.pathname`)를 그대로 사용합니다.
