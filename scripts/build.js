// posts/*.md 를 읽어서 dist/ 폴더에 완성된 웹사이트를 만든다.
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');
const SITE_TITLE = 'My Blog';
const layout = fs.readFileSync(path.join(ROOT, 'templates', 'layout.html'), 'utf8');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 글 맨 위 --- 사이의 정보(제목, 날짜, 태그)를 읽는다.
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  let lastKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    // 옵시디언 방식 목록:  tags:\n  - 생산성\n  - 개발
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && lastKey) {
      if (!Array.isArray(data[lastKey])) data[lastKey] = [];
      data[lastKey].push(item[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((t) => t.trim()).filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }
    data[key] = value;
    lastKey = key;
  }
  return { data, body: m[2] };
}

function formatDate(iso) {
  const [y, mo, d] = iso.split('-').map(Number);
  return `${y}년 ${mo}월 ${d}일`;
}

function render({ title, description = '', content, base, active }) {
  const vars = {
    pageTitle: title ? `${title} | ${SITE_TITLE}` : SITE_TITLE,
    description: escapeHtml(description),
    siteTitle: SITE_TITLE,
    base,
    content,
    postsActive: active === 'posts' ? 'active' : '',
    tagsActive: active === 'tags' ? 'active' : '',
    year: new Date().getFullYear(),
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

function tagLinks(tags, base) {
  return tags.map((t) =>
    `<a href="${base}tags/${encodeURIComponent(t)}.html" class="tag">${escapeHtml(t)}</a>`).join('');
}

function postCard(post, base) {
  return `
      <article class="post-card">
        <h2 class="post-card__title"><a href="${base}posts/${post.slug}.html">${escapeHtml(post.title)}</a></h2>
        <time class="post-card__date" datetime="${post.date}">${formatDate(post.date)}</time>
        <p class="post-card__desc">${escapeHtml(post.description)}</p>
        <div class="post-card__tags">${tagLinks(post.tags, base)}</div>
      </article>`;
}

function write(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function build() {
  // 오늘 날짜(한국 시간) — 이보다 미래 날짜의 글은 아직 공개하지 않는다(예약 발행).
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

  const posts = fs.readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
      return {
        slug: file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''),
        title: data.title || file,
        date: data.date || '1970-01-01',
        description: data.description || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        draft: data.draft === 'true',
        html: marked.parse(body),
      };
    })
    .filter((p) => !p.draft && p.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.cpSync(PUBLIC_DIR, DIST, { recursive: true });

  // 메인 페이지 (글 목록)
  write(path.join(DIST, 'index.html'), render({
    base: './', active: 'posts',
    content: `    <div class="post-list">
      <h1 class="post-list__title">All Posts</h1>${posts.map((p) => postCard(p, './')).join('')}
    </div>`,
  }));

  // 글 하나하나의 페이지
  for (const p of posts) {
    write(path.join(DIST, 'posts', `${p.slug}.html`), render({
      title: p.title, description: p.description, base: '../', active: 'posts',
      content: `    <article class="post">
      <header class="post__header">
        <h1 class="post__title">${escapeHtml(p.title)}</h1>
        <time class="post__date" datetime="${p.date}">${formatDate(p.date)}</time>
        <div class="post-card__tags">${tagLinks(p.tags, '../')}</div>
      </header>
      <div class="post__content">${p.html}</div>
      <a class="post__back" href="../">&larr; 목록으로</a>
    </article>`,
    }));
  }

  // 태그 모아보기
  const tagMap = {};
  for (const p of posts) for (const t of p.tags) (tagMap[t] ||= []).push(p);
  const tagNames = Object.keys(tagMap).sort();

  write(path.join(DIST, 'tags.html'), render({
    title: 'Tags', base: './', active: 'tags',
    content: `    <h1 class="post-list__title">Tags</h1>
    <div class="tag-cloud">${tagNames.map((t) =>
      `<a href="./tags/${encodeURIComponent(t)}.html" class="tag">${escapeHtml(t)} <span>${tagMap[t].length}</span></a>`).join('')}</div>`,
  }));
  for (const t of tagNames) {
    write(path.join(DIST, 'tags', `${t}.html`), render({
      title: `#${t}`, base: '../', active: 'tags',
      content: `    <div class="post-list">
      <h1 class="post-list__title">#${escapeHtml(t)}</h1>${tagMap[t].map((p) => postCard(p, '../')).join('')}
    </div>`,
    }));
  }

  console.log(`빌드 완료: 글 ${posts.length}개, 태그 ${tagNames.length}개 → dist/`);
}

build();
