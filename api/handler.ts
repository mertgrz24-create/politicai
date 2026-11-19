import { waitUntil } from '@vercel/functions'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { nodeHandler } from '../server/http.js'

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return nodeHandler(request, response, task => waitUntil(task))
}
