import dotenv from 'dotenv'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleGeminiChat } from './server/gemini.js'

const root = fileURLToPath(new URL('.', import.meta.url))
dotenv.config({ path: resolve(root, '.env') })
const distDirectory = resolve(root, 'dist')
const port = Number(process.env.PORT || 4178)
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (requestUrl.pathname === '/api/chat') {
    await handleGeminiChat(request, response)
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end('Method not allowed')
    return
  }

  let requestedPath
  try {
    requestedPath = decodeURIComponent(requestUrl.pathname)
  } catch {
    response.writeHead(400)
    response.end('Invalid path')
    return
  }

  const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.slice(1)
  let filePath = resolve(distDirectory, relativePath)
  if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${sep}`)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  try {
    const fileInfo = await stat(filePath)
    if (fileInfo.isDirectory()) filePath = resolve(filePath, 'index.html')
    const content = await readFile(filePath)
    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(request.method === 'HEAD' ? undefined : content)
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
      response.writeHead(500)
      response.end('Unable to read the requested app file')
      return
    }

    try {
      const index = await readFile(resolve(distDirectory, 'index.html'))
      response.writeHead(200, { 'Content-Type': mimeTypes['.html'] })
      response.end(index)
    } catch {
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Built app not found. Run npm run build before starting the production server.')
    }
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`GridAlign listening on port ${port}`)
})
