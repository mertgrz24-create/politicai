import { neon } from '@neondatabase/serverless'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new HttpError(503, `Sunucu ayarı eksik: ${name}`)
  return value
}
export function integerSetting(name: string, fallback: number, max: number): number {
  const n = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(n) || n < 1 || n > max)
    throw new HttpError(503, `Sunucu ayarı geçersiz: ${name}`)
  return n
}
export function db() { return neon(required('DATABASE_URL')) }
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new HttpError(400, 'Geçerli bir kayıt kimliği gerekli.')
  return value
}
export function clientId() { return uuid(required('CLIENT_ID')) }
export function text(value: unknown, name: string, max = 500, optional = false): string {
  if (optional && (value === undefined || value === null)) return ''
  if (typeof value !== 'string' || (!optional && !value.trim()) || Array.from(value).length > max)
    throw new HttpError(400, `${name} geçersiz veya çok uzun.`)
  return value.trim()
}
export function strings(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length > 50)
    throw new HttpError(400, `${name} en fazla 50 öğeden oluşmalı.`)
  return [...new Set(value.map(v => text(v, name, 200)))]
}
export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(415, 'JSON içerik gerekli.')
  const raw = await request.text()
  if (Buffer.byteLength(raw) > 32_768) throw new HttpError(413, 'İstek çok büyük.')
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch { throw new HttpError(400, 'Geçersiz JSON isteği.') }
}
// Database counters work across Vercel instances; no in-memory rate limits.
export async function rateLimit(key: string, limit: number, seconds: number) {
  const sql = db()
  const rows = await sql`INSERT INTO app_rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + make_interval(secs => ${seconds}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN app_rate_limits.reset_at <= now() THEN 1 ELSE app_rate_limits.count + 1 END,
      reset_at = CASE WHEN app_rate_limits.reset_at <= now() THEN excluded.reset_at ELSE app_rate_limits.reset_at END
    RETURNING count`
  if (rows[0].count > limit) throw new HttpError(429, 'İşlem sınırına ulaşıldı. Biraz sonra tekrar dene.')
}
