(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const total = slides.length;
  const SPEAKERS = {
    1: { name: 'Speaker 1', role: 'Brand & Message', color: 'var(--s1)' },
    2: { name: 'Speaker 2', role: 'Market & Media', color: 'var(--s2)' },
    3: { name: 'Speaker 3', role: 'Creative & Launch', color: 'var(--s3)' }
  };
  const $ = (id) => document.getElementById(id);
  const chip = $('speakerChip'), bar = $('progressBar'), cur = $('cur');
  const notesPanel = $('notesPanel'), npList = $('npList'), npTitle = $('npTitle'), npSpeaker = $('npSpeaker');
  const notesBtn = $('notesBtn'), menu = $('menu'), menuBtn = $('menuBtn');
  const deckQuery = window.matchMedia('(min-width:900px) and (min-aspect-ratio:5/4)');
  let index = 0;

  $('tot').textContent = String(total).padStart(2, '0');

  // stagger reveal order per slide
  slides.forEach((s) => s.querySelectorAll('.rv').forEach((el, i) => el.style.setProperty('--i', i)));

  function setSpeaker(s) {
    const sp = SPEAKERS[s.dataset.speaker];
    document.documentElement.style.setProperty('--sc', sp.color);
    chip.querySelector('span').textContent = sp.name;
    chip.querySelector('em').textContent = sp.role;
    return sp;
  }

  function renderNotes(s, sp) {
    npSpeaker.textContent = sp.name + ' · ' + sp.role;
    npTitle.textContent = s.dataset.title;
    const src = s.querySelector('.notes ul');
    npList.innerHTML = src ? src.innerHTML : '';
  }

  function go(n, push = true) {
    n = Math.max(0, Math.min(total - 1, n));
    index = n;
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === n);
      s.setAttribute('aria-hidden', deckQuery.matches && i !== n ? 'true' : 'false');
    });
    const s = slides[n];
    const sp = setSpeaker(s);
    renderNotes(s, sp);
    cur.textContent = String(n + 1).padStart(2, '0');
    bar.style.width = ((n + 1) / total) * 100 + '%';
    menu.querySelectorAll('button').forEach((b) => b.classList.toggle('cur', Number(b.dataset.i) === n));
    if (push) {
      try { history.replaceState(null, '', '#' + (n + 1)); } catch (e) { /* sandboxed preview */ }
    }
    if (n !== 9) stopRadio();
  }

  // build menu grouped by speaker
  const cols = $('menuCols');
  [1, 2, 3].forEach((k) => {
    const col = document.createElement('div');
    col.className = 'menu-col';
    col.style.setProperty('--c', SPEAKERS[k].color);
    col.innerHTML = `<h4>${SPEAKERS[k].name}<small>${SPEAKERS[k].role}</small></h4>`;
    cols.appendChild(col);
  });
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>${s.dataset.title}`;
    b.addEventListener('click', () => { go(i); toggleMenu(false); });
    cols.children[s.dataset.speaker - 1].appendChild(b);
  });

  function toggleNotes(force) {
    const open = typeof force === 'boolean' ? force : !notesPanel.classList.contains('open');
    notesPanel.classList.toggle('open', open);
    notesPanel.setAttribute('aria-hidden', String(!open));
    notesBtn.setAttribute('aria-pressed', String(open));
  }
  function toggleMenu(force) {
    const open = typeof force === 'boolean' ? force : !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }

  $('prev').addEventListener('click', () => go(index - 1));
  $('next').addEventListener('click', () => go(index + 1));
  notesBtn.addEventListener('click', () => toggleNotes());
  menuBtn.addEventListener('click', () => toggleMenu());
  $('fsBtn').addEventListener('click', toggleFs);
  menu.addEventListener('click', (e) => { if (e.target === menu) toggleMenu(false); });
  document.querySelector('.brand').addEventListener('click', (e) => {
    if (deckQuery.matches) { e.preventDefault(); go(0); }
  });

  document.addEventListener('keydown', (e) => {
    if (!deckQuery.matches || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) {
      if (k === 'Enter' && document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault(); go(index + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(index - 1); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(total - 1);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'm' || k === 'M' || k === 'o' || k === 'O') toggleMenu();
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'Escape') { toggleMenu(false); toggleNotes(false); }
    else if (/^[1-9]$/.test(k)) go(Number(k) - 1);
  });

  // wheel + touch swipe in deck mode
  let wheelLock = 0;
  window.addEventListener('wheel', (e) => {
    if (!deckQuery.matches || menu.classList.contains('open')) return;
    const now = Date.now();
    if (now - wheelLock < 900 || Math.abs(e.deltaY) < 25) return;
    wheelLock = now;
    go(index + (e.deltaY > 0 ? 1 : -1));
  }, { passive: true });
  let tx = null;
  window.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!deckQuery.matches || tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    tx = null;
  });

  // stacked (mobile) mode: track speaker chip while scrolling
  const io = new IntersectionObserver((entries) => {
    if (deckQuery.matches) return;
    entries.forEach((en) => {
      if (en.isIntersecting) {
        const i = slides.indexOf(en.target);
        index = i;
        setSpeaker(en.target);
        bar.style.width = ((i + 1) / total) * 100 + '%';
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  slides.forEach((s) => io.observe(s));

  // ---- radio script player ----
  const script = $('script'), playBtn = $('playRadio'), rTime = $('radioTime');
  const lines = [...script.querySelectorAll('li')];
  const DURATION = 30;
  let raf = null, start = 0;
  const fmt = (t) => '0:' + String(Math.floor(t)).padStart(2, '0');
  function tick() {
    const t = (performance.now() - start) / 1000;
    if (t >= DURATION) { stopRadio(); rTime.textContent = '0:30 / 0:30'; return; }
    let on = 0;
    lines.forEach((l, i) => { if (t >= Number(l.dataset.t)) on = i; });
    lines.forEach((l, i) => { l.classList.toggle('on', i === on); l.classList.toggle('done', i < on); });
    rTime.textContent = fmt(t) + ' / 0:30';
    raf = requestAnimationFrame(tick);
  }
  function stopRadio() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    script.classList.remove('playing');
    lines.forEach((l) => l.classList.remove('on', 'done'));
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.querySelector('span').textContent = 'Play the script';
    rTime.textContent = '0:00 / 0:30';
  }
  playBtn.addEventListener('click', () => {
    if (raf) { stopRadio(); return; }
    start = performance.now();
    script.classList.add('playing');
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.querySelector('span').textContent = 'Stop';
    tick();
  });

  // initial slide from hash
  const fromHash = parseInt((location.hash || '').replace('#', ''), 10);
  go(Number.isFinite(fromHash) ? fromHash - 1 : 0, false);
  window.addEventListener('hashchange', () => {
    const h = parseInt(location.hash.replace('#', ''), 10);
    if (Number.isFinite(h) && h - 1 !== index) go(h - 1, false);
  });

})();
