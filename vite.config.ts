import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// Dev-only middleware backing the Institute Setup > Excel Import feature.
// The app is a pure static SPA with no backend, but "save the parsed
// Excel as a JSON file in src/assets/school" needs real filesystem
// access - so during `pnpm dev` we expose two tiny endpoints that read/
// write *only* inside src/assets/school. Never registered for
// `vite build`/`vite preview`, same spirit as the dev-only fake login.
function instituteSetupImportApi(): Plugin {
  const SCHOOL_DIR = fileURLToPath(new URL('./src/assets/school', import.meta.url))
  // Letters (incl. Bengali), digits, space, dash, underscore, dot - nothing
  // that could be used to escape SCHOOL_DIR (no slashes/backslashes/"..").
  const SAFE_NAME = /^[\p{L}\p{N} _.-]+$/u

  function resolveJsonPath(rawName: string): string | null {
    const name = rawName.trim().replace(/\.json$/i, '')
    if (!name || !SAFE_NAME.test(name)) return null
    const full = path.join(SCHOOL_DIR, `${name}.json`)
    if (!full.startsWith(SCHOOL_DIR)) return null
    return full
  }

  function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = ''
      req.on('data', (chunk) => (data += chunk))
      req.on('end', () => resolve(data))
      req.on('error', reject)
    })
  }

  return {
    name: 'institute-setup-import-api',
    apply: 'serve',
    configureServer(server) {
      fs.mkdirSync(SCHOOL_DIR, { recursive: true })

      server.middlewares.use('/__institute-setup/import', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        try {
          const body = JSON.parse((await readBody(req)) || '{}') as {
            fileName?: string
            data?: unknown
          }
          const filePath = resolveJsonPath(body.fileName ?? '')
          if (!filePath || body.data === undefined) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, message: 'Invalid fileName or data' }))
            return
          }
          fs.writeFileSync(filePath, JSON.stringify(body.data, null, 2), 'utf-8')
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, path: `src/assets/school/${path.basename(filePath)}` }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, message: (err as Error).message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    instituteSetupImportApi(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Bind to all interfaces so the dev server is reachable from other
    // devices on the LAN (phone testing) — Vite prints the Network URL.
    host: true,
    port: 5173,
    // Allow any preview host (sandbox/cloud preview domains) in dev.
    allowedHosts: true,
  },
})
