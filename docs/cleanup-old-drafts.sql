-- PoliticAI: eski taslakları ve üretim işlerini temizler.
-- Neon konsolunda (SQL Editor) çalıştır. ÖNCE Neon'da branch/yedek al.
-- Yayınlanmış kayıtlara (posts) ve iletişim profiline (personas) dokunmaz.
-- <CLIENT_ID> yerine Vercel'deki CLIENT_ID değerini yaz (SELECT id FROM clients; ile de görebilirsin).

-- 1) Önce ne silineceğine bak (sadece okur):
SELECT
  (SELECT count(*) FROM drafts     WHERE client_id = 'd447edbe-6865-43ee-a681-5161c738c986') AS taslak,
  (SELECT count(*) FROM draft_jobs WHERE client_id = 'd447edbe-6865-43ee-a681-5161c738c986') AS uretim_isi,
  (SELECT count(*) FROM posts      WHERE client_id = 'd447edbe-6865-43ee-a681-5161c738c986') AS yayin_kaydi;

-- 2) Sayılar beklediğin gibiyse çalıştır. posts.draft_id taslağa bağlıysa
--    veritabanı silmeyi reddedebilir; hata alırsan işlem geri alınır ve bana yaz.
BEGIN;
DELETE FROM drafts     WHERE client_id = 'd447edbe-6865-43ee-a681-5161c738c986';
DELETE FROM draft_jobs WHERE client_id = 'd447edbe-6865-43ee-a681-5161c738c986';
-- Haberler tekrar "Yeni haber" olarak işaretlensin:
UPDATE news_pool SET processed = false;
COMMIT;
