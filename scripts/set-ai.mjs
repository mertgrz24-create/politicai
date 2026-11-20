// PoliticAI: AI saglayici anahtarini ve model kimligini Vercel Production'a yapistirmadan yazar.
// Kullanim (proje klasorunde): npm run ai:set
import { spawnSync } from 'node:child_process'
import { emitKeypressEvents } from 'node:readline'

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

const provider = (await ask('Saglayici (gemini veya claude): ', false)).trim().toLowerCase()
if (!['gemini', 'claude'].includes(provider)) { console.error('gemini veya claude yaz.'); process.exit(1) }
const keyName = provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'
const modelName = provider === 'claude' ? 'CLAUDE_MODEL' : 'GEMINI_MODEL'
const key = (await ask('API anahtari (gizli): ', true)).replace(/\s/g, '')
if (key.length < 20) { console.error('API anahtari cok kisa, yapistirma bozulmus olabilir.'); process.exit(1) }

// Hesabin erisebildigi modelleri saglayicidan listele (anahtar sadece saglayicinin kendi API'sine gider).
let ids = []
try {
  const res = provider === 'claude'
    ? await fetch('https://api.anthropic.com/v1/models?limit=100', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, signal: AbortSignal.timeout(20000) })
    : await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) { console.error(`Anahtar dogrulanamadi (HTTP ${res.status}). Anahtari ve saglayiciyi kontrol et.`); process.exit(1) }
  const data = await res.json()
  ids = provider === 'claude'
    ? (data.data ?? []).map(m => m.id)
    : (data.models ?? []).filter(m => (m.supportedGenerationMethods ?? []).includes('generateContent') && /^models\/gemini/.test(m.name)).map(m => m.name.replace(/^models\//, ''))
} catch { console.error('Model listesi alinamadi (ag hatasi). Model kimligini elle yazabilirsin.') }
ids = ids.filter(id => /^[a-zA-Z0-9._-]+$/.test(id))
if (ids.length) { console.log('Hesabinin erisebildigi modeller:'); ids.slice(0, 40).forEach((id, i) => console.log(`  ${i + 1}) ${id}`)) }
const pick = (await ask('Model numarasi (veya tam kimligi yaz): ', false)).trim()
const model = /^\d+$/.test(pick) ? ids[Number(pick) - 1] : pick
if (!model || !/^[a-zA-Z0-9._-]+$/.test(model)) { console.error('Model secimi gecersiz.'); process.exit(1) }
console.log({ secilen_model: model })

console.log({ saglayici: provider, model_uzunluk: model.length, anahtar_uzunluk: key.length })
const yes = (await ask("Production env'e yazilsin mi? (evet/hayir): ", false)).trim().toLowerCase()
if (yes !== 'evet') { console.log('Iptal edildi, hicbir sey yazilmadi.'); process.exit(0) }

for (const [name, value, sensitive] of [['AI_PROVIDER', provider, false], [modelName, model, false], [keyName, key, true]]) {
  spawnSync('vercel', ['env', 'rm', name, 'production', '--yes'], { stdio: 'ignore' })
  const args = ['env', 'add', name, 'production', ...(sensitive ? ['--sensitive'] : [])]
  const r = spawnSync('vercel', args, { input: value, stdio: ['pipe', 'ignore', 'inherit'] })
  console.log(`${name}: ${r.status === 0 ? 'yazildi' : 'HATA (cikis ' + r.status + ')'}`)
  if (r.status !== 0) process.exit(1)
}
console.log("Bitti. Degisikliklerin canlida gecerli olmasi icin 'vercel redeploy <son-production-adresi>' calistir.")
