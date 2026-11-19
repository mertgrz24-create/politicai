export type Tone = 'sert' | 'uzlasmaci' | 'espriyle'
export type ReviewStatus = 'pending' | 'edited' | 'approved' | 'rejected'
export interface PreviewDraft {
  id: string
  tone: Tone
  content: string
  status: ReviewStatus
  flags: string[]
}
export interface PreviewNews {
  id: string
  title: string
  description: string
  source: string
  category: string
  date: string
  processed: boolean
  drafts: PreviewDraft[]
}
export const tones: Record<Tone, string> = {
  sert: 'Sert',
  uzlasmaci: 'Uzlaşmacı',
  espriyle: 'Espriyle',
}
export const statusLabels: Record<ReviewStatus, string> = {
  pending: 'İnceleme bekliyor',
  edited: 'Düzenlendi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
}
export const previewNews: PreviewNews[] = [
  {
    id: 'ulasim',
    title: 'Kent içi ulaşımda yeni aktarma hatları için çalışma başladı',
    description:
      'Belediye, mahalleleri raylı sistem istasyonlarına bağlayacak yeni aktarma hatları için saha çalışması başlattı. Güzergâh önerileri, mahalle toplantılarında yurttaşların görüşüne açılacak.',
    source: 'Kent Bülteni',
    category: 'Yerel yönetim',
    date: '2026-10-15T09:42:00+03:00',
    processed: false,
    drafts: [
      {
        id: 'ulasim-sert',
        tone: 'sert',
        status: 'pending',
        flags: [],
        content:
          'Ulaşım bir ayrıcalık değil, temel ihtiyaçtır. Yeni aktarma hatlarının her mahalleyi kapsaması için sürecin takipçisi olacağız. Hemşehrilerimizin zamanını da bütçesini de koruyan bir ulaşım istiyoruz.',
      },
      {
        id: 'ulasim-uzlasmaci',
        tone: 'uzlasmaci',
        status: 'pending',
        flags: [],
        content:
          'Mahallelerimizi birbirine yaklaştıran her adım kıymetli. Yeni aktarma hatları için başlayan çalışmalara hemşehrilerimizin görüşleriyle katkı sunalım. Daha erişilebilir bir kenti birlikte kurabiliriz.',
      },
      {
        id: 'ulasim-espriyle',
        tone: 'espriyle',
        status: 'pending',
        flags: ['İronik ifadeyi yayınlamadan önce gözden geçirin.'],
        content:
          'Bir aktarma, iki aktarma derken yolculuk küçük bir şehir turuna dönüşmesin. Yeni hatlar için görüşlerimizi paylaşalım; kentte birbirimize ulaşmak biraz daha kolaylaşsın.',
      },
    ],
  },
  {
    id: 'kutuphane',
    title: 'Mahalle kütüphanelerinin çalışma saatleri uzatılıyor',
    description:
      'Üç mahalle kütüphanesinde akşam çalışma saatlerinin uzatılması için pilot uygulama duyuruldu. Öğrenciler ve çalışanlar uygulamaya ilişkin önerilerini paylaşabilecek.',
    source: 'Yerel Gündem',
    category: 'Eğitim',
    date: '2026-10-15T08:18:00+03:00',
    processed: true,
    drafts: [
      {
        id: 'kutuphane-sert',
        tone: 'sert',
        status: 'pending',
        flags: [],
        content:
          'Gençlerimizin ders çalışacak bir yer bulmak için kapı kapı dolaşmasını kabul edemeyiz. Mahalle kütüphanelerinin saatlerinin uzatılmasını destekliyor, uygulamanın tüm mahallelere yayılmasını bekliyoruz.',
      },
      {
        id: 'kutuphane-uzlasmaci',
        tone: 'uzlasmaci',
        status: 'pending',
        flags: [],
        content:
          'Bir kütüphanenin ışığının biraz daha uzun yanması, bir gencin hayaline daha fazla zaman açar. Mahalle kütüphanelerindeki yeni çalışma saatlerinin ihtiyaçlara göre geliştirilmesini birlikte takip edelim.',
      },
      {
        id: 'kutuphane-espriyle',
        tone: 'espriyle',
        status: 'pending',
        flags: [],
        content:
          'Kitabın en güzel yerinde “kapatıyoruz” sesi duyulmasın. Mahalle kütüphanelerinin uzayan çalışma saatleri, okumaya ve çalışmaya biraz daha alan açacak.',
      },
    ],
  },
  {
    id: 'pazar',
    title: 'Üretici pazarında doğrudan satış alanları genişletilecek',
    description:
      'Yerel üreticilerin ürünlerini doğrudan sunabildiği pazar alanlarının genişletilmesi gündemde. Üretici birlikleriyle görüşmeler sürüyor.',
    source: 'Kent Bülteni',
    category: 'Ekonomi',
    date: '2026-10-14T14:35:00+03:00',
    processed: false,
    drafts: [
      {
        id: 'pazar-sert',
        tone: 'sert',
        status: 'pending',
        flags: [],
        content:
          'Üreticinin emeği de yurttaşın bütçesi de korunmalı. Doğrudan satış alanlarının genişletilmesi için atılacak adımları, üretici birliklerinin görüşleriyle birlikte takip edeceğiz.',
      },
      {
        id: 'pazar-uzlasmaci',
        tone: 'uzlasmaci',
        status: 'pending',
        flags: [],
        content:
          'Üretenle tüketeni aynı sofrada buluşturan pazarlar kentimiz için değerli. Yeni satış alanlarının üreticilerimizin ihtiyaçlarına göre şekillenmesine birlikte katkı sunalım.',
      },
      {
        id: 'pazar-espriyle',
        tone: 'espriyle',
        status: 'pending',
        flags: [],
        content:
          'Tarladan pazara yol kısalınca hem üreticinin hem mutfağın yüzü gülsün. Doğrudan satış alanlarının genişletilmesi için üreticilerimizin sesine kulak verelim.',
      },
    ],
  },
]
export const demoHistory = [
  {
    id: 'h1',
    date: '14 Ekim · 16.20',
    tone: 'Uzlaşmacı',
    content:
      'Kentimizin geleceğini konuşmak için mahalle buluşmasındaydık. Önerilerini paylaşan tüm hemşehrilerimize teşekkür ediyoruz.',
    source: 'Mahalle buluşması',
  },
  {
    id: 'h2',
    date: '13 Ekim · 11.45',
    tone: 'Sert',
    content:
      'Kamusal alanların herkes için erişilebilir olması gerekiyor. Kaldırımlardan parklara, kentte önümüze çıkan engelleri birlikte kaldıracağız.',
    source: 'Erişilebilir kent çalışması',
  },
]
