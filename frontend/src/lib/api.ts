const API = import.meta.env.VITE_API_URL || '';

export function token() {
  return localStorage.getItem('token') || '';
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok)
    throw new Error(
      (await res.json().catch(() => ({ error: res.statusText }))).error || 'Request failed',
    );
  return res.json() as Promise<T>;
}
