import { authenticate, login, sameOrigin, sessionCookie } from './auth.js'
import { batchDrafts, savePersona, updateDraft } from './drafts.js'
import { body, clientId, db, HttpError, json, rateLimit, required, uuid } from './core.js'
import { createJob, expireJobs, runJob } from './generation.js'
import { collectNews } from './news.js'
import { createHash, timingSafeEqual } from 'node:crypto'

export type Schedule = (task: Promise<unknown>) => void
const matches = (actual: string, expected: string) => timingSafeEqual(createHash('sha256').update(actual).digest(), createHash('sha256').update(expected).digest())

export async function handleRequest(request: Request, schedule: Schedule, ip = 'unknown'): Promise<Response> {
  let response: Response
  try { response = await route(request, schedule, ip) }
  catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    if (!(error instanceof HttpError)) console.error('PoliticAI API error: internal operation failed.')
    response = json({ error: error instanceof HttpError ? error.message : 'Sunucu işlemi tamamlanamadı. Veritabanı kurulumunu ve sunucu ayarlarını kontrol et.' }, status)
    if (status === 429) response.headers.set('Retry-After', '120')
  }
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}
async function route(request: Request, schedule: Schedule, ip: string) {
  const url = new URL(request.url)
  const path = url.pathname === '/api/handler' ? `/api/${url.searchParams.get('route') ?? ''}` : url.pathname
  const method = request.method
  if (!['GET','POST'].includes(method)) throw new HttpError(405, 'Bu istek yöntemi desteklenmiyor.')
  if (method === 'POST') sameOrigin(request)
  if (path === '/api/auth/login' && method === 'POST') {
    const data = await body(request)
    const result = await login(data.email, data.password, ip)
    return json({ user: result.user }, 200, { 'Set-Cookie': sessionCookie(result.token) })
  }
  if (path === '/api/auth/logout' && method === 'POST')
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', true) })
  if (path === '/api/cron/news' && method === 'GET') {
    const secret = required('CRON_SECRET')
    if (secret.length < 32) throw new HttpError(503, 'CRON_SECRET en az 32 karakter olmalı.')
    if (!matches(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) throw new HttpError(401, 'Zamanlayıcı yetkisi gerekli.')
    await expireJobs()
    const result = await collectNews()
    await db()`DELETE FROM app_rate_limits WHERE reset_at < now() - interval '1 day'`
    return json(result)
  }
  const user = await authenticate(request)
  if (path === '/api/auth/me' && method === 'GET') return json({ user })
  const client = user.client_id, sql = db()
  // Any client_id sent by older clients must match the signed server session.
  if (url.searchParams.has('client_id') && url.searchParams.get('client_id') !== client)
    throw new HttpError(403, 'Bu hesaba erişim yetkin yok.')
  if (path === '/api/news-list' && method === 'GET')
    return json({ news: await sql`SELECT * FROM news_pool WHERE COALESCE(published_at, fetched_at) > now() - interval '3 days'
      ORDER BY published_at DESC NULLS LAST, fetched_at DESC, id LIMIT 60` })
  if (path === '/api/drafts' && method === 'GET')
    return json({ drafts: await sql`SELECT d.*, n.title AS news_title, n.source_name FROM drafts d LEFT JOIN news_pool n ON n.id=d.news_id WHERE d.client_id=${client} ORDER BY d.created_at DESC, d.id LIMIT 300` })
  if (path === '/api/persona' && method === 'GET') {
    const rows = await sql`SELECT * FROM personas WHERE client_id=${client} LIMIT 1`
    return json(rows[0] ?? {})
  }
  if (path === '/api/history' && method === 'GET') {
    const hours = Number(url.searchParams.get('hours') ?? 168)
    if (![0,24,168].includes(hours)) throw new HttpError(400, 'Geçersiz geçmiş aralığı.')
    return json({ posts: await sql`SELECT p.*, d.variant_label, n.title AS news_title, n.link AS news_link, n.source_name
      FROM posts p LEFT JOIN drafts d ON d.id=p.draft_id LEFT JOIN news_pool n ON n.id=d.news_id
      WHERE p.client_id=${client} AND (${hours}=0 OR p.published_at > now()-make_interval(hours => ${hours}))
      ORDER BY p.published_at DESC NULLS LAST LIMIT 100` })
  }
  if (path === '/api/job-status' && method === 'GET') {
    const id = uuid(url.searchParams.get('job_id'))
    await expireJobs()
    const jobs = await sql`SELECT id, client_id, news_id, status, error_message, ai_provider, ai_model, created_at, updated_at FROM draft_jobs WHERE id=${id} AND client_id=${client}`
    if (!jobs.length) throw new HttpError(404, 'Üretim kaydı bulunamadı.')
    const drafts = jobs[0].status === 'saved' ? await sql`SELECT * FROM drafts WHERE job_id=${id} AND client_id=${client} ORDER BY created_at, id` : []
    return json({ ...jobs[0], drafts })
  }
  if (method === 'POST') {
    const data = await body(request)
    if (data.client_id !== undefined && data.client_id !== clientId()) throw new HttpError(403, 'Bu hesaba erişim yetkin yok.')
    await rateLimit(`write:${client}`, 120, 60)
    if (path === '/api/persona/upsert') return json(await savePersona(data))
    if (path === '/api/draft/update') return json(await updateDraft(data, user.email))
    if (path === '/api/draft/batch') return json(await batchDrafts(data, user.email))
    if (path === '/api/news/refresh') return json(await collectNews())
    if (path === '/api/generate') {
      const job = await createJob(data.news_id)
      if (!job.existing) schedule(runJob(job.id))
      return json({ job_id: job.id, existing: job.existing }, 202)
    }
    if (path === '/api/publish') throw new HttpError(501, 'X bağlantısı henüz hazır değil. Taslağın onayı korunuyor; yayın yapılmadı.')
  }
  throw new HttpError(404, 'API yolu bulunamadı.')
}
