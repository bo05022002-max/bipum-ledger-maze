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

화면 오른쪽 위 `💬 의견` 버튼을 누르면 개선 의견·버그 제보 창이 열립니다. 제목, 내용, 회신 받을 이메일(선택)을 적고 `보내기`를 누르면 정적 페이지에서도 [FormSubmit](https://formsubmit.co) 무료 폼 전달 서비스를 거쳐 `woong6.park@gmail.com`으로 전달됩니다(서버·계정 없음, AJAX 전송 후 결과를 화면에서 확인). 전송이 막힌 환경에서는 같은 창의 `메일 앱으로 보내기`(mailto) 링크로 보낼 수 있습니다.

- 받는 메일 주소는 페이지 소스에 그대로 두지 않고 `app.js`에서 조합합니다.
- 스팸 봇 차단용 허니팟 필드(`_honey`)와 `_captcha=false`, `_subject`, `_template=table`을 함께 보냅니다.
- 전송 성공 시 `thanks.html` 안내 문구는 AJAX 실패 시의 대체 경로(`_next`)로 쓰입니다.

## 검색 노출(SEO)

- `index.html`: `description`, `keywords`, `canonical`, `robots`, Open Graph(`og:*`), Twitter 카드, `application/ld+json`(WebSite·VideoGame), 파비콘(SVG data URI), 화면 읽기용 `h1`과 `<noscript>` 소개 문단
- `robots.txt`: 전체 허용 + `thanks.html` 제외 + 사이트맵 위치
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
| `thanks.html` | 의견 전송 안내 페이지(AJAX 실패 시 대체 경로) |
| `robots.txt`, `sitemap.xml` | 검색 로봇 안내 |
| `og.png` | 공유 미리보기 이미지 |

## 기타

- 저장은 브라우저 `localStorage`/`sessionStorage`만 사용하며 게임 기록은 서버로 보내지 않습니다. 의견 폼으로 보낸 내용만 FormSubmit을 거쳐 메일로 전달됩니다.
- 결과 복사 시 공유 URL은 접속한 페이지의 주소(`location.origin + location.pathname`)를 그대로 사용합니다.
