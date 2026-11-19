import { clientId, db, HttpError, strings, text, uuid } from './core.js'
import { moderate } from './moderation.js'
import type { Persona } from '../src/types/index.js'

export async function savePersona(body: Record<string, unknown>) {
  const identity = text(body.identity, 'Kimlik'), ideology = text(body.ideology, 'Bakış açısı', 100)
  const themes = strings(body.themes, 'Temalar'), bannedWords = strings(body.banned_words, 'Yasaklı kelimeler'), bannedTopics = strings(body.banned_topics, 'Yasaklı konular')
  const address = text(body.address_form, 'Hitap', 200, true), reference = text(body.reference_prompt, 'Referans', 8000, true)
  if (!Array.isArray(body.voice_examples) || body.voice_examples.length > 20) throw new HttpError(400, 'Üslup örnekleri geçersiz.')
  const examples = body.voice_examples.map(v => {
    if (!v || !['sert','uzlasmaci','espriyle'].includes(v.tone)) throw new HttpError(400, 'Örnek tonu geçersiz.')
    return { tone: v.tone, example: text(v.example, 'Üslup örneği', 280) }
  })
  const maxChars = Number(body.max_chars), dailyCount = Number(body.daily_tweet_count)
  if (!Number.isInteger(maxChars) || maxChars < 1 || maxChars > 280 || !Number.isInteger(dailyCount) || dailyCount < 1 || dailyCount > 17)
    throw new HttpError(400, 'Karakter veya günlük paylaşım sınırı geçersiz.')
  const sql = db(), client = clientId()
  const rows = await sql`INSERT INTO personas (client_id, identity, ideology, themes, banned_words, banned_topics, address_form, voice_examples, reference_prompt, max_chars, daily_tweet_count)
    VALUES (${client}, ${identity}, ${ideology}, ${themes}, ${bannedWords}, ${bannedTopics}, ${address}, ${JSON.stringify(examples)}::jsonb, ${reference}, ${maxChars}, ${dailyCount})
    ON CONFLICT (client_id) DO UPDATE SET identity=excluded.identity, ideology=excluded.ideology, themes=excluded.themes,
      banned_words=excluded.banned_words, banned_topics=excluded.banned_topics, address_form=excluded.address_form,
      voice_examples=excluded.voice_examples, reference_prompt=excluded.reference_prompt, max_chars=excluded.max_chars, daily_tweet_count=excluded.daily_tweet_count
    RETURNING *`
  return { ok: true, persona: rows[0] }
}
export async function updateDraft(body: Record<string, unknown>, actor: string) {
  const id = uuid(body.draft_id), action = body.action
  if (!['approve','reject','edit'].includes(String(action))) throw new HttpError(400, 'Geçersiz taslak işlemi.')
  const sql = db(), client = clientId()
  const rows = await sql`SELECT d.*, n.title AS news_title FROM drafts d LEFT JOIN news_pool n ON n.id=d.news_id WHERE d.id=${id} AND d.client_id=${client}`
  if (!rows.length) throw new HttpError(404, 'Taslak bulunamadı.')
  const draft = rows[0]
  if (draft.status === 'published') throw new HttpError(409, 'Yayınlanmış taslak değiştirilemez.')
  const personaRows = await sql`SELECT * FROM personas WHERE client_id=${client} LIMIT 1`
  const persona = (personaRows[0] ?? { max_chars: 280, banned_words: [], banned_topics: [] }) as Persona
  const content = action === 'edit' ? text(body.content, 'Taslak', Math.min(persona.max_chars, 280)) : String(draft.content)
  const flags = moderate(content, persona, String(draft.news_title ?? ''))
  if (action === 'approve' && (draft.status === 'rejected' || flags.some(v => v === 'empty_content' || v.startsWith('over_limit:'))))
    throw new HttpError(409, 'Onaylamadan önce taslağı düzenle ve karakter sınırını kontrol et.')
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'edited'
  const updated = await sql`WITH changed AS (
    UPDATE drafts SET content=${content}, status=${status}, moderation_flags=${flags}, reviewed_at=now()
    WHERE id=${id} AND client_id=${client} AND status=${draft.status} AND content=${draft.content} RETURNING *
  ), audited AS (
    INSERT INTO audit_log (action, resource_type, resource_id, details)
    SELECT ${String(action)}, 'draft', id, ${JSON.stringify({ actor, client_id: client })}::jsonb FROM changed
  ) SELECT * FROM changed`
  if (!updated.length) throw new HttpError(409, 'Taslak başka bir işlemde değişti. Listeyi yenile.')
  return { ok: true, draft: updated[0] }
}
export async function batchDrafts(body: Record<string, unknown>, actor: string) {
  if (body.action !== 'approve' || !Array.isArray(body.draft_ids) || !body.draft_ids.length || body.draft_ids.length > 100)
    throw new HttpError(400, 'En fazla 100 taslak onaylanabilir.')
  const ids = [...new Set(body.draft_ids.map(uuid))], sql = db(), client = clientId()
  // All-or-nothing selection validation and lock: no optimistic client-only approval.
  const [, updated] = await sql.transaction([
    sql`SELECT id FROM drafts WHERE client_id=${client} AND id=ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`,
    sql`WITH changed AS (
      UPDATE drafts SET status='approved', reviewed_at=now()
      WHERE client_id=${client} AND id=ANY(${ids}::uuid[]) AND status IN ('pending','edited')
        AND length(trim(content)) > 0 AND char_length(content) <= LEAST(280, COALESCE((SELECT max_chars FROM personas WHERE client_id=${client} LIMIT 1),280))
        AND (SELECT count(*) FROM drafts WHERE client_id=${client} AND id=ANY(${ids}::uuid[]) AND status IN ('pending','edited') AND length(trim(content)) > 0
          AND char_length(content) <= LEAST(280, COALESCE((SELECT max_chars FROM personas WHERE client_id=${client} LIMIT 1),280)))=${ids.length}
      RETURNING id
    ), audited AS (
      INSERT INTO audit_log (action, resource_type, resource_id, details)
      SELECT 'approve', 'draft', id, ${JSON.stringify({ actor, client_id: client, batch: true })}::jsonb FROM changed
    ) SELECT id FROM changed`,
  ])
  if (updated.length !== ids.length) throw new HttpError(409, 'Bazı taslaklar onaya uygun değil veya değişmiş. Listeyi yenile.')
  return { ok: true, updated: updated.length }
}
