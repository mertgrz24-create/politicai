import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRequest, type Schedule } from './app.js'
import { HttpError } from './core.js'

export async function nodeHandler(req: IncomingMessage & { body?: unknown }, res: ServerResponse, schedule: Schedule) {
  try {
    const protocol = process.env.VERCEL === '1' ? 'https' : 'http'
    const host = req.headers.host || 'localhost:5173'
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    let payload: string | undefined
    if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) {
      if (req.body !== undefined) payload = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      else {
        const chunks: Buffer[] = []; let size = 0
        for await (const chunk of req) {
          const bytes = Buffer.from(chunk); size += bytes.length
          if (size > 32_768) throw new HttpError(413, 'İstek çok büyük.')
          chunks.push(bytes)
        }
        payload = Buffer.concat(chunks).toString('utf8')
      }
      if (Buffer.byteLength(payload ?? '') > 32_768) throw new HttpError(413, 'İstek çok büyük.')
    }
    const request = new Request(`${protocol}://${host}${req.url ?? '/'}`, { method: req.method, headers, body: payload })
    // Only Vercel's trusted client-IP header is accepted in deployment.
    const ip = process.env.VERCEL === '1' ? String(req.headers['x-vercel-forwarded-for'] ?? 'unknown').split(',')[0].trim() : req.socket.remoteAddress ?? 'local'
    const response = await handleRequest(request, schedule, ip)
    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    res.end(await response.text())
  } catch (error) {
    res.statusCode = error instanceof HttpError ? error.status : 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify({ error: error instanceof HttpError ? error.message : 'Sunucu isteği işleyemedi.' }))
  }
}
