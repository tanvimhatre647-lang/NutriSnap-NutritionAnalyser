// NutriSnap Utilities

// Auto-detect backend URL:
// - In production: set window.NUTRISNAP_API_URL before this script loads
// - Falls back to localhost for local development
const API_BASE_URL = (window.NUTRISNAP_API_URL || 'http://localhost:5000') + '/api';

// Spoonacular (Food API) helper
// NOTE: Storing an API key in client-side JS is insecure; this is for quick prototyping only.
const SPOONACULAR_API_KEY = 'e8ece78e99be4d9eb876249cab52ead2';
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

function spoonacularFetch(path, params) {
  params = params || {};
  params.apiKey = SPOONACULAR_API_KEY;
  var query = new URLSearchParams(params).toString();
  return fetch(SPOONACULAR_BASE_URL + path + '?' + query).then(function(res) {
    if (!res.ok) {
      return res.text().then(function(text) {
        throw new Error('Spoonacular API error: ' + res.status + ' ' + (text || res.statusText));
      });
    }
    return res.json();
  });
}

async function analyzeImageWithSpoonacular(file) {
  var formData = new FormData();
  formData.append('file', file);
  var url = SPOONACULAR_BASE_URL + '/food/images/analyze?apiKey=' + encodeURIComponent(SPOONACULAR_API_KEY);
  var res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    var errText = await res.text();
    throw new Error('Spoonacular analyze error: ' + res.status + ' ' + (errText || res.statusText));
  }
  return res.json();
}

function guessNutritionFromName(foodName) {
  return spoonacularFetch('/recipes/guessNutrition', { title: foodName });
}

// ── API fetch helper ──────────────────────────────────────────────────────────
async function apiFetch(endpoint, options) {
  options = options || {};

  // Get token - always stored as a plain string, never JSON-encoded
  var token = localStorage.getItem('nutrisnap_token');
  if (token && token.charAt(0) === '"') {
    token = JSON.parse(token); // strip accidental JSON quotes
  }

  // Build headers - NEVER set Content-Type manually when body is FormData
  var headers = {};
  if (options.headers) {
    for (var key in options.headers) {
      if (options.headers.hasOwnProperty(key)) {
        if (key.toLowerCase() === 'content-type' && options.body instanceof FormData) {
          continue; // skip - browser must set this automatically for multipart
        }
        headers[key] = options.headers[key];
      }
    }
  }
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  var config = Object.assign({}, options, { headers: headers });

  try {
    var response = await fetch(API_BASE_URL + endpoint, config);
    if (response.status === 204) return null;
    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.indexOf('fetch') !== -1) {
      throw new Error('Cannot reach server. Make sure the backend is running on http://localhost:5000');
    }
    throw error;
  }
}

// ── Notification ──────────────────────────────────────────────────────────────
function showNotification(message, type) {
  type = type || 'info';
  var notification = document.createElement('div');
  var colors = { success: '#4CAF50', error: '#F44336', warning: '#FF9800', info: '#2196F3' };
  notification.style.cssText = 'position:fixed;top:100px;right:20px;padding:1rem 1.5rem;border-radius:8px;color:white;font-weight:600;z-index:10000;box-shadow:0 4px 15px rgba(0,0,0,0.2);transform:translateX(400px);transition:transform 0.3s ease;background:' + (colors[type] || colors.info);
  notification.innerHTML = '<span>' + message + '</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:1rem;font-size:1.2rem">&times;</button>';
  document.body.appendChild(notification);
  setTimeout(function() { notification.style.transform = 'translateX(0)'; }, 50);
  setTimeout(function() {
    if (notification.parentElement) {
      notification.style.transform = 'translateX(400px)';
      setTimeout(function() { if (notification.parentElement) notification.remove(); }, 300);
    }
  }, 5000);
}

// ── Loading state ─────────────────────────────────────────────────────────────
function showLoading(element, text) {
  text = text || 'Loading...';
  element.dataset.originalContent = element.innerHTML;
  element.disabled = true;
  element.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.5rem"><span style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;display:inline-block;animation:spin 1s linear infinite"></span>' + text + '</span>';
  if (!document.getElementById('ns-spin-style')) {
    var s = document.createElement('style');
    s.id = 'ns-spin-style';
    s.textContent = '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
}

function hideLoading(element) {
  if (element.dataset.originalContent !== undefined) {
    element.innerHTML = element.dataset.originalContent;
    element.disabled = false;
    delete element.dataset.originalContent;
  }
}

// ── Local storage helpers ─────────────────────────────────────────────────────
function saveToLocalStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.error(e); }
}

function getFromLocalStorage(key) {
  try {
    var val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch(e) { return null; }
}

// ── File upload helper ────────────────────────────────────────────────────────
function initializeFileUpload(uploadZone, fileInput, callback) {
  if (!uploadZone || !fileInput) return;

  uploadZone.addEventListener('click', function() { fileInput.click(); });

  uploadZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', function() {
    uploadZone.classList.remove('dragover');
  });
  uploadZone.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0], uploadZone, callback);
  });
  fileInput.addEventListener('change', function(e) {
    if (e.target.files.length > 0) handleFileSelect(e.target.files[0], uploadZone, callback);
  });
}

