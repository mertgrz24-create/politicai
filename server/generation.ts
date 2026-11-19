import { aiConfig, generateVariants } from './ai.js'
import { clientId, db, HttpError, integerSetting, uuid } from './core.js'
import { moderate } from './moderation.js'
import type { NewsItem, Persona } from '../src/types/index.js'

export async function expireJobs() {
  const sql = db()
  await sql`UPDATE draft_jobs SET status='failed', error_message='İşlem süresi aşıldı. Yeniden üretim başlatabilirsin. Otomatik ücretli tekrar yapılmadı.'
    WHERE client_id=${clientId()} AND status NOT IN ('saved','failed') AND updated_at < now() - interval '6 minutes'`
}
export async function createJob(newsId: unknown) {
  const id = uuid(newsId), client = clientId(), sql = db(), config = aiConfig()
  await expireJobs()
  const [news, persona] = await Promise.all([
    sql`SELECT id FROM news_pool WHERE id=${id}`, sql`SELECT id FROM personas WHERE client_id=${client}`,
  ])
  if (!news.length) throw new HttpError(404, 'Haber bulunamadı.')
  if (!persona.length) throw new HttpError(409, 'Üretimden önce iletişim profilini kaydet.')
  const daily = integerSetting('AI_DAILY_JOB_LIMIT', 10, 1000)
  // All invocations serialize the budget reservation, including parallel serverless instances.
  const [, active, inserted] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`generate:${client}`}, 0))`,
    sql`SELECT id FROM draft_jobs WHERE client_id=${client} AND news_id=${id} AND status NOT IN ('saved','failed') ORDER BY created_at DESC LIMIT 1`,
    sql`INSERT INTO draft_jobs (client_id, news_id, status, ai_provider, ai_model)
      SELECT ${client}, ${id}, 'queued', ${config.provider}, ${config.model}
      WHERE EXISTS (SELECT 1 FROM clients WHERE id=${client} AND status='active')
      AND NOT EXISTS (SELECT 1 FROM draft_jobs WHERE client_id=${client} AND news_id=${id} AND status NOT IN ('saved','failed'))
      AND (SELECT count(*) FROM draft_jobs WHERE client_id=${client} AND created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul') < ${daily}
      AND (SELECT count(*) FROM draft_jobs WHERE client_id=${client} AND status NOT IN ('saved','failed')) < 2
      RETURNING id`,
  ])
  if (active.length) return { id: String(active[0].id), existing: true }
  if (!inserted.length) throw new HttpError(429, 'Günlük üretim veya eşzamanlı işlem sınırına ulaşıldı; hesabın etkin olduğunu kontrol et.')
  return { id: String(inserted[0].id), existing: false }
}
export async function runJob(id: string) {
  const sql = db(), client = clientId()
  try {
    const jobs = await sql`UPDATE draft_jobs SET status='fetching_news' WHERE id=${id} AND client_id=${client} AND status='queued' RETURNING *`
    if (!jobs.length) return
    const job = jobs[0]
    const [newsRows, personaRows] = await Promise.all([
      sql`SELECT * FROM news_pool WHERE id=${job.news_id}`,
      sql`SELECT * FROM personas WHERE client_id=${client} LIMIT 1`,
    ])
    const persona = personaRows[0] as Persona | undefined, news = newsRows[0] as NewsItem | undefined
    if (!persona || !news) throw new HttpError(409, 'Haber veya iletişim profili bulunamadı.')
    await sql`UPDATE draft_jobs SET status='building_prompt' WHERE id=${id} AND status='fetching_news'`
    const config = aiConfig()
    if (job.ai_provider !== config.provider || job.ai_model !== config.model)
      throw new HttpError(409, 'Sağlayıcı ayarı değişti. Üretimi yeniden başlat.')
    await sql`UPDATE draft_jobs SET status='calling_ai' WHERE id=${id} AND status='building_prompt'`
    const result = await generateVariants(persona, news, config)
    await sql`UPDATE draft_jobs SET status='moderating' WHERE id=${id} AND status='calling_ai'`
    const variants = result.variants.map(v => ({
      ...v, moderation_flags: moderate(v.content, persona, news.title),
      status: Array.from(v.content).length > Math.min(persona.max_chars || 280, 280) ? 'rejected' : 'pending',
    }))
    // Saving drafts, completing the job and marking the news are one atomic operation.
    await sql`WITH completed AS (
      UPDATE draft_jobs SET status='saved', input_tokens=${result.inputTokens}, output_tokens=${result.outputTokens}
      WHERE id=${id} AND client_id=${client} AND status='moderating' RETURNING id, news_id
    ), inserted AS (
      INSERT INTO drafts (client_id, news_id, job_id, content, variant_label, status, moderation_flags)
      SELECT ${client}, completed.news_id, completed.id, v.content, v.label, v.status, v.moderation_flags
      FROM completed CROSS JOIN jsonb_to_recordset(${JSON.stringify(variants)}::jsonb)
        AS v(label text, content text, status text, moderation_flags text[])
      RETURNING id
    ) UPDATE news_pool SET processed=true WHERE id IN (SELECT news_id FROM completed) AND EXISTS (SELECT 1 FROM inserted)`
  } catch (error) {
    const message = error instanceof HttpError ? error.message : 'Üretim tamamlanamadı. Sunucu ve veritabanı ayarlarını kontrol et.'
    try { await sql`UPDATE draft_jobs SET status='failed', error_message=${message} WHERE id=${id} AND client_id=${client} AND status NOT IN ('saved','failed')` }
    catch { console.error('PoliticAI: generation failure could not be persisted; stale-job recovery will apply.') }
  }
}
