// Same-origin backend. Credentials and AI keys never enter the browser bundle.
async function requestJson<T>(path: string, options: RequestInit): Promise<T> {
  if (!path.startsWith('/api/')) throw new Error('Geçersiz API yolu.')
  let response: Response
  try { response = await fetch(path, { ...options, credentials: 'same-origin' }) }
  catch { throw new Error('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.') }
  const data: unknown = await response.json().catch(() => {
    throw new Error('Sunucudan beklenmeyen bir yanıt geldi. Tekrar dene.')
  })
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error : `İşlem tamamlanamadı (HTTP ${response.status}).`
    throw new Error(message)
  }
  return data as T
}
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
export async function apiGet<T>(path: string): Promise<T> { return requestJson<T>(path, {}) }