function handleFileSelect(file, uploadZone, callback) {
  var validTypes = ['image/jpeg','image/jpg','image/png','image/webp'];
  if (validTypes.indexOf(file.type) === -1) {
    showNotification('Please select a valid image (JPEG, PNG, WebP)', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showNotification('File size must be under 5MB', 'error');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    uploadZone.innerHTML = '<img src="' + e.target.result + '" alt="Preview" style="max-width:200px;max-height:200px;border-radius:8px;margin-bottom:1rem"><p style="color:var(--text-dark);font-weight:600">' + file.name + '</p><p style="color:var(--text-light);font-size:0.9rem">Click to change image</p>';
    if (callback) callback(file, e.target.result);
  };
  reader.readAsDataURL(file);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function initializeNavigation() {
  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() { navMenu.classList.toggle('active'); });
    var navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() { navMenu.classList.remove('active'); });
    });
  }
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var allLinks = document.querySelectorAll('.nav-link');
  allLinks.forEach(function(link) {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
    else link.classList.remove('active');
  });
  var authStatus = localStorage.getItem('nutrisnap_auth');
  var isAuth = (authStatus === 'true');
  var dashLinks = document.querySelectorAll('.dashboard-nav-link');
  dashLinks.forEach(function(link) {
    link.style.display = isAuth ? 'block' : 'none';
  });
}

// ── Animation ─────────────────────────────────────────────────────────────────
function animateOnScroll() {
  var elements = document.querySelectorAll('.fade-in-up');
  if (!('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  elements.forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// ── BMI ───────────────────────────────────────────────────────────────────────
function calculateBMI(weight, height) {
  var heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return { category: 'Underweight', color: '#2196F3' };
  if (bmi < 25)   return { category: 'Normal weight', color: '#4CAF50' };
  if (bmi < 30)   return { category: 'Overweight', color: '#FF9800' };
  return { category: 'Obese', color: '#F44336' };
}

// ── RDA ───────────────────────────────────────────────────────────────────────
function calculateRDA(age, gender, weight, height, activityLevel) {
  var bmr;
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  var multipliers = { sedentary:1.2, 'lightly-active':1.375, 'moderately-active':1.55, 'very-active':1.725, 'extra-active':1.9 };
  var calories = Math.round(bmr * (multipliers[activityLevel] || 1.2));
  return {
    calories: calories,
    protein:  Math.round(calories * 0.15 / 4),
    carbs:    Math.round(calories * 0.55 / 4),
    fat:      Math.round(calories * 0.30 / 9),
    fiber:    Math.round(calories / 1000 * 14),
    water:    Math.round(weight * 35)
  };
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function createProgressBar(container, label, value, maxValue, color) {
  var pct = Math.min((value / maxValue) * 100, 100).toFixed(1);
  var icons = { Calories:'fire', Protein:'meat-on-bone', Carbs:'bread', Fat:'avocado', Fiber:'sheaf-of-rice' };
  var units = { Calories:' kcal', Protein:'g', Carbs:'g', Fat:'g', Fiber:'g' };
  var el = document.createElement('div');
  el.className = 'macro-item';
  el.innerHTML = '<div style="display:flex;align-items:center"><div class="macro-icon" style="background:' + color + ';margin-right:1rem">' + (icons[label]||'📊') + '</div><div><div style="font-weight:600;color:var(--text-dark)">' + label + '</div><div style="font-size:0.9rem;color:var(--text-light)">' + value + (units[label]||'') + ' / ' + maxValue + (units[label]||'') + '</div></div></div><div style="min-width:100px"><div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;background:' + color + '"></div></div><div style="text-align:center;font-size:0.875rem;color:var(--text-light)">' + pct + '%</div></div>';
  container.appendChild(el);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  animateOnScroll();
});

window.NutriSnapUtils = {
  apiFetch: apiFetch,
  showNotification: showNotification,
  showLoading: showLoading,
  hideLoading: hideLoading,
  saveToLocalStorage: saveToLocalStorage,
  getFromLocalStorage: getFromLocalStorage,
  initializeFileUpload: initializeFileUpload,
  initializeNavigation: initializeNavigation,
  animateOnScroll: animateOnScroll,
  calculateBMI: calculateBMI,
  getBMICategory: getBMICategory,
  calculateRDA: calculateRDA,
  createProgressBar: createProgressBar,
  // Spoonacular helpers
  spoonacularFetch: spoonacularFetch,
  analyzeImageWithSpoonacular: analyzeImageWithSpoonacular,
  guessNutritionFromName: guessNutritionFromName,
  API_BASE_URL: API_BASE_URL,
  SPOONACULAR_API_KEY: SPOONACULAR_API_KEY,
  SPOONACULAR_BASE_URL: SPOONACULAR_BASE_URL
};
