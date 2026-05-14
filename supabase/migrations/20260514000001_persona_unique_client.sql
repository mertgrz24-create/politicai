-- persona başına bir client: upsert (ON CONFLICT) için zorunlu
alter table personas add constraint personas_client_id_key unique (client_id);
