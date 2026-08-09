import type { App } from 'vue'
import NIDScanner from './NIDScanner.vue'
import { nidScannerService } from './nidScannerService'

export { NIDScanner, nidScannerService }
export type { NIDScanResult } from './nidScannerService'

export default {
  install(app: App) {
    app.component('NIDScanner', NIDScanner)
    app.config.globalProperties.$nidScanner = nidScannerService
  },
}
