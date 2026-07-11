export const APP_NAME = 'Madol'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const TOKEN_KEY = 'madol_auth_token'

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const
