// 네이버 원고(post.md)를 네이버 에디터에 바로 붙여넣을 수 있는 일반 텍스트로 바꾼다.
// 마크다운 기호(#, **, - 등)를 없애고, 사진 자리에는 [📷 사진 N: 파일명] 표시를 남긴다.
// 사용법: node scripts/naver-text.js naver/drafts/2026-09-29-주제
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || '');
const src = path.join(dir, 'post.md');
if (!fs.existsSync(src)) {
  console.error(`post.md 가 없습니다: ${src}`);
  process.exit(1);
}

const raw = fs.readFileSync(src, 'utf8');
const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
const front = m ? m[1] : '';
let body = m ? m[2] : raw;

const title = (front.match(/^title:\s*(.+)$/m) || [])[1]?.replace(/^["']|["']$/g, '') || '';
const tagLine = (front.match(/^tags:\s*\[(.*)\]$/m) || [])[1] || '';
const tags = tagLine.split(',').map((t) => t.trim()).filter(Boolean);

let photo = 0;
body = body
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, file) => `[📷 사진 ${++photo}: ${path.basename(file)}${alt ? ` — ${alt}` : ''}]`)
  .replace(/^#{1,6}\s+(.*)$/gm, '\n$1')          // 소제목
  .replace(/\*\*(.+?)\*\*/g, '$1')                 // 굵게
  .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1$2')     // 기울임
  .replace(/`([^`]+)`/g, '$1')                     // 코드
  .replace(/^\s*[-*]\s+/gm, '• ')                  // 글머리표
  .replace(/^>\s?/gm, '')                          // 인용
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')  // 링크
  .replace(/<!--\s*([\s\S]*?)\s*-->/g, '[$1]')    // ✍️ 직접 쓰기 / 📷 직접 사진 자리 표시
  .replace(/^\|?\s*:?-{3,}.*$\n?/gm, '')           // 표 구분선
  .replace(/^\|(.+)\|\s*$/gm, (_, row) => '▪ ' + row.split('|').map((c) => c.trim()).join(' : '))  // 표 → 한 줄
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const out = [
  `제목: ${title}`,
  '',
  body,
  '',
  tags.length ? `태그: ${tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')}` : '',
].join('\n');

fs.writeFileSync(path.join(dir, '붙여넣기.txt'), out.trim() + '\n');
console.log(`붙여넣기.txt 생성 (사진 ${photo}장 자리 표시)`);
