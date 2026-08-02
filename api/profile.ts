// Vercel serverless function — reads/writes institute profile from Neon
import { neon } from '@neondatabase/serverless'

export default async function handler(req: Request) {
  const sql = neon(process.env.DATABASE_URL!)
  const url = new URL(req.url)
  const eiin = url.searchParams.get('eiin') || '130430'

  if (req.method === 'GET') {
    const [row] = await sql`
      SELECT data FROM institute_profiles WHERE eiin = ${eiin}
    `
    if (!row) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify(row.data), {
      headers: { 'content-type': 'application/json' },
    })
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const body = await req.json()
    await sql`
      INSERT INTO institute_profiles (eiin, data, updated_at)
      VALUES (${eiin}, ${JSON.stringify(body)}, NOW())
      ON CONFLICT (eiin) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'content-type': 'application/json' },
  })
}
