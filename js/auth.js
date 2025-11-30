// Simple REST API helper with JWT auth
(() => {
  const API_BASE = (() => {
    try {
      const params = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : ''));
      const fromQuery = params.get('api') || params.get('apiBase');
      if (fromQuery) {
        try { localStorage.setItem('apiBase', fromQuery); } catch(_) {}
        return fromQuery;
      }
    } catch(_) {}
    try {
      const meta = (typeof document !== 'undefined') ? document.querySelector('meta[name="api-base"]') : null;
      const metaVal = meta && meta.getAttribute('content');
      if (metaVal) {
        try { localStorage.setItem('apiBase', metaVal); } catch(_) {}
        return metaVal;
      }
    } catch(_) {}
    const origin = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
    try {
      const saved = localStorage.getItem('apiBase');
      if (saved) return saved;
    } catch(_) {}
    if (typeof window !== 'undefined' && window.API_BASE) return window.API_BASE;
    return origin;
  })();

  async function request(path, options = {}) {
    const { method = 'GET', headers = {}, body = null, params = {} } = options;
    const base = String(API_BASE || '').replace(/\/$/, '');
    const p = String(path || '');
    const url = new URL(base + (p.startsWith('/') ? p : '/' + p));
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const finalHeaders = { 'Content-Type': 'application/json', ...headers };
    if (auth?.token) finalHeaders['Authorization'] = 'Bearer ' + auth.token;

    const res = await fetch(url.toString(), {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : null,
    });

    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }

    if (!res.ok) {
      const errMsg = (data && (data.error || data.message)) || (res.status === 401 ? 'Unauthorized' : 'Request failed');
      throw new Error(errMsg);
    }
    return data;
  }

  const API = {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    loginWithUsername: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    suppliers: {
      list: (params = {}) => request('/suppliers', { params }),
      get: (id) => request(`/suppliers/${id}`),
      create: (payload) => request('/suppliers', { method: 'POST', body: payload }),
      update: (id, payload) => request(`/suppliers/${id}`, { method: 'PUT', body: payload }),
      remove: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),
    },
    requests: {
      list: (params = {}) => request('/requests', { params }),
      create: (payload) => request('/requests', { method: 'POST', body: payload }),
      update: (id, payload) => request(`/requests/${id}`, { method: 'PUT', body: payload }),
      remove: (id) => request(`/requests/${id}`, { method: 'DELETE' }),
    },
    notifications: {
      list: (params = {}) => request('/notifications', { params }),
      create: (payload) => request('/notifications', { method: 'POST', body: payload }),
      update: (id, payload) => request(`/notifications/${id}`, { method: 'PUT', body: payload }),
    },
    payments: {
      list: (params = {}) => request('/payments', { params }),
      create: (payload) => request('/payments', { method: 'POST', body: payload }),
    },
    uploads: {
      uploadInvoice: (data, name) => request('/uploads/invoice', { method: 'POST', body: { data, name } }),
    },
    metrics: {
      get: () => request('/metrics'),
      visit: () => request('/metrics/visit', { method: 'POST' }),
    },
    admin: {
      users: () => request('/auth/users'),
      removeUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),
    },
  };

  window.API = API;
})();

document.addEventListener('DOMContentLoaded', function(){
  var form = document.getElementById('loginForm');
  var alertBox = document.getElementById('alertMessage');
  var btn = document.getElementById('loginBtn');
  function showError(msg){
    if (alertBox){
      alertBox.textContent = msg || '';
      alertBox.style.display = msg ? 'block' : 'none';
    }
  }
  if (form){
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      var emailInput = document.getElementById('email');
      var passwordInput = document.getElementById('password');
      var identity = emailInput ? String(emailInput.value || '').trim() : '';
      var password = passwordInput ? String(passwordInput.value || '').trim() : '';
      showError('');
      if (btn){ btn.disabled = true; btn.classList.add('disabled'); }
      try {
        var resp;
        if (identity.indexOf('@') !== -1) {
          resp = await API.login(identity, password);
        } else {
          resp = await API.loginWithUsername(identity, password);
        }
        try {
          localStorage.setItem('auth', JSON.stringify({ token: resp.token }));
          var uname = (resp.user && resp.user.username) ? resp.user.username : (resp.user && resp.user.email ? String(resp.user.email).split('@')[0] : '');
          localStorage.setItem('currentUser', JSON.stringify({ name: uname, email: resp.user && resp.user.email, role: resp.user && resp.user.role }));
        } catch(_) {}
        window.location.href = 'home.html';
      } catch (err) {
        showError(err && err.message ? err.message : 'حدث خطأ أثناء تسجيل الدخول');
      } finally {
        if (btn){ btn.disabled = false; btn.classList.remove('disabled'); }
      }
    });
  }
});
