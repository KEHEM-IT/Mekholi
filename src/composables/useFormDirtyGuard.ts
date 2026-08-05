// Guards against losing unsaved form changes.
//
// - Deep-watches a reactive form object and compares it against the last
//   saved snapshot; exposes isDirty / hasChanges()
// - Shows a toast the moment the form becomes dirty (once per transition)
// - Attaches a `beforeunload` handler so closing the tab / reloading with
//   unsaved changes triggers the browser's native "leave site?" warning
// - The page can call markClean() after a successful save / restore, and
//   can check hasChanges() to skip pointless DB writes
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useToast } from './useToast'

export interface FormDirtyGuardOptions {
  /** Called on every watched change; return true to skip evaluation (e.g. while restoring a profile). */
  isRestoring?: () => boolean
  /** Toast text shown when the form becomes dirty. */
  dirtyToast?: string
}

export function useFormDirtyGuard<T extends object>(form: T, options: FormDirtyGuardOptions = {}) {
  const toast = useToast()
  const isDirty = ref(false)
  let savedSnapshot = ''

  function takeSnapshot(): string {
    return JSON.stringify(form)
  }

  /** Call after a successful save or after restoring data — resets the baseline. */
  function markClean() {
    savedSnapshot = takeSnapshot()
    isDirty.value = false
  }

  /** True when the form currently differs from the last saved/restored state. */
  function hasChanges(): boolean {
    return takeSnapshot() !== savedSnapshot
  }

  watch(
    form,
    () => {
      if (options.isRestoring?.()) return
      const dirty = hasChanges()
      if (dirty !== isDirty.value) {
        isDirty.value = dirty
        if (dirty) toast.info(options.dirtyToast ?? 'You have unsaved changes')
      }
    },
    { deep: true },
  )

  // Native browser warning on tab close / reload with unsaved changes.
  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  return { isDirty, markClean, hasChanges }
}
