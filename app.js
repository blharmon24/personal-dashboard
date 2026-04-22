const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
  document.documentElement.dataset.theme = 'light';
  themeToggle.textContent = '☀️';
}
themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.dataset.theme === 'light';
  const next = isLight ? 'dark' : 'light';
  document.documentElement.dataset.theme = next === 'dark' ? '' : 'light';
  themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
  localStorage.setItem('theme', next);
});

document.querySelectorAll('.nav-link[data-section]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const sectionId = link.dataset.section;

    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});
