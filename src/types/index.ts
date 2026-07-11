export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'staff'
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface Pagination {
  page: number
  perPage: number
  total: number
}

export type NavItem = {
  label: string
  to: string
  icon?: string
  roles?: User['role'][]
}
