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

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    const section = btn.closest('.content-section');

    section.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    section.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));

    btn.classList.add('active');
    section.querySelector(`#tab-${tabId}`).classList.remove('hidden');
  });
});
