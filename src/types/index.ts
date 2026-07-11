export type UserRole = 'super_admin' | 'institute_admin' | 'teacher' | 'accountant' | 'student_parent_portal'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
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

// Shape of src/assets/navigation/shikkha_erp_navigation.json
export interface NavSubMenu {
  name: string
  name_bn: string
  icon: string
}

export interface NavMenu {
  menu: string
  menu_bn: string
  icon: string
  sub_menus: NavSubMenu[]
}

export type NavigationMap = Record<UserRole, NavMenu[]>

export interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  icon: string
}
