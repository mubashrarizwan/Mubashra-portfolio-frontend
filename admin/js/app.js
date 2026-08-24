/**
 * admin/js/app.js
 * ---------------------------------------------------------
 * All admin dashboard UI logic: login, view switching, and
 * CRUD forms for profile / projects / skills / experience /
 * education / courses, backed by admin/js/api.js.
 * ---------------------------------------------------------
 */

const esc = (s) => (s || '').toString()
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const splitCsv = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean);
const joinCsv = (arr) => (arr || []).join(', ');

// --- Null-safe DOM helpers -------------------------------------------
// If an element with the given id doesn't exist on the current page,
// these simply do nothing instead of throwing
// "Cannot set properties of null (setting 'value')".
function setVal(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value;
}
function getVal(id, fallback = '') {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}
function setChecked(id, checked) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = !!checked;
}
function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}
function setSrc(id, src) {
  const el = document.getElementById(id);
  if (!el) return;
  el.src = src;
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
}
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(event, handler);
}
// -----------------------------------------------------------------------

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.className = 'toast'; }, 3200);
}

function setError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!message) { el.classList.remove('show'); el.textContent = ''; return; }
  el.textContent = message;
  el.classList.add('show');
}

function placeholderPic() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#141a26"/><text x="50%" y="50%" font-family="monospace" font-size="14" fill="#5c6579" text-anchor="middle">no photo</text></svg>`
  );
}

// Shows/hides the "View current résumé" link vs the "No résumé uploaded
// yet" hint on the Profile page, based on the current resumeUrl.
function updateResumeUI(resumeUrl) {
  const link = document.getElementById('resumeLink');
  const empty = document.getElementById('resumeEmpty');
  if (link) {
    if (resumeUrl) {
      link.href = window.assetUrl(resumeUrl);
      link.style.display = '';
    } else {
      link.href = '#';
      link.style.display = 'none';
    }
  }
  if (empty) empty.style.display = resumeUrl ? 'none' : '';
}

// Resizes/compresses a picked image file down to a reasonable size before
// it's stored as a base64 string, so it doesn't get rejected by the
// backend for being too large.
function compressImage(file, maxWidth = 1800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================================================
   LOGIN
   ========================================================= */

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminShell').classList.remove('active');
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').classList.add('active');
  const admin = Auth.getAdmin();
  setText('whoAmI', admin ? `Signed in as ${admin.username}` : '');
  switchView('profile');
}

