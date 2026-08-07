// Global type for the app-wide $t translator available in every template
// (registered on app.config.globalProperties in main.ts).
import type { TranslateParams } from './index'

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string, params?: TranslateParams) => string
  }
}

export {}
