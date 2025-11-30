// Simple REST API helper with JWT auth and query params
(() => {
  const API_BASE = (() => {
    try {
      const params = new URLSearchParams((typeof window !== 'undefined' ? window.location.search : ''));
      const fromQuery = params.get('api') || params.get('apiBase');
      if (fromQuery) {
        localStorage.setItem('apiBase', fromQuery);
        return fromQuery;
      }
    } catch(_) {}
    const saved = localStorage.getItem('apiBase');
    if (saved) return saved;
    const origin = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
    if (origin.includes('4000') || origin.includes('4001')) return origin;
    if (typeof window !== 'undefined' && window.API_BASE) return window.API_BASE;
    return origin;
  })();

  async function request(path, options = {}) {
    const { method = 'GET', headers = {}, body = null, params = {} } = options;
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const finalHeaders = { 'Content-Type': 'application/json', ...headers };
    if (auth?.token) finalHeaders['Authorization'] = 'Bearer ' + auth.token;

    const origin = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
    const saved = localStorage.getItem('apiBase') || '';
    const primaryBase = (saved && saved !== origin) ? saved : API_BASE;

    const buildUrl = (base, p, withApiPrefix) => {
      const u = new URL((withApiPrefix ? base + '/api' + p : base + p));
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          u.searchParams.set(key, value);
        }
      });
      return u.toString();
    };

    const candidates = [
      { base: primaryBase, apiPrefix: false },
      { base: primaryBase, apiPrefix: true },
      { base: origin, apiPrefix: false },
      { base: origin, apiPrefix: true },
    ];

    let res = null;
    let data = null;
    let ok = false;
    let status = 0;
    for (let i = 0; i < candidates.length; i++) {
      const urlStr = buildUrl(candidates[i].base, path, candidates[i].apiPrefix);
      try {
        res = await fetch(urlStr, { method, headers: finalHeaders, body: body ? JSON.stringify(body) : null });
        status = res.status;
        try { data = await res.json(); } catch (e) { data = null; }
        ok = !!res && res.ok;
        if (ok) break;
      } catch(_) {
        ok = false;
        status = 0;
      }
    }
    
    try { data = data ?? null; } catch (e) { data = null; }

    if (!ok) {
      if (status === 401) {
        const errMsg = (data && (data.error || data.message)) || 'Unauthorized';
        throw new Error(errMsg);
      }
      const errMsg = (data && (data.error || data.message)) || 'Request failed';
      throw new Error(errMsg);
    }
    return data;
  }

  const API = {
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
    loginWithUsername: (username, password) => request('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),
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
