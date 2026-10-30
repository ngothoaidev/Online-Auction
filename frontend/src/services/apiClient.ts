// Single place that knows how to talk to the API: optional bearer token, JSON in/out, AbortSignal, structured errors.
// It never retries commands on its own (a retry of a command must reuse the SAME Idempotency-Key, decided by the caller).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type ErrorBody = { message?: string; code?: string; requestId?: string; details?: unknown } | null;

export class ApiError extends Error {
  status: number;
  code: string | null;
  requestId: string | null;
  details: unknown;

  constructor(status: number, body: ErrorBody) {
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
type FetchOptions = {
  method?: string; body?: unknown; signal?: AbortSignal; headers?: Record<string, string>; auth?: 'optional' | 'none' | 'required';
};

/** JSON from the API. Callers that know the shape pass it as T; the default stays loose at this boundary. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch<T = any>(path: string, { method = 'GET', body, signal, headers = {}, auth = 'optional' }: FetchOptions = {}): Promise<T> {
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
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  let data: unknown = null;
  const text = await response.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 200) }; } }
  if (!response.ok) throw new ApiError(response.status, data as ErrorBody);
  return data as T;
}

export const isAbort = (error: unknown) => (error as Error | null)?.name === 'AbortError';
