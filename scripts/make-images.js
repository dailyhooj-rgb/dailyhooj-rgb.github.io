// 네이버 원고 폴더의 images.json 을 읽어서 썸네일/카드 이미지(PNG)를 만든다.
// 사용법: node scripts/make-images.js naver/drafts/2026-09-29-주제
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const FONT = path.join(ROOT, 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2');

// 이미지 색상 테마 (images.json 의 "theme" 으로 고른다)
const THEMES = {
  warm:  { bg: '#FFF4EC', accent: '#E8743B', text: '#3A2A20', sub: '#8A6A55', card: '#FFFFFF' },
  green: { bg: '#EEF7F0', accent: '#2F9E62', text: '#1F3326', sub: '#5E7A67', card: '#FFFFFF' },
  blue:  { bg: '#EEF4FF', accent: '#2F6FEB', text: '#1B2740', sub: '#5A6B8C', card: '#FFFFFF' },
  pink:  { bg: '#FFF0F4', accent: '#E0527A', text: '#3D1F2A', sub: '#8C5A69', card: '#FFFFFF' },
};

function findChromium() {
  try {
    return execSync('ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome 2>/dev/null | head -1').toString().trim() || undefined;
  } catch { return undefined; }
}

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(t, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: 'Pretendard'; src: url('file://${FONT}') format('woff2'); font-weight: 100 900; }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1080px; height: 1080px; font-family: 'Pretendard', sans-serif; background: ${t.bg}; color: ${t.text};
           display: flex; flex-direction: column; padding: 96px; word-break: keep-all; }
    .label { display: inline-block; align-self: flex-start; background: ${t.accent}; color: #fff; font-weight: 700;
             font-size: 34px; padding: 12px 28px; border-radius: 999px; }
    h1 { font-size: 92px; line-height: 1.25; font-weight: 800; letter-spacing: -2px; }
    .accent { color: ${t.accent}; }
    .sub { font-size: 40px; color: ${t.sub}; line-height: 1.5; font-weight: 500; }
    .footer { margin-top: auto; font-size: 30px; color: ${t.sub}; font-weight: 600; }
    .card { background: ${t.card}; border-radius: 40px; padding: 64px; box-shadow: 0 12px 40px rgba(0,0,0,.06); }
    h2 { font-size: 60px; font-weight: 800; line-height: 1.3; margin-bottom: 40px; letter-spacing: -1px; }
    ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 26px; margin-bottom: 40px; }
    li { font-size: 40px; line-height: 1.45; display: flex; gap: 24px; font-weight: 500; }
    li .n { flex: none; width: 60px; height: 60px; border-radius: 50%; background: ${t.accent}; color: #fff;
            display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 32px; }
  </style></head><body>${body}</body></html>`;
}

// 제목의 *강조* 부분을 포인트 색으로
const highlight = (s) => esc(s).replace(/\*(.+?)\*/g, '<span class="accent">$1</span>').replace(/\n/g, '<br>');

const TEMPLATES = {
  // 대표 썸네일: 큰 제목 + 부제
  thumbnail: (img, t, blogName) => page(t, `
    ${img.label ? `<div class="label">${esc(img.label)}</div>` : ''}
    <div style="margin-top:auto"><h1>${highlight(img.title)}</h1>
    ${img.subtitle ? `<p class="sub" style="margin-top:40px">${esc(img.subtitle)}</p>` : ''}</div>
    <div class="footer" style="margin-top:72px">${esc(blogName)}</div>`),

  // 요약 카드: 번호 목록 (체크리스트, 핵심 정리, 순서 등)
  list: (img, t, blogName) => page(t, `
    <div class="card" style="flex:1; display:flex; flex-direction:column">
      <h2>${highlight(img.title)}</h2>
      <ul>${(img.items || []).map((it, i) => `<li><span class="n">${img.check ? '✓' : i + 1}</span><span>${esc(it)}</span></li>`).join('')}</ul>
      <div class="footer">${esc(blogName)}</div>
    </div>`),

  // 한 문장 강조 카드 (인용, 핵심 한 줄)
  quote: (img, t, blogName) => page(t, `
    <div style="margin:auto 0"><div style="font-size:160px; line-height:1; color:${t.accent}; font-weight:800">“</div>
    <h1 style="font-size:72px">${highlight(img.title)}</h1>
    ${img.subtitle ? `<p class="sub" style="margin-top:36px">${esc(img.subtitle)}</p>` : ''}</div>
    <div class="footer">${esc(blogName)}</div>`),

  // 구매 유도(CTA) 버튼 이미지: 네이버 에디터에서 이 이미지에 판매 링크를 건다
  cta: (img, t) => page(t, `
    <div style="margin:auto 0; text-align:center; display:flex; flex-direction:column; align-items:center; gap:44px">
      ${img.label ? `<div class="label" style="align-self:center">${esc(img.label)}</div>` : ''}
      <h1 style="font-size:76px">${highlight(img.title)}</h1>
      ${img.subtitle ? `<p class="sub">${esc(img.subtitle)}</p>` : ''}
      <div style="background:${t.accent}; color:#fff; font-size:54px; font-weight:800; padding:36px 72px;
                  border-radius:999px; box-shadow:0 16px 40px rgba(0,0,0,.15)">${esc(img.button || '지금 확인하기')} 👉</div>
    </div>`),
};

(async () => {
  const dir = path.resolve(process.argv[2] || '');
  const specFile = path.join(dir, 'images.json');
  if (!fs.existsSync(specFile)) {
    console.error(`images.json 이 없습니다: ${specFile}`);
    process.exit(1);
  }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const theme = THEMES[spec.theme] || THEMES.warm;
  const outDir = path.join(dir, 'images');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: findChromium() });
  const tab = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  for (const img of spec.images) {
    const tpl = TEMPLATES[img.type];
    if (!tpl) { console.error(`알 수 없는 이미지 종류: ${img.type}`); continue; }
    // 폰트 파일(file://)을 읽을 수 있도록 임시 HTML 파일로 열어서 찍는다
    const tmp = path.join(os.tmpdir(), `naver-img-${process.pid}.html`);
    fs.writeFileSync(tmp, tpl(img, theme, spec.blogName || ''));
    await tab.goto('file://' + tmp, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    fs.rmSync(tmp, { force: true });
    await tab.screenshot({ path: path.join(outDir, img.file) });
    console.log(`이미지 생성: images/${img.file}`);
  }
  await browser.close();
})();
