# n8n → Vercel geçişi

## Tamamlanan kapsam

Sıcak tonlu A arayüzü ve mevcut sayfalar korunur. Giriş, persona, haber listesi/toplama, üretim/job durumu, taslak düzenleme/onay/red/toplu onay ve geçmiş kendi TypeScript backend'inde çalışır. React arayüzü `/api` üzerinden aynı alan adına bağlanır. Yeni kurulumda n8n, Docker, Cloudflare Tunnel, Supabase Auth veya Redis gerekmez.

Bu sürüm tek yönetici ve tek iletişim hesabı içindir. Çoklu kullanıcı veya herkese açık kayıt sunmaz. `CLIENT_ID` sadece sunucuda tutulur; kullanıcı tarafından gönderilen farklı hesap kimlikleri reddedilir.

## Ortam değişkenleri

Vercel → Project Settings → Environment Variables içinde ekle. Sırları Git'e veya sohbet mesajına yazma.

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Neon bağlantı dizesi; sadece sunucu |
| `CLIENT_ID` | Mevcut `clients.id`; yeni veritabanında UUID |
| `AUTH_EMAIL` | Tek yönetici e-postası |
| `AUTH_PASSWORD_HASH` | `npm run auth:hash` çıktısı, scrypt özeti |
| `JWT_SECRET` | En az 32 bayt rastgele oturum anahtarı |
| `CRON_SECRET` | En az 32 karakter, bağımsız rastgele zamanlayıcı anahtarı |
| `AI_PROVIDER` | `gemini` (varsayılan) veya `claude` |
| `ANTHROPIC_API_KEY` | Claude seçilirse gerekli |
| `CLAUDE_MODEL` | Hesabında erişilebilir tam model kimliği; kodda model sabitlenmez |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini seçilirse gerekli |
| `AI_DAILY_JOB_LIMIT` | Varsayılan 10, İstanbul takvim gününde üretim denemesi sınırı |
| `APP_URL` | İsteğe bağlı kanonik origin; yerelde ve preview ortamlarında boş bırak |

`VITE_N8N_WEBHOOK_BASE_URL`, `VITE_CLIENT_ID`, `VITE_X_PUBLISH_ENABLED`, düz metin `AUTH_PASSWORD` ve n8n ayarları kullanılmaz. Yerelde eski şifrenin özeti oluşturulduysa artık `AUTH_PASSWORD` gerekmez. Vercel'e yalnızca yukarıdaki değişkenleri taşı.

Güçlü sır üretimi:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Giriş e-postası/şifresini veya yapay zekâ anahtarını Vercel Production'a yapıştırmadan yazmak için `npm run auth:set` ve `npm run ai:set` betiklerini kullan (değerler gizli girilir, sensitive olarak yazılır). Sonrasında `vercel redeploy <son-production-adresi>` gerekir; Production env değişiklikleri yeni deploy olmadan geçerli olmaz.

JWT ve cron için ayrı değerler üret. Claude erişimi başvuru kredisi olmadan da sağlayıcı hesabındaki kredi/faturalama koşullarına bağlıdır. Otomatik ücretli sağlayıcı değişimi veya tekrar deneme yoktur. Günlük iş sınırı parasal harcama garantisi değildir; sağlayıcı hesabından ayrıca bütçe sınırı belirle.

## Veritabanı geçişi

Önce Neon yedeği/branch'i al. Mevcut veritabanında mevcut `CLIENT_ID` kullanılmalı. Uygulama dağıtılmadan önce ilgili bağlantıyla:

```sh
npm ci
npm run db:migrate
```

Komut yeni veritabanında başlangıç şemasını kurar; mevcut veritabanında ek migration uygular. Verileri silmez veya persona çoğaltmaz. Aynı client için birden fazla persona varsa veri seçip silmek yerine işlemi geri alır. Migration ve client kaydı transaction içindedir; tekrar çalıştırılabilir, aynı anda çalışan migration'lar kilitlenir.

`draft_jobs`: sağlayıcı/model/token alanları ve `calling_ai` durumu. `app_rate_limits`: sunucu örnekleri arasında paylaşılan sınırlar. Migration geçmişi `app_migrations` tablosundadır. Önceki `calling_gemini` kayıtları okunabilir.

## Dağıtım

