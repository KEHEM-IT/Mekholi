import { API_BASE_URL, TOKEN_KEY } from '@/utils/constants'

interface RequestOptions extends RequestInit {
  auth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      ;(finalHeaders as Record<string, string>).Authorization = `Bearer ${token}`
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, headers: finalHeaders })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || `Request failed with status ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
