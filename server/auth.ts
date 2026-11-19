import { createHash, scryptSync, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { clientId, HttpError, rateLimit, required } from './core.js'

export interface Session { email: string; sub: string; exp: number; client_id: string }
const COOKIE = 'politicai_session'
const MAX_AGE = 8 * 60 * 60
const equal = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
function secret() {
  const value = required('JWT_SECRET')
  if (Buffer.byteLength(value) < 32) throw new HttpError(503, 'JWT_SECRET en az 32 bayt olmalı.')
  return new TextEncoder().encode(value)
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(request.url).origin
  if (origin !== expected) throw new HttpError(403, 'İsteğin kaynağı doğrulanamadı.')
}
export async function login(email: unknown, password: unknown, ip: string) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : ''
  // Bound cardinality: attackers cannot evade the IP counter with arbitrary emails.
  const hash = (v: string) => createHash('sha256').update(v).digest('hex')
  await rateLimit(`login-ip:${hash(ip)}`, 10, 900)
  await rateLimit(`login-account:${hash(required('AUTH_EMAIL').toLowerCase())}`, 30, 900)
  if (typeof password !== 'string' || password.length > 1024 || normalized.length > 254)
    throw new HttpError(401, 'E-posta veya şifre hatalı.')
  const [scheme, salt, expected] = required('AUTH_PASSWORD_HASH').split(':')
  if (scheme !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? ''))
    throw new HttpError(503, 'Sunucu şifre özeti yapılandırılmalı.')
  const actual = scryptSync(password, salt, 64).toString('hex')
  if (!equal(actual, expected) || !equal(normalized, required('AUTH_EMAIL').toLowerCase()))
    throw new HttpError(401, 'E-posta veya şifre hatalı.')
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE
  const user: Session = { email: normalized, sub: normalized, exp, client_id: clientId() }
  const token = await new SignJWT({ email: user.email, client_id: user.client_id })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(user.sub).setIssuedAt().setExpirationTime(exp)
    .setIssuer('politicai').setAudience('politicai-web').sign(secret())
  return { user, token }
}
export function sessionCookie(token: string, clear = false) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${clear ? 0 : MAX_AGE}${secure ? '; Secure' : ''}`
}
export async function authenticate(request: Request): Promise<Session> {
  const cookie = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!cookie) throw new HttpError(401, 'Oturum açman gerekiyor.')
  const key = secret()
  let payload
  try {
    payload = (await jwtVerify(cookie, key, { algorithms: ['HS256'], issuer: 'politicai', audience: 'politicai-web', requiredClaims: ['sub', 'exp', 'client_id'] })).payload
  } catch { throw new HttpError(401, 'Oturum süresi doldu. Yeniden giriş yap.') }
  if (payload.client_id !== clientId() || payload.sub !== required('AUTH_EMAIL').toLowerCase())
    throw new HttpError(401, 'Oturum geçersiz. Yeniden giriş yap.')
  return { sub: payload.sub, email: payload.sub, exp: payload.exp!, client_id: clientId() }
}
