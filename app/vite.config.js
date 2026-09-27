import dotenv from 'dotenv'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { handleGeminiChat } from './server/gemini.js'

const root = fileURLToPath(new URL('.', import.meta.url))
dotenv.config({ path: resolve(root, '.env') })

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'gridalign-gemini-api',
      configureServer(server) {
        server.middlewares.use('/api/chat', (request, response) => {
          void handleGeminiChat(request, response)
        })
      },
    },
  ],
})
