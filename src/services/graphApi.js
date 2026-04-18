import { config } from '../config.js';

function graphBaseUrl() {
  return `https://graph.facebook.com/${config.graphVersion}`;
}

function normalizePath(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return p;
}

function toSearchParams(params) {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) out.append(key, String(v));
    } else {
      out.append(key, String(value));
    }
  }
  return out;
}

function mapGraphErrorToStatus(graphError) {
  const code = graphError?.code;
  if (code === 190 || code === 102) return 401;
  if (code === 10 || code === 200) return 403;
  if (code === 100) return 400;
  return 502;
}

export async function graphGet(path, params = {}) {
  const url = new URL(`${graphBaseUrl()}${normalizePath(path)}`);
  const search = toSearchParams({ ...params, access_token: config.accessToken });
  url.search = search.toString();

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    const status = mapGraphErrorToStatus(data.error);
    const err = new Error(data.error.message || 'Graph API error');
    err.status = status;
    err.graphError = data.error;
    throw err;
  }

  return data;
}

export async function graphPost(path, body = {}) {
  const url = new URL(`${graphBaseUrl()}${normalizePath(path)}`);
  url.search = toSearchParams({ access_token: config.accessToken }).toString();

  const form = toSearchParams(body);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const data = await res.json();

  if (data.error) {
    const status = mapGraphErrorToStatus(data.error);
    const err = new Error(data.error.message || 'Graph API error');
    err.status = status;
    err.graphError = data.error;
    throw err;
  }

  return data;
}

export async function graphDelete(path) {
  const url = new URL(`${graphBaseUrl()}${normalizePath(path)}`);
  url.search = toSearchParams({ access_token: config.accessToken }).toString();

  const res = await fetch(url, { method: 'DELETE' });
  const data = await res.json();

  if (data.error) {
    const status = mapGraphErrorToStatus(data.error);
    const err = new Error(data.error.message || 'Graph API error');
    err.status = status;
    err.graphError = data.error;
    throw err;
  }

  return data;
}
