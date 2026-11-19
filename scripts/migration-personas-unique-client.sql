-- PoliticAI — personas.client_id unique constraint
-- Neon SQL Editor'da veya psql ile bir kez çalıştır.
--
-- Neden: politicai-persona-api upsert'i ON CONFLICT (client_id) kullanıyor;
-- bu, client_id üzerinde unique constraint olmadan "no unique or exclusion
-- constraint matching the ON CONFLICT specification" hatası verir.

begin;

-- Olası duplicate kayıtları temizle: her client için en son güncellenen kalır
delete from personas p
using personas q
where p.client_id = q.client_id
  and p.id <> q.id
  and (p.updated_at, p.id) < (q.updated_at, q.id);

create unique index if not exists personas_client_id_key
  on personas (client_id);

commit;
