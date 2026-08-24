/**
 * admin/js/api.js
 * ---------------------------------------------------------
 * Thin wrapper around the portfolio backend's REST API.
 * Relies on window.getApiBase() / window.setApiBase() from
 * ../../js/config.js (loaded before this file).
 * ---------------------------------------------------------
 */

const TOKEN_KEY = 'admin_token';
const ADMIN_KEY = 'admin_user';

const Auth = {
  getToken() { return localStorage.getItem(TOKEN_KEY); },
  setToken(token) { localStorage.setItem(TOKEN_KEY, token); },
  clearToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ADMIN_KEY); },
  isLoggedIn() { return !!localStorage.getItem(TOKEN_KEY); },
  getAdmin() {
    try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null'); } catch (e) { return null; }
  },
  setAdmin(admin) { localStorage.setItem(ADMIN_KEY, JSON.stringify(admin)); },
};

/**
 * Core request helper. Throws an Error with a readable message on failure.
 */
async function apiRequest(path, { method = 'GET', body, isFormData = false, auth = false } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${window.getApiBase()}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the backend. Is it running and is the API URL correct?');
  }

  let json = null;
  try { json = await res.json(); } catch (e) { /* no body */ }

  if (res.status === 401 && auth) {
    // Token missing/expired — force back to login.
    Auth.clearToken();
  }

  if (!res.ok) {
    const message = (json && json.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

const Api = {
  // ---------- Auth ----------
  login(username, password) {
    return apiRequest('/api/auth/login', { method: 'POST', body: { username, password } });
  },
  logout() {
    return apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
  },
changePassword(currentPassword, newPassword) {
  return apiRequest('/api/auth/change-password', {
    method: 'PUT',
    auth: true,
    body: { currentPassword, newPassword }
  });
},

  // ---------- Profile ----------
  getProfile() { return apiRequest('/api/profile'); },
  updateProfile(data) { return apiRequest('/api/profile', { method: 'PUT', auth: true, body: data }); },
  uploadProfilePicture(file) {
    const fd = new FormData();
    fd.append('picture', file);
    return apiRequest('/api/profile/picture', { method: 'POST', auth: true, isFormData: true, body: fd });
  },
  deleteProfilePicture() {
    return apiRequest('/api/profile/picture', { method: 'DELETE', auth: true });
  },
  uploadResume(file) {
    const fd = new FormData();
    fd.append('resume', file);
    return apiRequest('/api/profile/resume', { method: 'POST', auth: true, isFormData: true, body: fd });
  },
  deleteResume() {
    return apiRequest('/api/profile/resume', { method: 'DELETE', auth: true });
  },

  // ---------- Projects ----------
  getProjects() { return apiRequest('/api/projects'); },
  createProject(data) { return apiRequest('/api/projects', { method: 'POST', auth: true, body: data }); },
  updateProject(id, data) { return apiRequest(`/api/projects/${id}`, { method: 'PUT', auth: true, body: data }); },
  deleteProject(id) { return apiRequest(`/api/projects/${id}`, { method: 'DELETE', auth: true }); },
  uploadProjectImages(id, files) {
    const fd = new FormData();
    Array.from(files).forEach((file) => fd.append('images', file));
    return apiRequest(`/api/projects/${id}/images`, { method: 'POST', auth: true, isFormData: true, body: fd });
  },
  deleteProjectImage(id, index) {
    return apiRequest(`/api/projects/${id}/images/${index}`, { method: 'DELETE', auth: true });
  },

  // ---------- Skills ----------
  getSkills() { return apiRequest('/api/skills'); },
  createSkill(data) { return apiRequest('/api/skills', { method: 'POST', auth: true, body: data }); },
  updateSkill(id, data) { return apiRequest(`/api/skills/${id}`, { method: 'PUT', auth: true, body: data }); },
  deleteSkill(id) { return apiRequest(`/api/skills/${id}`, { method: 'DELETE', auth: true }); },

  // ---------- Education ----------
  getEducation() { return apiRequest('/api/education'); },
  createEducation(data) { return apiRequest('/api/education', { method: 'POST', auth: true, body: data }); },
  updateEducation(id, data) { return apiRequest(`/api/education/${id}`, { method: 'PUT', auth: true, body: data }); },
  deleteEducation(id) { return apiRequest(`/api/education/${id}`, { method: 'DELETE', auth: true }); },

  // ---------- Experience ----------
  getExperience() { return apiRequest('/api/experience'); },
  createExperience(data) { return apiRequest('/api/experience', { method: 'POST', auth: true, body: data }); },
  updateExperience(id, data) { return apiRequest(`/api/experience/${id}`, { method: 'PUT', auth: true, body: data }); },
  deleteExperience(id) { return apiRequest(`/api/experience/${id}`, { method: 'DELETE', auth: true }); },

  // ---------- Courses ----------
  getCourses() { return apiRequest('/api/courses'); },
  createCourse(data) { return apiRequest('/api/courses', { method: 'POST', auth: true, body: data }); },
  updateCourse(id, data) { return apiRequest(`/api/courses/${id}`, { method: 'PUT', auth: true, body: data }); },
  deleteCourse(id) { return apiRequest(`/api/courses/${id}`, { method: 'DELETE', auth: true }); },
};