1. Projeyi kendi Git hesabındaki depoya gönder; Vercel'e bu depoyu bağla. Bu işlem kodu yayımlar, erişim tercihlerini kontrol et.
2. Root Directory bu proje; Vite; Node.js 24.x; Build `npm run build`; Output `dist`.
3. Yukarıdaki sırları gerekli ortamlara ekle. Production ve Preview için ayrı Neon branch ve ayrı anahtarlar önerilir. Production `CLIENT_ID` ile migration'da kullanılan değer eşleşmeli.
4. Fluid Compute etkinleştir. `api/handler.ts` için `vercel.json` 300 saniye ayarlar. Hesabın bu süreyi desteklemiyorsa süreyi düşürmeden önce 120 saniyelik sağlayıcı zaman aşımını da yeniden değerlendir.
5. Production deployment oluştur. Vercel otomatik olarak cron isteğine `Authorization: Bearer CRON_SECRET` ekler.
6. Yeni giriş sistemiyle oturum aç. Persona → haber toplama → üretim → düzenleme → onay akışını kontrol et. X yayını bu sürümde yoktur.
7. Başarılı geçişten sonra eski n8n workflow'larını devre dışı bırak ve eski webhook/tunnel erişimini kapat. Repodaki arşivleme dışarıdaki n8n sunucusunu kendiliğinden durdurmaz.

Vercel hesabı/projesi bu repoya otomatik bağlanmaz. `vercel --prod` komutunu yalnızca doğru hesap/proje ve ortam ayarları hazır olduğunda kullan.

## Üretim ve zamanlama sınırları

- `/api/generate` önce Neon'da işi oluşturur, 202 döner; Vercel `waitUntil` ile arka planda tamamlar. Kalıcı bir kuyruk servisi değildir. Function sonlandırılırsa otomatik ücretli tekrar yapılmaz; altı dakikayı aşan işler durum sorgusunda veya cron'da failed olur.
- Aynı haberin aktif işi yeniden kullanılır; iki aktif iş ve günlük üretim denemesi sınırı veritabanı transaction/kilidiyle uygulanır. Başarısız işler de günlük deneme bütçesine dahildir.
- Sayfa kapanınca server işi devam edebilir; sayfa yeniden açıldığında sonuçlar taslak listesinde bulunur. Aktif ilerleme paneli refresh sonrası otomatik devam ettirilmez.
- Claude ve Gemini aynı persona, prompt ve üç varyant biçimini kullanır. JSON ve benzersiz tonlar doğrulanır. Karakter sınırını aşan çıktılar onaylanamaz; düzenlenebilir rejected taslak olarak korunur.
- Kaynak metinleri talimat olarak kabul edilmez. RSS yalnızca sunucudaki sabit HTTPS kaynaklarından okunur; DTD/entity XML reddedilir, boyut ve süre sınırları vardır. Kaynaklardan biri çalışmazsa diğerlerinin haberleri saklanır ve uyarı gösterilir.
- Cron `0 15 * * *`: UTC 15:00, Türkiye'de 18:00. Hobby'de kesin saat garanti edilmez. Kaynak toplama iki dakikada bir ile sınırlı; kullanıcı **Yeni haberleri getir** ile ayrıca tetikleyebilir.
- Vercel Hobby kişisel/ticari olmayan kullanım içindir. Ticari dağıtımı otomatik ücretsiz kabul etme. Ücretsiz Neon kotaları ve model erişimi sağlayıcı koşullarına bağlıdır.
- `/api/publish` 501 döner. Hiçbir X gönderisi veya sahte başarılı yayın kaydı oluşturulmaz. Eski posts kayıtları geçmişte korunur.

## Güvenlik ve doğrulama

HttpOnly/SameSite oturum, production Secure çerez, HS256 algoritma/issuer/audience doğrulaması, POST origin kontrolü, parametreli SQL, client kapsamı, paylaşılan giriş/yazma sınırları ve güvenlik başlıkları uygulanır. Denetim kayıtlarında onayı/düzenlemeyi yapan e-posta tutulur. Bunlar bir güvenlik sertifikası değildir.

TypeScript ve production build kontrolü uygulanır. Gerçek model anahtarı olmadığı sürece Claude/Gemini canlı üretim doğrulanmış sayılmaz. Canlı Vercel dağıtımı ve X yayını ayrıca doğrulanmalıdır.

HawkScan runtime ve HAWK_API_KEY bu ortamda mevcut değilse DAST yapılamaz. npm bağımlılık raporu DAST yerine geçmez. Tailwind 3 geliştirme zincirinde kalan uyarılar için React/Tailwind ana sürümünü sessizce değiştirmeden ayrı bakım gerekir.

