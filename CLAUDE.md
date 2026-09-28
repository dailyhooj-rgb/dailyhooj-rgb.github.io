# My Blog

마크다운 파일을 읽어서 정적 블로그 웹사이트로 변환하는 프로젝트.

## 구조
- `posts/*.md` — 블로그 글 (맨 위에 frontmatter: title, date, description, tags)
- `templates/` — HTML 틀 (layout, 글 목록, 글 상세)
- `public/` — 그대로 복사되는 CSS/JS
- `scripts/build.js` — posts → dist 변환
- `scripts/dev.js` — dist를 localhost:3000에서 미리보기
- `dist/` — 빌드 결과물 (직접 수정 금지, git에 올리지 않음)

## 명령어
- `npm run build` — 사이트 생성
- `npm run dev` — 빌드 후 http://localhost:3000 에서 미리보기

## 규칙
- 프레임워크 없이 HTML, CSS, JavaScript만 사용 (마크다운 변환은 `marked` 사용)
- 디자인은 깔끔하고 읽기 좋게, 다크 모드 지원, 모바일 대응
- 새 글 파일명은 `YYYY-MM-DD-slug.md` 형식
- `date`가 오늘보다 미래인 글은 빌드에서 제외(예약 발행)

## 네이버 블로그 원고 (naver/)
- 글을 쓰기 전에 반드시 `naver/PROMPT.md` 와 `naver/learnings.md` 를 읽고 그대로 따른다
- 원고는 `naver/drafts/YYYY-MM-DD-주제/` 에 `post.md`, `images.json`, `images/`, `sources.md`, `붙여넣기.txt` 로 저장
- 글 유형: CPA형 / 홈피드형 / 정보형 (템플릿은 PROMPT.md), 키워드 창고는 `naver/keywords.md`
- 사실·숫자는 웹 검색으로 확인하고 `sources.md` 에 출처를 남긴다 (사실과 다른 요청은 고쳐 쓰고 memo 에 기록)
- `saved: true` = 네이버 임시저장 완료 (책의 draft 체크와 같은 역할)
- 이미지: `node scripts/make-images.js <폴더>`, 붙여넣기 텍스트: `node scripts/naver-text.js <폴더>`
- naver/ 는 블로그 사이트 빌드(`npm run build`)와 무관하다