function initLogin() {
  setText('currentApiBase', window.getApiBase());

  on('changeApiBaseLink', 'click', (e) => {
    e.preventDefault();
    const current = window.getApiBase();
    const next = prompt('Backend API URL', current);
    if (next && next.trim()) {
      window.setApiBase(next.trim());
      setText('currentApiBase', window.getApiBase());
    }
  });

  on('loginForm', 'submit', async (e) => {
    e.preventDefault();
    setError('loginError', '');
    const username = getVal('loginUsername').trim();
    const password = getVal('loginPassword');
    const btn = document.getElementById('loginSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
    try {
      const res = await Api.login(username, password);
      Auth.setToken(res.token);
      Auth.setAdmin(res.user);
      document.getElementById('loginForm').reset();
      showDashboard();
    } catch (err) {
      setError('loginError', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
  });

  on('logoutBtn', 'click', async () => {
    await Api.logout();
    Auth.clearToken();
    showLogin();
  });
}

/* =========================================================
   VIEW SWITCHING
   ========================================================= */

const VIEW_TITLES = {
  profile: 'Profile', projects: 'Projects', skills: 'Skills',
  experience: 'Experience', education: 'Education', courses: 'Courses', settings: 'Settings',
};
const VIEW_LOADERS = {
  profile: loadProfile, projects: loadProjects, skills: loadSkills,
  experience: loadExperience, education: loadEducation, courses: loadCourses,
  settings: () => { setVal('apiBaseInput', window.getApiBase()); },
};

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => { v.style.display = 'none'; });
  const target = document.getElementById(`view-${name}`);
  if (target) target.style.display = 'block';
  document.querySelectorAll('.side-link').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  setText('viewTitle', VIEW_TITLES[name]);
  const loader = VIEW_LOADERS[name];
  if (loader) loader();
}

function initSidebar() {
  document.querySelectorAll('.side-link').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {
  try {
    const res = await Api.getProfile();
    const p = res.data || {};
    setVal('pName', p.name || '');
    setVal('pTitle', p.title || '');
    setVal('pBio', p.bio || '');
    setVal('pAboutBio', p.aboutBio || '');
    setVal('pEmail', p.email || '');
    setVal('pPhone', p.phone || '');
    setVal('pLocation', p.location || '');
    setVal('pGithub', p.github || '');
    setVal('pLinkedin', p.linkedin || '');
    setVal('pTwitter', p.twitter || '');
    setVal('pWebsite', p.website || '');
    setSrc('profilePicPreview', p.profilePicture ? window.assetUrl(p.profilePicture) : placeholderPic());
    updateResumeUI(p.resumeUrl || '');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initProfile() {
  on('profileForm', 'submit', async (e) => {
    e.preventDefault();
    setError('profileError', '');
    const data = {
      name: getVal('pName'),
      title: getVal('pTitle'),
      bio: getVal('pBio'),
      aboutBio: getVal('pAboutBio'),
      email: getVal('pEmail'),
      phone: getVal('pPhone'),
      location: getVal('pLocation'),
      github: getVal('pGithub'),
      linkedin: getVal('pLinkedin'),
      twitter: getVal('pTwitter'),
      website: getVal('pWebsite'),
    };
    try {
      await Api.updateProfile(data);
      showToast('Profile saved.');
    } catch (err) {
      setError('profileError', err.message);
    }
  });

  on('profilePicUploadBtn', 'click', () => {
    const input = document.getElementById('profilePicInput');
    if (input) input.click();
  });

  on('profilePicInput', 'change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const res = await Api.uploadProfilePicture(file);
      setSrc('profilePicPreview', window.assetUrl(res.data.profilePicture));
      showToast('Profile picture updated.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });

  on('profilePicDeleteBtn', 'click', async () => {
    if (!confirm('Remove the profile picture?')) return;
    try {
      await Api.deleteProfilePicture();
      setSrc('profilePicPreview', placeholderPic());
      showToast('Profile picture removed.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  on('resumeUploadBtn', 'click', () => {
    const input = document.getElementById('resumeInput');
    if (input) input.click();
  });

  on('resumeInput', 'change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const res = await Api.uploadResume(file);
      updateResumeUI(res.data.resumeUrl || '');
      showToast('Résumé updated.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });

  on('resumeDeleteBtn', 'click', async () => {
    if (!confirm('Remove the résumé?')) return;
    try {
      await Api.deleteResume();
      updateResumeUI('');
      showToast('Résumé removed.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

/* =========================================================
   Generic helper for building a CRUD list section
   ========================================================= */

function itemRow(title, subtitle, tags, onEdit, onDelete) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <div class="item-main">
      <h4>${esc(title)}</h4>
      <p>${esc(subtitle || '')}</p>
      <div class="item-tags">${(tags || []).map(t => `<span class="tech-chip">${esc(t)}</span>`).join('')}</div>
    </div>
    <div class="item-actions">
      <button class="btn btn-sm btn-outline" data-act="edit">Edit</button>
      <button class="btn btn-sm btn-danger" data-act="delete">Delete</button>
    </div>`;
  row.querySelector('[data-act="edit"]').addEventListener('click', onEdit);
  row.querySelector('[data-act="delete"]').addEventListener('click', onDelete);
  return row;
}

/* =========================================================
   PROJECTS
   ========================================================= */

const MAX_PROJECT_IMAGES = 70;
let projectGallery = [];   // existing images already saved on the server (S3 URLs)
let pendingFiles = [];     // newly selected files, not uploaded yet
let pendingPreviews = [];  // local object-URL previews, parallel to pendingFiles

function renderGallery() {
  const grid = document.getElementById('projGalleryGrid');
  if (!grid) return;
  const total = projectGallery.length + pendingFiles.length;
  setText('projGalleryCount', `${total} / ${MAX_PROJECT_IMAGES}`);
  if (!total) {
    grid.innerHTML = '<p class="gallery-empty">No pictures yet — add up to 70.</p>';
    return;
  }

  const existingHtml = projectGallery.map((src, i) => `
    <div class="gallery-thumb">
      ${i === 0 ? '<span class="cover-badge">Cover</span>' : ''}
      <img src="${src}" alt="Project picture ${i + 1}">
      <button type="button" class="thumb-remove" data-type="existing" data-i="${i}" title="Remove">×</button>
    </div>`).join('');

  const pendingHtml = pendingFiles.map((_file, i) => `
    <div class="gallery-thumb gallery-thumb-pending">
      ${projectGallery.length === 0 && i === 0 ? '<span class="cover-badge">Cover</span>' : ''}
      <img src="${pendingPreviews[i]}" alt="New picture ${i + 1}">
      <span class="pending-badge">New</span>
      <button type="button" class="thumb-remove" data-type="pending" data-i="${i}" title="Remove">×</button>
    </div>`).join('');

  grid.innerHTML = existingHtml + pendingHtml;

  grid.querySelectorAll('.thumb-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const i = Number(btn.dataset.i);
      if (btn.dataset.type === 'pending') {
        URL.revokeObjectURL(pendingPreviews[i]);
        pendingFiles.splice(i, 1);
        pendingPreviews.splice(i, 1);
        renderGallery();
        return;
      }
      const projId = getVal('projId');
      btn.disabled = true;
      try {
        const res = await Api.deleteProjectImage(projId, i);
        projectGallery = (res.data && res.data.images) || [];
        renderGallery();
        showToast('Picture removed.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
      }
    });
  });
}

async function loadProjects() {
  const list = document.getElementById('projectsList');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res = await Api.getProjects();
    const projects = res.data || [];
    list.innerHTML = '';
    if (!projects.length) { list.innerHTML = '<p class="empty-state">No projects yet.</p>'; return; }
    projects.forEach(p => {
      list.appendChild(itemRow(
        p.title + (p.featured ? ' ★' : ''),
        p.description,
        p.technologies,
        () => fillProjectForm(p),
        () => deleteProject(p._id)
      ));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${esc(err.message)}</p>`;
  }
}

function resetProjectForm() {
  const form = document.getElementById('projectForm');
  if (form) form.reset();
  setVal('projId', '');
  pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
  projectGallery = [];
  pendingFiles = [];
  pendingPreviews = [];
  renderGallery();
  setText('projectFormTitle', 'Add Project');
  setText('projSubmitBtn', 'Add Project');
  const cancelBtn = document.getElementById('projCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  setError('projectError', '');
}

function fillProjectForm(p) {
  setVal('projId', p._id);
  setVal('projTitle', p.title || '');
  setVal('projCategory', p.category || '');
  setVal('projDescription', p.description || '');
  setVal('projLongDescription', p.longDescription || '');
  setVal('projTechnologies', joinCsv(p.technologies));
  pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
  projectGallery = Array.isArray(p.images) && p.images.length
    ? p.images.slice(0, MAX_PROJECT_IMAGES)
    : (p.imageUrl ? [p.imageUrl] : []);
  pendingFiles = [];
  pendingPreviews = [];
  renderGallery();
  setVal('projOrder', p.order || 0);
  setVal('projLiveUrl', p.liveUrl || '');
  setVal('projGithubUrl', p.githubUrl || '');
  setChecked('projFeatured', p.featured);
  setText('projectFormTitle', 'Edit Project');
  setText('projSubmitBtn', 'Update Project');
  const cancelBtn = document.getElementById('projCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  try {
    await Api.deleteProject(id);
    showToast('Project deleted.');
    loadProjects();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initProjects() {
  on('projectForm', 'submit', async (e) => {
    e.preventDefault();
    setError('projectError', '');
    const id = getVal('projId');
    const data = {
      title: getVal('projTitle'),
      category: getVal('projCategory'),
      description: getVal('projDescription'),
      longDescription: getVal('projLongDescription'),
      technologies: splitCsv(getVal('projTechnologies')),
      order: Number(getVal('projOrder')) || 0,
      liveUrl: getVal('projLiveUrl'),
      githubUrl: getVal('projGithubUrl'),
      featured: getChecked('projFeatured'),
    };
    const submitBtn = document.getElementById('projSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;
    try {
      let projectId = id;
      if (id) {
        await Api.updateProject(id, data);
      } else {
        const res = await Api.createProject(data);
        projectId = res.data._id;
      }
      if (pendingFiles.length) {
        if (submitBtn) submitBtn.textContent = `Uploading ${pendingFiles.length} picture(s)…`;
        await Api.uploadProjectImages(projectId, pendingFiles);
      }
      showToast(id ? 'Project updated.' : 'Project added.', 'success');
      resetProjectForm();
      loadProjects();
    } catch (err) {
      setError('projectError', err.message);
      showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = id ? 'Save Changes' : 'Add Project';
      }
    }
  });
  on('projCancelBtn', 'click', resetProjectForm);

  on('projImageUploadBtn', 'click', () => {
    const input = document.getElementById('projImageInput');
    if (input) input.click();
  });
  on('projImageInput', 'change', (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const room = MAX_PROJECT_IMAGES - (projectGallery.length + pendingFiles.length);
    if (room <= 0) {
      showToast(`Maximum of ${MAX_PROJECT_IMAGES} pictures per project.`, 'error');
      return;
    }
    const toAdd = files.slice(0, room);
    if (files.length > toAdd.length) {
      showToast(`Only added ${toAdd.length} — ${MAX_PROJECT_IMAGES}-picture limit reached.`, 'error');
    }
    toAdd.forEach((file) => {
      pendingFiles.push(file);
      pendingPreviews.push(URL.createObjectURL(file));
    });
    renderGallery();
  });
  renderGallery();
}

/* =========================================================
   SKILLS
   ========================================================= */

async function loadSkills() {
  const list = document.getElementById('skillsList');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res = await Api.getSkills();
    const skills = res.data || [];
    list.innerHTML = '';
    if (!skills.length) { list.innerHTML = '<p class="empty-state">No skills yet.</p>'; return; }
    skills.forEach(s => {
      list.appendChild(itemRow(
        s.name,
        `${s.category || 'Uncategorized'} · ${s.proficiency}%`,
        [],
        () => fillSkillForm(s),
        () => deleteSkill(s._id)
      ));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${esc(err.message)}</p>`;
  }
}

function resetSkillForm() {
  const form = document.getElementById('skillForm');
  if (form) form.reset();
  setVal('skillId', '');
  setVal('skillProficiency', 80);
  setText('skillFormTitle', 'Add Skill');
  setText('skillSubmitBtn', 'Add Skill');
  const cancelBtn = document.getElementById('skillCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  setError('skillError', '');
}

function fillSkillForm(s) {
  setVal('skillId', s._id);
  setVal('skillName', s.name || '');
  setVal('skillCategory', s.category || '');
  setVal('skillProficiency', s.proficiency ?? 80);
  setVal('skillOrder', s.order || 0);
  setVal('skillIconUrl', s.iconUrl || '');
  setText('skillFormTitle', 'Edit Skill');
  setText('skillSubmitBtn', 'Update Skill');
  const cancelBtn = document.getElementById('skillCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteSkill(id) {
  if (!confirm('Delete this skill?')) return;
  try {
    await Api.deleteSkill(id);
    showToast('Skill deleted.');
    loadSkills();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initSkills() {
  on('skillForm', 'submit', async (e) => {
    e.preventDefault();
    setError('skillError', '');
    const id = getVal('skillId');
    const data = {
      name: getVal('skillName'),
      category: getVal('skillCategory'),
      proficiency: Number(getVal('skillProficiency')) || 0,
      order: Number(getVal('skillOrder')) || 0,
      iconUrl: getVal('skillIconUrl'),
    };
    try {
      if (id) { await Api.updateSkill(id, data); showToast('Skill updated.'); }
      else { await Api.createSkill(data); showToast('Skill added.'); }
      resetSkillForm();
      loadSkills();
    } catch (err) {
      setError('skillError', err.message);
    }
  });
  on('skillCancelBtn', 'click', resetSkillForm);
}

/* =========================================================
   EXPERIENCE
   ========================================================= */

async function loadExperience() {
  const list = document.getElementById('expList');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res = await Api.getExperience();
    const items = res.data || [];
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = '<p class="empty-state">No experience records yet.</p>'; return; }
    items.forEach(x => {
      const period = `${x.startDate || ''} — ${x.current ? 'Present' : (x.endDate || '')}`;
      list.appendChild(itemRow(
        `${x.jobTitle} · ${x.company}`,
        `${period}${x.location ? ' · ' + x.location : ''}`,
        x.technologies,
        () => fillExpForm(x),
        () => deleteExperience(x._id)
      ));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${esc(err.message)}</p>`;
  }
}

function resetExpForm() {
  const form = document.getElementById('expForm');
  if (form) form.reset();
  setVal('expId', '');
  setText('expFormTitle', 'Add Experience');
  setText('expSubmitBtn', 'Add Experience');
  const cancelBtn = document.getElementById('expCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  setError('expError', '');
}

function fillExpForm(x) {
  setVal('expId', x._id);
  setVal('expJobTitle', x.jobTitle || '');
  setVal('expCompany', x.company || '');
  setVal('expLocation', x.location || '');
  setVal('expEmploymentType', x.employmentType || '');
  setVal('expStartDate', x.startDate || '');
  setVal('expEndDate', x.endDate || '');
  setChecked('expCurrent', x.current);
  setVal('expDescription', x.description || '');
  setVal('expResponsibilities', joinCsv(x.responsibilities));
  setVal('expTechnologies', joinCsv(x.technologies));
  setVal('expOrder', x.order || 0);
  setText('expFormTitle', 'Edit Experience');
  setText('expSubmitBtn', 'Update Experience');
  const cancelBtn = document.getElementById('expCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteExperience(id) {
  if (!confirm('Delete this experience record?')) return;
  try {
    await Api.deleteExperience(id);
    showToast('Experience deleted.');
    loadExperience();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initExperience() {
  on('expForm', 'submit', async (e) => {
    e.preventDefault();
    setError('expError', '');
    const id = getVal('expId');
    const data = {
      jobTitle: getVal('expJobTitle'),
      company: getVal('expCompany'),
      location: getVal('expLocation'),
      employmentType: getVal('expEmploymentType'),
      startDate: getVal('expStartDate'),
      endDate: getVal('expEndDate'),
      current: getChecked('expCurrent'),
      description: getVal('expDescription'),
      responsibilities: splitCsv(getVal('expResponsibilities')),
      technologies: splitCsv(getVal('expTechnologies')),
      order: Number(getVal('expOrder')) || 0,
    };
    try {
      if (id) { await Api.updateExperience(id, data); showToast('Experience updated.'); }
      else { await Api.createExperience(data); showToast('Experience added.'); }
      resetExpForm();
      loadExperience();
    } catch (err) {
      setError('expError', err.message);
    }
  });
  on('expCancelBtn', 'click', resetExpForm);
}

/* =========================================================
   EDUCATION
   ========================================================= */

async function loadEducation() {
  const list = document.getElementById('eduList');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res = await Api.getEducation();
    const items = res.data || [];
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = '<p class="empty-state">No education records yet.</p>'; return; }
    items.forEach(x => {
      const period = `${x.startDate || ''} — ${x.endDate || ''}`;
      list.appendChild(itemRow(
        x.degree,
        `${x.institution}${x.location ? ' · ' + x.location : ''} · ${period}`,
        [],
        () => fillEduForm(x),
        () => deleteEducation(x._id)
      ));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${esc(err.message)}</p>`;
  }
}

function resetEduForm() {
  const form = document.getElementById('eduForm');
  if (form) form.reset();
  setVal('eduId', '');
  setText('eduFormTitle', 'Add Education');
  setText('eduSubmitBtn', 'Add Education');
  const cancelBtn = document.getElementById('eduCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  setError('eduError', '');
}

function fillEduForm(x) {
  setVal('eduId', x._id);
  setVal('eduDegree', x.degree || '');
  setVal('eduInstitution', x.institution || '');
  setVal('eduLocation', x.location || '');
  setVal('eduGrade', x.grade || '');
  setVal('eduStartDate', x.startDate || '');
  setVal('eduEndDate', x.endDate || '');
  setVal('eduDescription', x.description || '');
  setVal('eduOrder', x.order || 0);
  setText('eduFormTitle', 'Edit Education');
  setText('eduSubmitBtn', 'Update Education');
  const cancelBtn = document.getElementById('eduCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteEducation(id) {
  if (!confirm('Delete this education record?')) return;
  try {
    await Api.deleteEducation(id);
    showToast('Education deleted.');
    loadEducation();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initEducation() {
  on('eduForm', 'submit', async (e) => {
    e.preventDefault();
    setError('eduError', '');
    const id = getVal('eduId');
    const data = {
      degree: getVal('eduDegree'),
      institution: getVal('eduInstitution'),
      location: getVal('eduLocation'),
      grade: getVal('eduGrade'),
      startDate: getVal('eduStartDate'),
      endDate: getVal('eduEndDate'),
      description: getVal('eduDescription'),
      order: Number(getVal('eduOrder')) || 0,
    };
    try {
      if (id) { await Api.updateEducation(id, data); showToast('Education updated.'); }
      else { await Api.createEducation(data); showToast('Education added.'); }
      resetEduForm();
      loadEducation();
    } catch (err) {
      setError('eduError', err.message);
    }
  });
  on('eduCancelBtn', 'click', resetEduForm);
}

/* =========================================================
   COURSES
   ========================================================= */

async function loadCourses() {
  const list = document.getElementById('courseList');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const res = await Api.getCourses();
    const items = res.data || [];
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = '<p class="empty-state">No courses added yet.</p>'; return; }
    items.forEach(x => {
      list.appendChild(itemRow(
        x.courseName,
        x.institution,
        x.certificateUrl ? ['Certificate ✓'] : [],
        () => fillCourseForm(x),
        () => deleteCourse(x._id)
      ));
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${esc(err.message)}</p>`;
  }
}

function resetCourseForm() {
  const form = document.getElementById('courseForm');
  if (form) form.reset();
  setVal('courseId', '');
  setText('courseFormTitle', 'Add Course');
  setText('courseSubmitBtn', 'Add Course');
  const cancelBtn = document.getElementById('courseCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  setError('courseError', '');
}

function fillCourseForm(x) {
  setVal('courseId', x._id);
  setVal('courseName', x.courseName || '');
  setVal('courseInstitution', x.institution || '');
  setVal('courseDescription', x.description || '');
  setVal('courseCertificateUrl', x.certificateUrl || '');
  setVal('courseOrder', x.order || 0);
  setText('courseFormTitle', 'Edit Course');
  setText('courseSubmitBtn', 'Update Course');
  const cancelBtn = document.getElementById('courseCancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCourse(id) {
  if (!confirm('Delete this course?')) return;
  try {
    await Api.deleteCourse(id);
    showToast('Course deleted.');
    loadCourses();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function initCourses() {
  on('courseForm', 'submit', async (e) => {
    e.preventDefault();
    setError('courseError', '');
    const id = getVal('courseId');
    const data = {
      courseName: getVal('courseName'),
      institution: getVal('courseInstitution'),
      description: getVal('courseDescription'),
      certificateUrl: getVal('courseCertificateUrl'),
      order: Number(getVal('courseOrder')) || 0,
    };
    try {
      if (id) { await Api.updateCourse(id, data); showToast('Course updated.'); }
      else { await Api.createCourse(data); showToast('Course added.'); }
      resetCourseForm();
      loadCourses();
    } catch (err) {
      setError('courseError', err.message);
    }
  });
  on('courseCancelBtn', 'click', resetCourseForm);
}

/* =========================================================
   SETTINGS
   ========================================================= */

function initSettings() {
  on('pwForm', 'submit', async (e) => {
    e.preventDefault();
    setError('pwError', '');
    const currentPassword = getVal('pwCurrent');
    const newPassword = getVal('pwNew');
    try {
      await Api.changePassword(currentPassword, newPassword);
      const form = document.getElementById('pwForm');
      if (form) form.reset();
      showToast('Password updated.');
    } catch (err) {
      setError('pwError', err.message);
    }
  });

  on('apiBaseSaveBtn', 'click', () => {
    const val = getVal('apiBaseInput').trim();
    if (!val) return;
    window.setApiBase(val);
    showToast('API URL saved. Reloading…');
    setTimeout(() => window.location.reload(), 800);
  });
}

/* =========================================================
   BOOT
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initSidebar();
  initProfile();
  initProjects();
  initSkills();
  initExperience();
  initEducation();
  initCourses();
  initSettings();

  if (Auth.isLoggedIn()) {
    showDashboard();
  } else {
    showLogin();
  }
});
