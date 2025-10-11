// src/config/api.js  (JavaScript, bukan TS)

// --- Base URL (ambil dari env/browser, fallback ke dev local) ---
const RAW_BASE =
(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||  
(typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) ||
  'http://localhost:8000/api';

function normalizeBase(u) {
  return String(u || '').replace(/\/+$/, ''); // buang trailing slash
}

export const BASE_URL = normalizeBase(RAW_BASE);

// --- Token helpers ---
export function getStoredToken() {
  try {
    const ui = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      ui.token ||
      ''
    );
  } catch {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      ''
    );
  }
}

export function setToken(token) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('token', token || '');
  }
}

export function authHeaders(token = getStoredToken()) {
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// --- URL & query helpers ---
function joinUrl(base, path) {
  const p = String(path || '');
  return `${base}${p.startsWith('/') ? '' : '/'}${p}`;
}

function buildQuery(query) {
  if (!query) return '';
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((vv) => qs.append(k, String(vv)));
    else qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// --- Error class agar gampang di-handle di UI ---
export class ApiError extends Error {
  constructor(message, { status, data, url } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? 0;
    this.data = data;
    this.url = url;
  }
}

// --- Parser aman ---
function safeJsonParse(s) {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

// --- Client utama ---
export async function api(
  path,
  {
    method = 'GET',
    body,
    token = getStoredToken(),
    headers = {},
    query,
    timeout = 15000, // 15s
    retries = 0,     // auto-retry utk 429/503
  } = {}
) {
  const url = joinUrl(BASE_URL, path) + buildQuery(query);

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeout);

  const finalHeaders = {
    ...authHeaders(token),
    ...headers,
  };

  // Siapkan payload & Content-Type (jangan set utk FormData/Blob)
  let payload;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData || body instanceof Blob) {
      payload = body; // biarkan browser set header
    } else if (typeof body === 'string') {
      payload = body;
      if (!finalHeaders['Content-Type'])
        finalHeaders['Content-Type'] = 'text/plain;charset=UTF-8';
    } else {
      payload = JSON.stringify(body);
      if (!finalHeaders['Content-Type'])
        finalHeaders['Content-Type'] = 'application/json';
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      signal: ctrl.signal,
    });

    const ctype = res.headers.get('content-type') || '';
    const isJson = ctype.includes('application/json');
    const text = res.status !== 204 ? await res.text() : '';
    const data = isJson ? safeJsonParse(text) : text;

    if (!res.ok) {
      // Retry sederhana utk 429/503
      if (retries > 0 && (res.status === 429 || res.status === 503)) {
        const wait =
          (parseInt(res.headers.get('retry-after') || '1', 10) || 1) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        return api(path, {
          method,
          body,
          token,
          headers,
          query,
          timeout,
          retries: retries - 1,
        });
      }

      const msg =
        (isJson && data && typeof data === 'object' && data.message) ||
        `HTTP ${res.status} ${res.statusText}`;
      throw new ApiError(msg, { status: res.status, data, url });
    }

    return isJson ? data ?? null : text;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out', { status: 0, url });
    }
    throw err;
  } finally {
    clearTimeout(to);
  }
}

// --- Helper metode ringkas ---
export const get = (path, opts = {}) => api(path, { ...opts, method: 'GET' });
export const post = (path, body, opts = {}) =>
  api(path, { ...opts, method: 'POST', body });
export const put = (path, body, opts = {}) =>
  api(path, { ...opts, method: 'PUT', body });
export const patch = (path, body, opts = {}) =>
  api(path, { ...opts, method: 'PATCH', body });
export const del = (path, opts = {}) =>
  api(path, { ...opts, method: 'DELETE' });
