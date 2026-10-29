// Single place that knows how to talk to the API: optional bearer token, JSON in/out, AbortSignal, structured errors.
// It never retries commands on its own (a retry of a command must reuse the SAME Idempotency-Key, decided by the caller).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? null;
    this.requestId = body?.requestId ?? null;
    this.details = body?.details ?? null;
  }
}

export const getToken = () => {
  try { return localStorage.getItem('authToken'); } catch { return null; }
};

/**
 * apiFetch('/auction/top?x=1', { method, body, signal, headers, auth })
 * auth: 'optional' (default: send the token when there is one) | 'none' | 'required' (throw 401 locally without a token)
 */
export async function apiFetch(path, { method = 'GET', body, signal, headers = {}, auth = 'optional' } = {}) {
  const token = auth === 'none' ? null : getToken();
  if (auth === 'required' && !token) throw new ApiError(401, { code: 'AUTH_REQUIRED', message: 'Please sign in' });

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers: {
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  let data = null;
  const text = await response.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 200) }; } }
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

export const isAbort = (error) => error?.name === 'AbortError';
