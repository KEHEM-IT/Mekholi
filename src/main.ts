import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { translate } from './Translator'
import './styles/main.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Global translator — `$t('staff.male')` works in any template app-wide,
// reactive to the user's chosen language (see src/Translator/).
app.config.globalProperties.$t = translate

// Route uncaught component/render errors to the generic ErrorView instead of
// a blank screen. This only covers synchronous/reactive errors Vue can see
// (not e.g. raw window "error"/"unhandledrejection" events) — see
// pages/ErrorView.vue for how the message/details query params are read.
app.config.errorHandler = (err, _instance, info) => {
  console.error(err, info)
  router.push({
    name: 'error',
    query: {
      message: err instanceof Error ? err.message : 'Unexpected error',
      details: info,
    },
  })
}

app.mount('#app')
