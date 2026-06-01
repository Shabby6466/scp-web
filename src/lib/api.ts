/**
 * API root only — e.g. `http://localhost:4000/api`.
 * If `VITE_API_URL` is wrongly set to a school path like `.../api/schools/school`,
 * then `/users` becomes `.../schools/school/users`, Nest treats `school` as a UUID, and Postgres errors.
 */
function normalizeApiBase(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.replace(/\/schools\/[^/]+$/i, '');
}

const API_BASE = normalizeApiBase(
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  // 'http://76.13.177.120:4000/api'
);

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export function setToken(token: string) {
  localStorage.setItem('access_token', token);
}

export function clearToken() {
  localStorage.removeItem('access_token');
}

/** Many Nest handlers return `{ data: T[]; meta: {...} }` instead of a raw array. */
export function unwrapList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'data' in res) {
    const d = (res as { data: unknown }).data;
    return Array.isArray(d) ? (d as T[]) : [];
  }
  return [];
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(data?.message || `API Error ${status}`);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      data = { message: res.statusText };
    }
    throw new ApiError(res.status, data);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (null as T);
}

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

function withQuery(path: string, params?: QueryParams): string {
  if (!params) return path;
  const search = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === null || rawValue === undefined) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value === null || value === undefined) continue;
      search.append(key, String(value));
    }
  }

  const query = search.toString();
  if (!query) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

export const api = {
  get: <T = any>(path: string, options?: { params?: QueryParams }) =>
    apiFetch<T>(withQuery(path, options?.params)),

  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};
