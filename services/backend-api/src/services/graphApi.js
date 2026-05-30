import opossum from 'opossum';
import { config } from '../config.js';
import logger from '../middleware/logger.js';

function graphBaseUrl() {
  return `https://graph.facebook.com/${config.graphVersion}`;
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`;
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

// Hàm cốt lõi thực thi HTTP request
async function executeRequest({ method, path, params = {}, body = null }) {
  const url = new URL(`${graphBaseUrl()}${normalizePath(path)}`);
  
  const searchParams = { ...params };
  if (method === 'GET' || method === 'DELETE') {
    searchParams.access_token = config.accessToken;
  }
  
  if (method === 'POST') {
    url.search = toSearchParams({ access_token: config.accessToken }).toString();
  } else {
    url.search = toSearchParams(searchParams).toString();
  }

  const options = {
    method,
    headers: {}
  };

  if (method === 'POST' && body) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = toSearchParams(body).toString();
  }

  logger.info(`Sending ${method} request to Facebook API: ${path} (params: ${JSON.stringify(params)})`);
  
  const startTime = Date.now();
  const res = await fetch(url, options);
  const duration = Date.now() - startTime;
  
  const data = await res.json();
  
  if (data.error) {
    logger.error(`Facebook API error on ${method} ${path} (${duration}ms): ${JSON.stringify(data.error)}`);
    const status = mapGraphErrorToStatus(data.error);
    const err = new Error(data.error.message || 'Graph API error');
    err.status = status;
    err.graphError = data.error;
    throw err;
  }

  logger.info(`Facebook API response on ${method} ${path} (${duration}ms): Success`);
  return data;
}

// Cấu hình Circuit Breaker
const options = {
  timeout: 10000, // Timeout sau 10s
  errorThresholdPercentage: 50, // Mở mạch nếu 50% request thất bại
  resetTimeout: 30000 // Chờ 30s trước khi thử half-open
};

const breaker = new opossum(executeRequest, options);

breaker.on('open', () => logger.warn('[Circuit Breaker] Facebook API circuit opened!'));
breaker.on('close', () => logger.info('[Circuit Breaker] Facebook API circuit closed.'));
breaker.on('halfOpen', () => logger.info('[Circuit Breaker] Facebook API circuit half-open.'));
breaker.on('fallback', () => logger.error('[Circuit Breaker] Fallback triggered!'));

// Wrapper gọi qua circuit breaker
export async function graphGet(path, params = {}) {
  return breaker.fire({ method: 'GET', path, params });
}

export async function graphPost(path, body = {}) {
  return breaker.fire({ method: 'POST', path, body });
}

export async function graphDelete(path) {
  return breaker.fire({ method: 'DELETE', path });
}
