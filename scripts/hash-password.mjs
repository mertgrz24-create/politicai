import { randomBytes, scryptSync } from 'node:crypto'
import { emitKeypressEvents } from 'node:readline'

if (!process.stdin.isTTY) {
  console.error('Run npm run auth:hash in an interactive terminal. Passwords are not accepted as command-line arguments.')
  process.exit(1)
}
console.log('Yeni giriş şifresi (en az 12 karakter; giriş gizli):')
emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)
process.stdin.resume()
let password = ''
process.stdin.on('keypress', (value, key) => {
  if (key.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.exit(1) }
  if (key.name === 'backspace') { password = Array.from(password).slice(0,-1).join(''); return }
  if (key.name === 'return') {
    process.stdin.setRawMode(false)
    if (Array.from(password).length < 12) { console.error('Şifre en az 12 karakter olmalı.'); process.exit(1) }
    const salt = randomBytes(16).toString('hex')
    console.log(`\nAUTH_PASSWORD_HASH=scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`)
    process.exit(0)
  }
  if (value && !key.ctrl && !key.meta && password.length < 1024) password += value
})
