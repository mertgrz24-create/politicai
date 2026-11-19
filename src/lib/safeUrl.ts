// RSS kaynaklarından gelen linkler DB üzerinden UI'a dönüyor.
// Kötü niyetli bir feed javascript: gibi şemalar enjekte edebilir — sadece http(s) kabul et.
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