Kaynaklar: [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite), [Function süreleri](https://vercel.com/docs/functions/configuring-functions/duration), [waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package), [Neon driver](https://neon.com/docs/serverless/serverless-driver), [Claude Messages API](https://platform.claude.com/docs/en/api/messages/create).

## Bu geçişte alınan sonuçlar — 15 Ekim 2026

- Mevcut Neon bağlantısına `npm run db:migrate` başarıyla uygulandı.
- Mevcut yerel giriş şifresinden scrypt özeti, mevcut client kimliğinden server CLIENT_ID ve yeni bağımsız CRON_SECRET `.env.local` içinde hazırlandı. Sırlar rapora yazılmadı.
- Gerçek workspace kaynaklarıyla `npm run build`: frontend ve server TypeScript kontrolleri ve Vite production derlemesi başarılı.
- `npm audit --omit=dev`: 0 bildirilen açık. Tüm bağımlılık raporunda Tailwind 3 geliştirme zincirinden 7 bildirim (5 yüksek, 2 orta) kaldı. Bunlar braces/glob ve CSS selector parser bağımlılıklarıyla ilişkili; production paketi raporu bu uyarıları içermiyor. Tailwind ana sürümünü değiştiren otomatik force güncelleme uygulanmadı.
- HawkScan CLI/Docker ve HAWK_API_KEY bulunmadı: DAST gerçekleştirilmedi. Güvenlik garantisi verilmez.
- Kullanıcının tercihiyle Claude anahtarı/modeli yapılandırmaya hazır bırakıldı. Canlı Claude/Gemini üretim çağrısı ve gerçek X yayını yapılmadı.
- Vercel production dağıtımı 15 Ekim 2026’da kişisel `mertgrz24s-projects/politicai` projesine yapıldı: https://politicai-cyan.vercel.app. Haricî n8n sunucusunun kapatılması ayrıca gerekir.

## Canlı dağıtım — 15 Ekim 2026

- Production adresi: https://politicai-cyan.vercel.app
- Proje: `mertgrz24s-projects/politicai`; Node.js 24.x.
- Deployment: `dpl_EkGFmu472W3wDDobxeGzbdeLTwtf`, Vercel READY.
- Vercel üzerinde frontend/server TypeScript ve production build başarılı.
- Production sunucu ayarları sensitive değişkenler olarak aktarıldı; Claude anahtarı/modeli kullanıcının tercihiyle eklenmedi. `AI_PROVIDER=claude`, günlük üretim denemesi sınırı 10.
- Canlı kontroller: `/login` ve `/news` HTML 200; oturumsuz `/api/auth/me` ve cron 401; mevcut şifreyle giriş 200, HttpOnly/Secure/SameSite çerez; oturumlu auth/me, news-list, drafts, persona ve history 200; çıkış 200.
- İçerik üretilmedi veya X yayını yapılmadı. Uygulama tasarımı korunuyor.
- `.vercelignore` sır dosyalarını, eski workflow arşivini ve kurulum belgelerini deployment kaynaklarından dışlar. `.vercel/` proje bağlantısı Git dışında tutulur.
- Claude’u açmak için Vercel production ortamına `ANTHROPIC_API_KEY` ve erişilebilir `CLAUDE_MODEL` eklenip yeniden deploy gerekir.

## Sağlayıcı tercihi — Gemini

Varsayılan sağlayıcı Gemini olarak değiştirildi. Kullanıcının tercihiyle `GEMINI_API_KEY` ve `GEMINI_MODEL` henüz eklenmedi; gerçek üretim bu iki sunucu ayarını bekliyor. Claude adaptörü korunur: ileride `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY` ve `CLAUDE_MODEL` ayarlarıyla etkinleştirilebilir. Ayarlar değişince Vercel production yeniden deploy edilmeli. Otomatik sağlayıcı değişimi veya ücretli tekrar deneme yoktur.

Gemini varsayılanı production ortamına aktarıldı; `dpl_iY6bjEvDDGH5kFsKFmASjVHU7kRM` READY, adres https://politicai-cyan.vercel.app. Sunucu/frontend TypeScript ve production build başarılı. Canlı model çağrısı yapılmadı. HawkScan runtime ve anahtarı yok: DAST gerçekleştirilemedi.
