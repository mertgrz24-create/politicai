// n8n webhook'larına istek atmak için merkezi yardımcı fonksiyonlar
// JWT token localStorage'da 'politicai_token' key'i ile saklanır

const N8N_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL

const TOKEN_KEY = 'politicai_token'

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => { localStorage.setItem(TOKEN_KEY, token) },
  clear: (): void => { localStorage.removeItem(TOKEN_KEY) },
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  requireAuth = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (requireAuth) {
    const token = tokenStorage.get()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${N8N_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = tokenStorage.get()
  const res = await fetch(`${N8N_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}
