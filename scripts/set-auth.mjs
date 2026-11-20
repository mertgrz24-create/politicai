// PoliticAI: AUTH_EMAIL ve AUTH_PASSWORD_HASH degerlerini Vercel Production'a yapistirmadan yazar.
// Kullanim (proje klasorunde): npm run auth:set   | dry-run testi: node scripts/set-auth.mjs --selftest
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { emitKeypressEvents } from 'node:readline'

const makeHash = pw => { const salt = randomBytes(16).toString('hex'); return `scrypt:${salt}:${scryptSync(pw, salt, 64).toString('hex')}` }
// server/auth.ts ile ayni dogrulama
function verify(hash, pw) {
  const [scheme, salt, expected] = hash.split(':')
  if (scheme !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? '')) return false
  const a = Buffer.from(scryptSync(pw, salt, 64).toString('hex')), b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

if (process.argv.includes('--selftest')) {
  const h = makeHash('dummy-password-123')
  console.log({ uzunluk: h.length, dogruSifre: verify(h, 'dummy-password-123'), yanlisSifre: verify(h, 'wrong-password-123') })
  process.exit(0)
}

if (!process.stdin.isTTY) { console.error('Etkilesimli terminalde calistir.'); process.exit(1) }
emitKeypressEvents(process.stdin)
const ask = (label, hidden) => new Promise(resolve => {
  process.stdout.write(label)
  let v = ''
  process.stdin.setRawMode(true); process.stdin.resume()
  const on = (ch, key) => {
    if (key.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.exit(1) }
    if (key.name === 'return') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('keypress', on); process.stdout.write('\n'); resolve(v); return }
    if (key.name === 'backspace') { v = Array.from(v).slice(0, -1).join(''); return }
    if (ch && !key.ctrl && !key.meta) { v += ch; if (!hidden) process.stdout.write(ch) }
  }
  process.stdin.on('keypress', on)
})

const email = (await ask('Giris e-postasi: ', false)).trim().toLowerCase()
if (!/^[^\s@]+@[^\s@]+$/.test(email)) { console.error('E-posta gecersiz.'); process.exit(1) }
const pw = await ask('Yeni sifre (en az 12 karakter, gizli): ', true)
const pw2 = await ask('Sifre tekrar: ', true)
if (pw !== pw2) { console.error('Sifreler ayni degil.'); process.exit(1) }
if (Array.from(pw).length < 12) { console.error('Sifre en az 12 karakter olmali.'); process.exit(1) }

const hash = makeHash(pw)
if (!verify(hash, pw) || hash.length !== 168) { console.error('Hash dogrulanamadi, yazilmadi.'); process.exit(1) }
console.log({ eposta_uzunluk: email.length, hash_uzunluk: hash.length, hash_dogrulama: 'tamam' })
const yes = (await ask('Production env\'e yazilsin mi? (evet/hayir): ', false)).trim().toLowerCase()
if (yes !== 'evet') { console.log('Iptal edildi, hicbir sey yazilmadi.'); process.exit(0) }

for (const [name, value] of [['AUTH_EMAIL', email], ['AUTH_PASSWORD_HASH', hash]]) {
  spawnSync('vercel', ['env', 'rm', name, 'production', '--yes'], { stdio: 'ignore' })
  const r = spawnSync('vercel', ['env', 'add', name, 'production', '--sensitive'], { input: value, stdio: ['pipe', 'ignore', 'inherit'] })
  console.log(`${name}: ${r.status === 0 ? 'yazildi' : 'HATA (cikis ' + r.status + ')'}`)
  if (r.status !== 0) process.exit(1)
}
console.log("Bitti. Degisikliklerin canlida gecerli olmasi icin 'vercel redeploy <son-production-adresi>' calistir.")
