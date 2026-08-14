// ============================================================
//  NutriSnap Configuration
//  Set to 'http://localhost:5000' for local dev, or your production backend URL
// ============================================================
const isLocalhostHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.NUTRISNAP_API_URL = isLocalhostHost ? 'http://localhost:5000' : window.location.origin;


