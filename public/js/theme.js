// 페이지 렌더링 전에 저장된 테마를 즉시 적용 (깜빡임 방지)
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function getEffectiveTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateToggleIcon(theme) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  updateToggleIcon(getEffectiveTheme());

  btn.addEventListener('click', function () {
    var next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    updateToggleIcon(next);
  });
});
