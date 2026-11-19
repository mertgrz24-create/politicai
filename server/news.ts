import Parser from 'rss-parser'
import { clientId, db, HttpError, rateLimit } from './core.js'

// Server-controlled sources: no caller-supplied URL is ever fetched.
const SOURCES = [
  { name: 'TRT Haber', url: 'https://www.trthaber.com/sondakika.rss' },
  { name: 'A Haber', url: 'https://www.ahaber.com.tr/rss/gundem.xml' },
  { name: 'Yeni Şafak', url: 'https://www.yenisafak.com/rss?xml=gundem' },
]
const parser = new Parser()
const plain = (s: string | undefined, max: number) => (s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const safeLink = (link: string | undefined) => {
  try { const url = new URL(link ?? ''); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null }
  catch { return null }
}
async function readFeed(source: typeof SOURCES[number]) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(source.url, { signal: controller.signal, redirect: 'error', headers: { 'User-Agent': 'PoliticAI/1.0 RSS Reader', Accept: 'application/rss+xml, application/atom+xml, text/xml' } })
    if (!response.ok || !response.body) throw new Error('feed unavailable')
    const reader = response.body.getReader(), chunks: Uint8Array[] = []
    let length = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.length
        if (length > 2_000_000) throw new Error('feed too large')
        chunks.push(value)
      }
    } finally { await reader.cancel() }
    const xml = Buffer.concat(chunks).toString('utf8')
    // Reject DTD/entity declarations before parsing untrusted XML.
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('unsupported XML')
    const feed = await parser.parseString(xml)
    return feed.items.slice(0, 30).flatMap(item => {
      const link = safeLink(item.link), title = plain(item.title, 500)
      if (!link || !title) return []
      const date = new Date(item.isoDate || item.pubDate || '')
      return [{ source_name: source.name, title, description: plain(item.contentSnippet || item.content, 4000), link,
        published_at: Number.isNaN(date.getTime()) ? null : date.toISOString() }]
    })
  } finally { clearTimeout(timeout) }
}
export async function collectNews() {
  const sql = db()
  await rateLimit(`news-refresh:${clientId()}`, 1, 120)
  const results = await Promise.allSettled(SOURCES.map(readFeed))
  const warnings = results.flatMap((r, i) => r.status === 'rejected' ? [`${SOURCES[i].name} kaynağına ulaşılamadı.`] : [])
  const news = [...new Map(results.flatMap(r => r.status === 'fulfilled' ? r.value : []).map(v => [v.link, v])).values()]
  if (!news.length) throw new HttpError(502, 'Kaynaklardan haber alınamadı. Mevcut haberler korunuyor; daha sonra tekrar dene.')
  const inserted = await sql`INSERT INTO news_pool (source_name, title, description, link, published_at)
    SELECT source_name, title, description, link, published_at FROM jsonb_to_recordset(${JSON.stringify(news)}::jsonb)
      AS v(source_name text, title text, description text, link text, published_at timestamptz)
    ON CONFLICT (link) DO NOTHING RETURNING id`
  return { ok: true, added: inserted.length, warnings }
}
