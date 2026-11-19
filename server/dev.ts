import { createServer } from 'node:http'
import { createServer as createViteServer, loadEnv } from 'vite'
import { nodeHandler } from './http.js'

Object.assign(process.env, loadEnv('development', process.cwd(), ''))
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
const tasks = new Set<Promise<unknown>>()
const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/')) {
    void nodeHandler(req, res, task => {
      tasks.add(task)
      void task.finally(() => tasks.delete(task)).catch(() => console.error('Background operation failed.'))
    })
  } else vite.middlewares(req, res)
})
const port = Number(process.env.PORT || 5173)
server.listen(port, '127.0.0.1', () => console.log(`PoliticAI web + API: http://127.0.0.1:${port}`))
async function shutdown() {
  server.close()
  await Promise.allSettled([...tasks])
  await vite.close()
  process.exit(0)
}
process.on('SIGTERM', () => { void shutdown() })
process.on('SIGINT', () => { void shutdown() })
