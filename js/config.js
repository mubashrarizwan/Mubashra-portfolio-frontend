/**
 * Global config
 * ---------------------------------------------------------
 * Change API_BASE_URL to point at your running backend.
 * Local dev default matches server.js (PORT=5000).
 * In production, set this to your deployed API URL
 * (e.g. by calling setApiBase('https://your-api.com') once
 * from the browser console, or editing the default below).
 * ---------------------------------------------------------
 */
window.APP_CONFIG = {
  API_BASE_URL: localStorage.getItem('api_base_url') || 'https://api.mubashrarizwan.dev',
};

window.getApiBase = function () {
  return localStorage.getItem('api_base_url') || window.APP_CONFIG.API_BASE_URL;
};

window.setApiBase = function (url) {
  localStorage.setItem('api_base_url', url.replace(/\/$/, ''));
};

// Resolves a relative path returned by the backend (e.g. "uploads/xyz.jpg")
// into a full URL against the current API base. Absolute URLs pass through.
window.assetUrl = function (path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (/^data:/i.test(path)) return path;
  return `${window.getApiBase()}/${path.replace(/^\//, '')}`;
};