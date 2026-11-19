# PoliticAI

Politikacılar, milletvekilleri ve adaylar için KVKK uyumlu, AI destekli sosyal medya iletişim asistanı.

> Haber yayınlanır → AI vekilin diliyle 3 tweet yazar → vekil beğendiğini tek tuşla yayınlar.

## Hızlı Başlangıç

```bash
# 1. Bu repoyu klonla
git clone <repo-url>
cd politicai

# 2. UI/UX Pro Max skill'ini kur (frontend kalitesi için kritik)
npm install -g uipro-cli
uipro init --ai claude

# 3. Claude Code'u başlat
claude

# Claude Code otomatik olarak CLAUDE.md ve .claude/skills/* dosyalarını yükler
# Sen sadece şunu yazarsın: "Faz 1'i başlat — Supabase local kurulumu"
```

## v1 vs v2

**v1 (bu repo):** Tek politikacı, local-first, free API'ler. Geliştirici makinesinde çalışır. Multi-tenant yok.

**v2 (satış sonrası):** Hostinger production, multi-tenant SaaS, agency dashboard, paralı plan (Claude Sonnet + Twitter Basic). v2 dokümanı v1 stabil olduktan sonra yazılacak.

## Mimari

Detaylı bilgi için [`CLAUDE.md`](./CLAUDE.md) dosyasına bakın. Avukat projesinin async/realtime mimarisi temel alındı.

```
React UI (localhost) → n8n Webhook → Persona Prompt → Gemini Flash
  → Moderation → Supabase drafts → Realtime → UI
                                                  │
                                                  ▼
                                          Onay (insan)
                                                  │
                                                  ▼
                                      n8n /publish → X API → posts → Realtime → UI
```

## Skiller

| Skill | Görev |
|---|---|
| [ui-ux-pro-max](./.claude/skills/ui-ux-pro-max/SKILL.md) | Frontend tasarım (dış paket — npm ile kurulur) |
| [supabase-auth](./.claude/skills/supabase-auth/SKILL.md) | JWT doğrulama + Realtime kanalları |
| [n8n-workflow-builder](./.claude/skills/n8n-workflow-builder/SKILL.md) | Async/realtime n8n workflow tasarımı |
| [gemini-prompt-engineering](./.claude/skills/gemini-prompt-engineering/SKILL.md) | Persona-aware prompt + 3 varyant + JSON output |
| [content-moderation](./.claude/skills/content-moderation/SKILL.md) | Banned words + küfür + URL filtre |
| [twitter-oauth-publish](./.claude/skills/twitter-oauth-publish/SKILL.md) | X API v2 OAuth + tek/toplu yayın |
| [json-structuralist](./.claude/skills/json-structuralist/SKILL.md) | JSON şema doğrulama + fallback |
| [api-provider-switch](./.claude/skills/api-provider-switch/SKILL.md) | Gemini ↔ Claude geçiş soyutlaması |

## Ön Gereksinimler

- Docker (n8n + Supabase local için)
- Node.js 18+ (frontend için)
- Google AI Studio hesabı (Gemini Flash API key — ücretsiz)
- X Developer Portal hesabı (Free tier app)
- Cloudflare hesabı (Tunnel için, ücretsiz)

## n8n Workflows

Üretilen JSON dosyaları: [`n8n-workflows/`](./n8n-workflows/)

- `legacy-twiter.json` — Orijinal workflow (referans, kullanılmıyor)
- `politicai-rss-collect.json` — Her 30 dakika RSS toplama
- `politicai-generate.json` — Async tweet üretimi (webhook tetiklemeli)
- `politicai-publish.json` — Tek tweet yayını
- `politicai-publish-batch.json` — Toplu yayın

İçe aktarma:
1. n8n → Workflows → Import from File
2. İlgili JSON'u seç
3. Credential'ları bağla (Supabase service role key, Gemini API key, X OAuth)
4. "Active" yap

## Kritik Notlar

- **Hiçbir tweet otomatik yayınlanmaz** — her biri insan onayından geçer
- **API anahtarları `.env`'de**, asla git'e commit edilmez
- **Twitter Free tier:** Günde 17 tweet sınırı + metric okuma yok. Demo için yeterli, kapsamlı kullanım için Basic plan ($100/ay)
- **n8n local çalışırken** MacBook açık kalmalı, RSS toplama cron için gerekli

## Lisans
MIT

## Yeni tasarım önizlemeleri

`npm run dev` sonrasında `/design-preview` yolunu açın. Üst çubukta **A — Editör masası** ve **B — Karşılaştırma** alternatifleri bulunur. Örnek içerikle arama, üretim simülasyonu, düzenleme, önizleme ve onay akışı denenebilir. A yönünde günlük özet, iletişim profili, geçmiş ve giriş ekranları da vardır.

Önizleme yalnızca geliştirme ortamında çalışır; gerçek yayın veya webhook çağrısı yapmaz. Yerel fontlar ve lisansları dahil edilmiştir. Beş öncelikli özelliğin kabul ölçütleri ve entegrasyon planı: [Tasarım ve özellik planı](docs/design-and-feature-plan.md).

## Sıcak A tasarımı — uygulama

Seçilen tasarım artık giriş, günlük özet, editör masası, onay kuyruğu, iletişim profili ve geçmiş ekranlarında kullanılıyor. `npm run dev` ile uygulamayı açabilirsiniz. Yerel fontlar ve mobil düzen dahildir.

Gerçek X yayın akışı tamamlanana kadar `VITE_X_PUBLISH_ENABLED=false` kalmalıdır. Arayüzde taslak onayı ve yayın ayrı işlemlerdir. [Aktarım notları ve kontrol sonuçları](docs/ui-rollout.md).
