/* global getApiBase, assetUrl */
(() => {
  const API = () => getApiBase();
  document.getElementById('year').textContent = new Date().getFullYear();

  const esc = (s) => (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Opens Gmail's web "New Message" compose window (pre-filled To field)
  // instead of relying on the visitor's local mail app via mailto:.
  const gmailComposeUrl = (email) =>
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;

  // Backend stores dates as free-form strings (e.g. "2019", "Jan 2022", "Present").
  // Try to make them look nice; if they aren't parseable, just show them as-is.
  const fmtDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // ---------- Fallback demo data (used when backend has nothing yet) ----------
  const FALLBACK = {
    profile: {
      name: 'Mubashra Rizwan',
      title: 'Data Analyst',
      bio: 'BBA student and aspiring Data Analyst passionate about turning raw data into clear business insights.',
      aboutBio: 'I work across the analytics stack — from querying and cleaning data to building dashboards that help people make better decisions. I enjoy turning messy, real-world datasets into stories that drive action.',
      email: 'hello@example.com',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      website: '',
      location: 'Karachi, Pakistan',
      profilePicture: '',
      resumeUrl: '',
    },
    projects: [
      { title: 'Retail Sales Dashboard', description: 'An interactive Power BI dashboard tracking revenue, margins and top products across regions.', technologies: ['Power BI', 'DAX', 'Power Query'], category: 'Dashboard', featured: true, imageUrl: '', liveUrl: '#', githubUrl: '#' },
      { title: 'Customer Churn Analysis', description: 'Exploratory analysis and visualizations identifying key drivers of customer churn.', technologies: ['Python', 'Pandas', 'Tableau'], category: 'Data Analysis', featured: true, imageUrl: '', liveUrl: '#', githubUrl: '#' },
      { title: 'Sales Database & Reporting', description: 'A normalized SQL database with automated reporting queries for a small business.', technologies: ['MySQL', 'PostgreSQL', 'Excel'], category: 'Database', featured: false, imageUrl: '', liveUrl: '#', githubUrl: '#' },
    ],
    skills: [
      { name: 'Python', category: 'Languages', proficiency: 85 },
      { name: 'DAX', category: 'Languages', proficiency: 80 },
      { name: 'Power BI', category: 'Visualization', proficiency: 92 },
      { name: 'Tableau', category: 'Visualization', proficiency: 85 },
      { name: 'Advanced Excel', category: 'Visualization', proficiency: 90 },
      { name: 'MySQL', category: 'Data', proficiency: 88 },
      { name: 'PostgreSQL', category: 'Data', proficiency: 80 },
      { name: 'BigQuery', category: 'Data', proficiency: 75 },
      { name: 'Power Query', category: 'Data', proficiency: 85 },
    ],
    experience: [
      { company: 'Freelance / Self-Directed', jobTitle: 'Data Analyst', startDate: '2024', current: true, description: 'Building dashboards and analysis projects using Power BI, Tableau and SQL to practice turning data into business insights.', technologies: ['Power BI', 'Tableau', 'SQL'], location: 'Karachi' },
    ],
    education: [
      { institution: 'University', degree: 'BBA — Business Administration', startDate: '2022', endDate: '2026', grade: '', description: 'Coursework focused on business analytics and data-driven decision making.' },
    ],
    courses: [
      { courseName: 'Google Data Analytics', institution: 'Coursera', description: 'Hands-on training in data cleaning, analysis and visualization using spreadsheets, SQL and Tableau.', certificateUrl: '' },
    ],
  };

  const state = {};

  // ---------- Fetch helpers ----------
  // NOTE: wrapped with a timeout. Without this, a slow/blocked API call
  // (common for crawlers / restricted network sandboxes like Googlebot's)
  // could leave `init()` waiting forever, which meant initReveal() never
  // ran and the whole page stayed invisible. Now every request gives up
  // after 4s and falls back to demo data instead of hanging.
  async function safeGet(path, fallback, timeoutMs = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${API()}${path}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('bad status');
      const json = await res.json();
      const data = json.data;
      if (Array.isArray(data) && data.length === 0) return fallback;
      if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) return fallback;
      return data || fallback;
    } catch (e) {
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- Render: Hero + About ----------
  function renderProfile(p) {
    state.profile = p;
    document.getElementById('navName').textContent = p.name || 'Portfolio';
    document.getElementById('footerName').innerHTML = `© <span id="year">${new Date().getFullYear()}</span> ${esc(p.name || 'Portfolio')}. All rights reserved.`;
    document.getElementById('heroName').textContent = p.name || 'Your Name';
    document.getElementById('heroBio').textContent = p.bio || '';
    document.getElementById('aboutBio1').textContent = p.aboutBio || p.bio || '';

    const pic = p.profilePicture ? assetUrl(p.profilePicture) :
      'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="100%" height="100%" fill="%23141a26"/><text x="50%" y="50%" font-family="monospace" font-size="18" fill="%2397a0b8" text-anchor="middle">no photo</text></svg>`);
    document.getElementById('aboutPhoto').src = pic;

    const resumeBtn = document.getElementById('resumeBtn');
    if (p.resumeUrl) { resumeBtn.href = assetUrl(p.resumeUrl); } else { resumeBtn.style.display = 'none'; }

    const emailBtn = document.getElementById('emailBtn');
    if (p.email) {
      emailBtn.href = gmailComposeUrl(p.email);
      emailBtn.target = '_blank';
      emailBtn.rel = 'noopener';
    }

    // social row(s)
    const socials = [];
    if (p.github) socials.push(['GitHub', p.github, iconGithub]);
    if (p.linkedin) socials.push(['LinkedIn', p.linkedin, iconLinkedin]);
    if (p.website) socials.push(['Website', p.website, iconWeb]);
    if (p.email) socials.push(['Email', gmailComposeUrl(p.email), iconMail]);
    const html = socials.map(([label, href, icon]) => `<a href="${href}" target="_blank" rel="noopener" title="${label}">${icon}</a>`).join('');
    document.getElementById('socialRow').innerHTML = html;
    document.getElementById('socialRow2').innerHTML = html;

    // meta row
    const meta = [];
    if (p.location) meta.push(`📍 <b>${esc(p.location)}</b>`);
    if (p.email) meta.push(`✉️ <a href="${gmailComposeUrl(p.email)}" target="_blank" rel="noopener"><b>${esc(p.email)}</b></a>`);
    if (p.phone) meta.push(`📞 <b>${esc(p.phone)}</b>`);
    document.getElementById('aboutMeta').innerHTML = meta.map(m => `<span>${m}</span>`).join('');

    // role typewriter
    const roles = [p.title || 'Data Analyst', 'Insight Hunter', 'Dashboard Builder'];
    startTypewriter(document.getElementById('roleSlot'), roles);

    // terminal snippet
    buildTerminal(p);
  }

  function renderStats({ projects, skills, experience }) {
    const years = experience.length
      ? Math.max(1, new Date().getFullYear() - new Date(experience.reduce((a, e) => (new Date(e.startDate) < new Date(a) ? e.startDate : a), experience[0].startDate)).getFullYear())
      : 1;
    const stats = [
      [projects.length, 'Projects'],
      [skills.length, 'Skills'],
      [years, 'Years Exp.'],
    ];
    document.getElementById('aboutStats').innerHTML = stats.map(([n, l]) =>
      `<div class="stat-box"><div class="num">${n}+</div><div class="lbl">${l}</div></div>`).join('');
  }

  function iconWrap(path) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${path}</svg>`; }
  const iconGithub = iconWrap('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke-linecap="round" stroke-linejoin="round"/>');
  const iconLinkedin = iconWrap('<rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M10 9h4v2.2c.7-1.3 2.2-2.4 4.3-2.4 3.2 0 4.7 2 4.7 5.6V21h-4v-5.6c0-1.7-.6-2.8-2-2.8-1.1 0-1.8.8-2.1 1.5-.1.3-.1.7-.1 1V21h-4V9z"/>');
  const iconWeb = iconWrap('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>');
  const iconMail = iconWrap('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6" stroke-linecap="round" stroke-linejoin="round"/>');

  function startTypewriter(el, words) {
    let wi = 0, ci = 0, deleting = false;
    function tick() {
      const word = words[wi];
      if (!deleting) {
        ci++;
        el.textContent = word.slice(0, ci);
        if (ci === word.length) { deleting = true; setTimeout(tick, 1400); return; }
      } else {
        ci--;
        el.textContent = word.slice(0, ci);
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
      }
      setTimeout(tick, deleting ? 35 : 70);
    }
    tick();
  }

  const SKILLS_LINE_INDEX = 6; // index into `lines` below of the "skills" row
  let terminalSkillsLineEl = null; // live reference so we can update it once real skills arrive

  function skillsSnippet(names) {
    const list = (names && names.length ? names : ['Python', 'Power BI', 'SQL']).slice(0, 3);
    return list.map(n => `<span class="str">"${esc(n)}"</span>`).join(', ');
  }

  function buildTerminal(p, skillNames) {
    const lines = [
      `<span class="kw">import</span> <span class="prop">pandas</span> <span class="kw">as</span> <span class="prop">pd</span>`,
      ``,
      `<span class="prop">analyst</span> = {`,
      `    <span class="str">"name"</span>: <span class="str">"${esc(p.name || 'Your Name')}"</span>,`,
      `    <span class="str">"title"</span>: <span class="str">"${esc(p.title || 'Data Analyst')}"</span>,`,
      `    <span class="str">"location"</span>: <span class="str">"${esc(p.location || 'Remote')}"</span>,`,
      `    <span class="str">"skills"</span>: [${skillsSnippet(skillNames)}],`,
      `    <span class="str">"available"</span>: <span class="kw">True</span>`,
      `}`,
      ``,
      `<span class="com"># turning raw data into decisions</span>`,
      `<span class="fn">pd</span>.<span class="fn">DataFrame</span>([analyst])`,
    ];
    const body = document.getElementById('terminalBody');
    body.innerHTML = '';
    terminalSkillsLineEl = null;
    let i = 0;
    function addLine() {
      if (i >= lines.length) {
        const cursor = document.createElement('span');
        cursor.className = 'type-cursor';
        body.appendChild(cursor);
        return;
      }
      const p2 = document.createElement('p');
      p2.innerHTML = `<span class="ln">${String(i + 1).padStart(2, '0')}</span>${lines[i]}`;
      p2.style.opacity = '0';
      body.appendChild(p2);
      if (i === SKILLS_LINE_INDEX) terminalSkillsLineEl = p2;
      requestAnimationFrame(() => { p2.style.transition = 'opacity .25s ease'; p2.style.opacity = '1'; });
      i++;
      setTimeout(addLine, 130);
    }
    addLine();
  }

  // Called once real skills load from the backend (they arrive slightly after
  // the profile, which renders first so the terminal can start typing right
  // away). Swaps the "skills" line's content in place without re-running the
  // typing animation.
  function updateTerminalSkills(skills) {
    if (!terminalSkillsLineEl || !skills || !skills.length) return;
    const names = skills.map(s => s.name).filter(Boolean);
    terminalSkillsLineEl.innerHTML =
      `<span class="ln">${String(SKILLS_LINE_INDEX + 1).padStart(2, '0')}</span>    <span class="str">"skills"</span>: [${skillsSnippet(names)}],`;
  }

  // ---------- Skills ----------
  function renderSkills(skills) {
    const byCat = {};
    skills.forEach(s => { (byCat[s.category] = byCat[s.category] || []).push(s); });
    const html = Object.entries(byCat).map(([cat, list]) => `
      <div class="skill-cat">
        <h3>${esc(cat)}</h3>
        ${list.map(s => `
          <div class="skill-row">
            <div class="skill-row-top"><span>${esc(s.name)}</span><span class="pct">${s.proficiency}%</span></div>
            <div class="skill-bar"><div class="skill-bar-fill" data-pct="${s.proficiency}"></div></div>
          </div>`).join('')}
      </div>`).join('');
    document.getElementById('skillsCats').innerHTML = html || '<p style="color:var(--text-dim)">Skills coming soon.</p>';
    // Newly-injected bars need the fade-in fill triggered (page may already
    // have scrolled past this section by the time data arrives).
    document.querySelectorAll('#skillsCats .skill-bar-fill').forEach(b => { b.style.width = b.dataset.pct + '%'; });
  }

  // ---------- Projects slider + grid ----------
  let sliderIndex = 0, sliderTimer = null;
  function renderProjects(projects) {
    const featured = projects.filter(p => p.featured).slice(0, 5);
    const slidesSource = featured.length ? featured : projects.slice(0, 3);
    const track = document.getElementById('sliderTrack');
    const dots = document.getElementById('sliderDots');

    track.innerHTML = slidesSource.map(p => `
      <div class="slide">
        <div class="slide-media">${projImg(p)}</div>
        <div class="slide-body">
          <span class="slide-cat">${esc(p.category || 'Project')}</span>
          <h3 class="slide-title">${esc(p.title)}</h3>
          <p class="slide-desc">${esc(p.description || '')}</p>
          <div class="slide-tech">${(p.technologies || []).map(t => `<span class="tech-chip">${esc(t)}</span>`).join('')}</div>
          <div class="slide-links">
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" rel="noopener">Live Site ↗</a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" rel="noopener">Code ↗</a>` : ''}
            ${deckLink(projImages(p))}
          </div>
        </div>
      </div>`).join('');

    track.querySelectorAll('.slide').forEach((slideEl, i) => {
      const btn = slideEl.querySelector('.deck-link');
      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDeck(slidesSource[i], projImages(slidesSource[i])); });
    });

    dots.innerHTML = slidesSource.map((_, i) => `<div class="slider-dot${i === 0 ? ' active' : ''}" data-i="${i}"></div>`).join('');
    sliderIndex = 0;
    goToSlide(0);

    dots.querySelectorAll('.slider-dot').forEach(d => d.addEventListener('click', () => goToSlide(parseInt(d.dataset.i))));
    document.getElementById('prevSlide').onclick = () => goToSlide(sliderIndex - 1);
    document.getElementById('nextSlide').onclick = () => goToSlide(sliderIndex + 1);

    const wrap = document.getElementById('featuredSliderWrap');
    wrap.style.display = slidesSource.length ? '' : 'none';
    if (slidesSource.length > 1) startAutoplay(slidesSource.length);

    function goToSlide(i) {
      const n = slidesSource.length;
      sliderIndex = (i + n) % n;
      track.style.transform = `translateX(-${sliderIndex * 100}%)`;
      dots.querySelectorAll('.slider-dot').forEach((d, idx) => d.classList.toggle('active', idx === sliderIndex));
      track.querySelectorAll('.slide').forEach((s, idx) => {
        s.classList.toggle('active', idx === sliderIndex);
        s.classList.toggle('is-prev', idx === (sliderIndex - 1 + n) % n);
        s.classList.toggle('is-next', idx === (sliderIndex + 1) % n);
      });
      resetAutoplay(n);
    }
    function startAutoplay(n) { sliderTimer = setInterval(() => goToSlide(sliderIndex + 1), 5000); }
    function resetAutoplay(n) { if (sliderTimer) clearInterval(sliderTimer); if (n > 1) sliderTimer = setInterval(() => goToSlide(sliderIndex + 1), 5000); }

    // Grid: remaining projects (or all if none featured)
    const gridSource = featured.length ? projects.filter(p => !p.featured) : projects.slice(3);
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = gridSource.map(p => `
      <div class="proj-card">
        <div class="proj-card-img">${projImg(p)}</div>
        <div class="proj-card-body">
          <h4>${esc(p.title)}</h4>
          <p>${esc(p.description || '')}</p>
          <div class="proj-card-tech">${(p.technologies || []).slice(0, 4).map(t => `<span class="tech-chip">${esc(t)}</span>`).join('')}</div>
          ${(p.liveUrl || p.githubUrl || projImages(p).length > 1) ? `
          <div class="slide-links proj-card-links">
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" rel="noopener">Live Site ↗</a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" rel="noopener">Code ↗</a>` : ''}
            ${deckLink(projImages(p))}
          </div>` : ''}
        </div>
      </div>`).join('');

    grid.querySelectorAll('.proj-card').forEach((card, i) => {
      const btn = card.querySelector('.deck-link');
      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDeck(gridSource[i], projImages(gridSource[i])); });
    });
  }

  // A project can carry an `images` array (up to 70). Falls back to the
  // legacy single `imageUrl` field for older records.
  function projImages(p) {
    if (Array.isArray(p.images) && p.images.length) return p.images.slice(0, 70);
    return p.imageUrl ? [p.imageUrl] : [];
  }

  function projImg(p) {
    const cover = projImages(p)[0];
    if (cover) return `<img src="${assetUrl(cover)}" alt="${esc(p.title)}">`;
    return `<svg width="100%" height="100%" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1a2133"/><text x="50%" y="50%" font-family="monospace" font-size="16" fill="#5c6579" text-anchor="middle">${esc(p.title || 'project')}</text></svg>`;
  }

  // Prominent "Full Deck" link — sits next to Live Site / Code, only shown
  // when a project has more than one photo.
  function deckLink(imgs) {
    if (imgs.length <= 1) return '';
    return `<button class="deck-link" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="13" height="13" rx="2"/><path d="M8 8h13v13H8z"/></svg>
      Full Deck (${imgs.length}) ↗
    </button>`;
  }

  // ---------- Fullscreen project deck viewer ----------
  function openDeck(p, imgs) {
    imgs = (imgs && imgs.length) ? imgs : projImages(p);
    if (!imgs.length) return;
    const scroll = document.getElementById('deckScroll');
    document.getElementById('deckTitle').textContent = p.title || 'Project';
    scroll.innerHTML = imgs.map((src, i) =>
      `<div class="deck-slide"><img src="${assetUrl(src)}" alt="${esc(p.title || 'project')} — photo ${i + 1}" loading="${i < 2 ? 'eager' : 'lazy'}"></div>`
    ).join('');
    scroll.scrollTop = 0;
    updateDeckCounter(1, imgs.length);
    scroll.onscroll = () => {
      const idx = Math.min(imgs.length, Math.round(scroll.scrollTop / scroll.clientHeight) + 1);
      updateDeckCounter(idx, imgs.length);
    };
    document.getElementById('deckViewer').classList.add('open');
    document.getElementById('deckViewer').setAttribute('aria-hidden', 'false');
    document.body.classList.add('deck-open');
  }

  function updateDeckCounter(cur, total) {
    document.getElementById('deckCounter').textContent = `${cur} / ${total}`;
  }

  function closeDeck() {
    const viewer = document.getElementById('deckViewer');
    viewer.classList.remove('open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('deck-open');
    document.getElementById('deckScroll').innerHTML = '';
  }

  function initDeckViewer() {
    document.getElementById('deckClose').addEventListener('click', closeDeck);
    document.getElementById('deckViewer').addEventListener('click', (e) => {
      if (e.target.id === 'deckViewer') closeDeck();
    });
    document.addEventListener('keydown', (e) => {
      const viewer = document.getElementById('deckViewer');
      if (!viewer.classList.contains('open')) return;
      const scroll = document.getElementById('deckScroll');
      if (e.key === 'Escape') closeDeck();
      else if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); scroll.scrollBy({ top: scroll.clientHeight, behavior: 'smooth' }); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); scroll.scrollBy({ top: -scroll.clientHeight, behavior: 'smooth' }); }
    });
  }

  // ---------- Timelines ----------
  function renderTimeline(id, items, opts) {
    const el = document.getElementById(id);
    if (!items.length) { el.innerHTML = `<p style="color:var(--text-dim)">Nothing added yet.</p>`; return; }
    el.innerHTML = items.map(it => {
      const period = `${fmtDate(it.startDate)} — ${it.current ? 'Present' : fmtDate(it.endDate)}`;
      if (opts === 'experience') {
        return `<div class="tl-item ${it.current ? 'current' : ''}">
          <div class="tl-dot"></div>
          <span class="tl-period">${period}</span>
          <h4 class="tl-role">${esc(it.jobTitle)}</h4>
          <div class="tl-org">${esc(it.company)}${it.location ? `<span class="sep">·</span>${esc(it.location)}` : ''}</div>
          <p class="tl-desc">${esc(it.description || '')}</p>
          <div class="tl-tags">${(it.technologies || []).map(t => `<span class="tech-chip">${esc(t)}</span>`).join('')}</div>
        </div>`;
      }
      return `<div class="tl-item">
        <div class="tl-dot"></div>
        <span class="tl-period">${period}</span>
        <h4 class="tl-role">${esc(it.degree)}</h4>
        <div class="tl-org">${esc(it.institution)}${it.grade ? `<span class="sep">·</span>${esc(it.grade)}` : ''}</div>
        <p class="tl-desc">${esc(it.description || '')}</p>
      </div>`;
    }).join('');
  }

  // ---------- Render: Courses ----------
  function renderCourses(items) {
    const el = document.getElementById('coursesGrid');
    if (!el) return;
    if (!items.length) { el.innerHTML = `<p style="color:var(--text-dim)">Nothing added yet.</p>`; return; }
    el.innerHTML = items.map(it => `
      <div class="course-card">
        <h4 class="course-name">${esc(it.courseName)}</h4>
        <div class="course-org">${esc(it.institution || '')}</div>
        ${it.description ? `<p class="course-desc">${esc(it.description)}</p>` : ''}
        ${it.certificateUrl ? `<a class="course-cert-link" href="${esc(it.certificateUrl)}" target="_blank" rel="noopener">View Certificate ↗</a>` : ''}
      </div>`).join('');
  }

  // ---------- Reveal on scroll (SEO-SAFE) ----------
  // Content is visible by default in CSS now (see style.css). This function
  // only ADDS the ".pre" (pre-animation, hidden) state right before it starts
  // observing, then removes it once each element scrolls into view — giving
  // the same fade/slide effect for real visitors. If this function never
  // runs (JS error, blocked script, crawler timeout, etc.), nothing is ever
  // hidden in the first place, so search engines always see full content.
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      // No IO support (very old browser / unusual crawler) — leave content
      // visible as-is, skip the animation entirely. Safe by default.
      return;
    }

    items.forEach(i => i.classList.add('pre'));

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.remove('pre');
          e.target.classList.add('in');
          e.target.querySelectorAll('.skill-bar-fill').forEach(b => { b.style.width = b.dataset.pct + '%'; });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(i => io.observe(i));

    // Fail-safe: if for any reason an element never intersects (e.g. a
    // renderer that doesn't scroll/resize, or content injected after the
    // observer set up), force-reveal everything still hidden after 3s so
    // nothing is left permanently invisible.
    setTimeout(() => {
      document.querySelectorAll('.reveal.pre').forEach(el => {
        el.classList.remove('pre');
        el.classList.add('in');
        el.querySelectorAll('.skill-bar-fill').forEach(b => { b.style.width = b.dataset.pct + '%'; });
      });
    }, 3000);
  }

  // ---------- Premium star + sprinkle ambience ----------
  function initStarField() {
    const field = document.getElementById('starField');
    if (!field) return;
    const rand = (min, max) => Math.random() * (max - min) + min;

    // soft twinkling stars
    const STAR_COUNT = 70;
    for (let i = 0; i < STAR_COUNT; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      const size = rand(1, 2.6);
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.left = `${rand(0, 100)}%`;
      s.style.top = `${rand(0, 100)}%`;
      s.style.setProperty('--dur', `${rand(2.5, 6.5)}s`);
      s.style.setProperty('--delay', `${rand(0, 6)}s`);
      s.style.setProperty('--peak', rand(0.5, 1));
      field.appendChild(s);
    }

    // four-point sparkle glints, the "premium" accent
    const SPARKLE_COUNT = 14;
    const sparkleColors = ['var(--accent)', 'var(--accent-2)', 'var(--accent-warm)'];
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const sp = document.createElement('span');
      sp.className = 'sprinkle';
      const size = rand(8, 16);
      sp.style.width = `${size}px`;
      sp.style.height = `${size}px`;
      sp.style.left = `${rand(0, 100)}%`;
      sp.style.top = `${rand(0, 100)}%`;
      sp.style.color = sparkleColors[i % sparkleColors.length];
      sp.style.setProperty('--dur', `${rand(4, 8)}s`);
      sp.style.setProperty('--delay', `${rand(0, 8)}s`);
      sp.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c.7 4.9 2 8.3 4 10.3 2 2 5.3 3.2 8 4-4.9.7-8.3 2-10.3 4-2 2-3.2 5.3-4 8-.7-4.9-2-8.3-4-10.3-2-2-5.3-3.2-8-4 4.9-.7 8.3-2 10.3-4 2-2 3.2-5.3 4-8z"/></svg>';
      field.appendChild(sp);
    }

    // falling / shooting stars streaking across the sky
    const FALLING_COUNT = 6;
    for (let i = 0; i < FALLING_COUNT; i++) {
      const fs = document.createElement('span');
      fs.className = 'falling-star';
      fs.style.left = `${rand(0, 90)}%`;
      fs.style.setProperty('--len', `${rand(60, 120)}px`);
      fs.style.setProperty('--dur', `${rand(3, 6)}s`);
      fs.style.setProperty('--delay', `${rand(0, 8)}s`);
      field.appendChild(fs);
    }
  }

  // ---------- Nav ----------
  function initNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      document.body.classList.toggle('no-scroll');
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      document.body.classList.remove('no-scroll');
    }));
    window.addEventListener('scroll', () => {
      const nav = document.querySelector('.nav');
      nav.style.background = window.scrollY > 20 ? 'rgba(10,13,20,0.9)' : 'rgba(10,13,20,0.65)';
    });
  }

  // ---------- Boot ----------
  async function init() {
    initNav();
    initStarField();
    initDeckViewer();

    // IMPORTANT: reveal is initialized immediately, independent of any
    // network/API calls below. Previously this ran only after all backend
    // fetches resolved — if one hung (slow API, blocked in a crawler
    // sandbox, etc.) the whole page stayed invisible forever. Now the
    // animation system starts right away, and content is visible by
    // default anyway (see the CSS), so nothing can get stuck hidden.
    initReveal();

    try {
      // Fetch everything in parallel, but don't make the hero terminal wait on
      // the slowest one — render the profile (and start the typing effect)
      // the moment it's ready, while projects/skills/etc. keep loading.
      const profilePromise = safeGet('/api/profile', FALLBACK.profile);
      const projectsPromise = safeGet('/api/projects', FALLBACK.projects);
      const skillsPromise = safeGet('/api/skills', FALLBACK.skills);
      const experiencePromise = safeGet('/api/experience', FALLBACK.experience);
      const educationPromise = safeGet('/api/education', FALLBACK.education);
      const coursesPromise = safeGet('/api/courses', FALLBACK.courses);

      const profile = await profilePromise;
      renderProfile(profile);

      const [projects, skills, experience, education, courses] = await Promise.all([
        projectsPromise, skillsPromise, experiencePromise, educationPromise, coursesPromise,
      ]);

      renderStats({ projects, skills, experience });
      renderSkills(skills);
      updateTerminalSkills(skills);
      renderProjects(projects);
      renderTimeline('experienceTimeline', [...experience].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)), 'experience');
      renderTimeline('educationTimeline', [...education].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)), 'education');
      renderCourses([...courses].sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (e) {
      // Even if something above throws unexpectedly, the page itself
      // (nav, star field, reveal animation) has already initialized and
      // stays fully visible and usable.
      console.error('Content load failed, showing fallback state:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();