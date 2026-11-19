import { readFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { Client, neonConfig } from '@neondatabase/serverless'
import { required, uuid } from '../server/core.js'

Object.assign(process.env, loadEnv('development', process.cwd(), ''))
neonConfig.webSocketConstructor = WebSocket
const connection = new Client(required('DATABASE_URL'))
await connection.connect()
try {
  await connection.query('BEGIN')
  await connection.query("SELECT pg_advisory_xact_lock(hashtextextended('politicai-migrations', 0))")
  await connection.query('CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
  const migration = '001_vercel_backend'
  const applied = await connection.query('SELECT name FROM app_migrations WHERE name=$1', [migration])
  if (!applied.rows.length) {
    const schema = await connection.query("SELECT to_regclass('public.clients') AS clients")
    const statements = []
    if (!schema.rows[0].clients) {
      // Historic filename retained so existing installations keep one schema definition.
      statements.push(await readFile(new URL('../supabase/migrations/20260513000000_initial_schema.sql', import.meta.url), 'utf8'))
    }
    statements.push(await readFile(new URL('../database/migrations/001_vercel_backend.sql', import.meta.url), 'utf8'))
    for (const statement of statements) await connection.query(statement)
    await connection.query('INSERT INTO app_migrations (name) VALUES ($1)', [migration])
    console.log('Vercel backend migration applied.')
  } else console.log('Database migration already applied.')
  const client = uuid(required('CLIENT_ID'))
  await connection.query("INSERT INTO clients (id, display_name) VALUES ($1, 'PoliticAI çalışma alanı') ON CONFLICT (id) DO NOTHING", [client])
  await connection.query('COMMIT')
  console.log('Workspace client is ready. Create or review the persona in the application.')
} catch {
  await connection.query('ROLLBACK')
  console.error('Migration failed; no changes committed. Check the database schema, duplicate personas and environment configuration.')
  process.exitCode = 1
} finally { await connection.end() }
