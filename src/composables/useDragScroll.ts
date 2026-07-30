// D:\Web\ERP\Mekholi\src\composables\useDragScroll.ts
import { onBeforeUnmount, ref } from 'vue'

/**
 * Click-and-drag ("grab to scroll") panning for any scrollable container -
 * wide tables, tab strips, horizontal card rails, etc. Works for either
 * axis; a container that only overflows horizontally (e.g. `overflow-x:
 * auto`) simply never moves vertically since scrollTop has nowhere to go.
 *
 * Usage:
 *   const { elRef, isDragging, onMouseDown } = useDragScroll()
 *
 *   <div ref="elRef" @mousedown="onMouseDown" :class="{ 'is-drag-scrolling': isDragging }">
 *
 * Pair with CSS on the target element:
 *   cursor: grab;
 *   &.is-drag-scrolling { cursor: grabbing; user-select: none; }
 */
export function useDragScroll<T extends HTMLElement = HTMLElement>() {
  const elRef = ref<T | null>(null)
  const isDragging = ref(false)

  let startX = 0
  let startY = 0
  let startScrollLeft = 0
  let startScrollTop = 0

  function onMouseDown(e: MouseEvent) {
    const el = elRef.value
    if (!el || e.button !== 0) return
    // Don't hijack normal interaction with anything clickable inside.
    if (e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea, select')) return
    // Nothing to pan if the content doesn't actually overflow.
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return

    // Stop the browser's own native text/cell-selection drag from starting -
    // without this, the first move after mousedown can get hijacked into a
    // native selection drag instead of our scroll, so panning only feels
    // like it "kicks in" after an extra click.
    e.preventDefault()

    isDragging.value = true
    startX = e.clientX
    startY = e.clientY
    startScrollLeft = el.scrollLeft
    startScrollTop = el.scrollTop

    // Bound on window (not just the element) so dragging keeps tracking
    // even if the cursor slips outside the container mid-drag.
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    const el = elRef.value
    if (!el || !isDragging.value) return
    e.preventDefault()
    el.scrollLeft = startScrollLeft - (e.clientX - startX)
    el.scrollTop = startScrollTop - (e.clientY - startY)
  }

  function onMouseUp() {
    isDragging.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  onBeforeUnmount(onMouseUp)

  return { elRef, isDragging, onMouseDown }
}
