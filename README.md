# PoliticAI

Haberleri incelemek, iletişim profiline uygun üç taslağı karşılaştırmak ve insan onayına hazırlamak için web uygulaması.

## Güncel mimari

- React 18 + TypeScript + Tailwind 3; sıcak tonlu A tasarımı korunur.
- Vercel Node.js Function: aynı alan adında `/api/*`.
- Neon PostgreSQL; sunucudan parametreli sorgular ve atomik kayıtlar.
- Claude Messages API veya Gemini; `AI_PROVIDER` ile seçim.
- HttpOnly oturum çerezi; tek yönetici ve sunucuda belirlenen tek çalışma alanı.
- RSS toplama: elle ve günde bir Vercel Cron; n8n gerekmez.
- Gerçek X yayını henüz yok. Yayın uç noktası 501 döner; sahte yayın kaydı oluşturmaz.

## Yerel kurulum

Node.js 22.12+ veya 24 gerekir.

```sh
npm ci
cp .env.example .env.local
npm run auth:hash
```

`.env.local` içindeki sunucu ayarlarını doldur. Mevcut kurulumda dolu olan dosyayı örnekle değiştirme. Şifre özetini `AUTH_PASSWORD_HASH` alanına koy. Yeni veritabanı için `CLIENT_ID` değerini `node -e "console.log(require('crypto').randomUUID())"` ile üret; mevcut kurulumda mevcut `clients.id` değerini kullan.

```sh
npm run db:migrate
npm run dev
```

Uygulama ve API aynı adreste: http://127.0.0.1:5173. Profilini uygulamadan oluştur; Editör masasında **Yeni haberleri getir** ile RSS kaynaklarını topla. Claude anahtarı/modeli yoksa arayüz ve veri işlemleri çalışır; üretim açıklayıcı hata verir.

```sh
npm run typecheck
npm run build
```

`npm run dev:ui` yalnızca arayüzü açar; backend sağlamaz. Tasarım prototipleri geliştirme ortamında `/design-preview` altında kalır.

## Vercel

**Canlı uygulama:** https://politicai-cyan.vercel.app

Ayrıntılı kurulum, ortam değişkenleri, geçiş ve sınırlamalar: [Vercel rehberi](docs/vercel-deployment.md).

Vercel proje kökü bu dizin, Framework **Vite**, Node.js **24.x**, Build `npm run build`, çıktı `dist`. `vercel.json` API yönlendirmelerini, SPA yollarını, güvenlik başlıklarını, 300 saniyelik Function süresini ve günlük cron görevini içerir. Fluid Compute etkin olmalı.

**Sunucu sırlarını VITE_ ile adlandırma.** Tarayıcı için client ID veya webhook adresi gerekmez. `ANTHROPIC_API_KEY` Claude API anahtarıdır; Claude sohbet aboneliğinin yerine geçtiği varsayılmaz.

## Eski kurulum

n8n dosyaları veri kaybını önlemek için `archive/n8n-workflows/` altında saklanır; çalışma zamanında kullanılmaz. Önceki README: [tarihsel belge](docs/archive/README-before-vercel.md). `supabase/migrations/` tarihsel dizin adıdır; içindeki SQL Neon şemasıdır, Supabase servisi gerektirmez.
