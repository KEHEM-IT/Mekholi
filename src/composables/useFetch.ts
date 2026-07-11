import { ref, shallowRef, type Ref } from 'vue'
import { http } from '@/services/http'

export function useFetch<T>(path: string, immediate = true) {
  const data = shallowRef<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await http.get<T>(path)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  if (immediate) execute()

  return { data: data as Ref<T | null>, error, loading, execute }
}
