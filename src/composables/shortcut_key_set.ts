import { onBeforeUnmount, onMounted } from "vue";

// Generic keyboard-shortcut binder. Not sidebar-specific - any component can
// register a set of key combos (e.g. Ctrl+M, Ctrl+K, Alt+Shift+D) and have
// them wired/unwired automatically with the component's lifecycle.

export interface ShortcutBinding {
  /** e.g. 'm', 'k', 'Escape' - compared case-insensitively against event.key */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (event: KeyboardEvent) => void;
  /**
   * By default, shortcuts are ignored while the user is typing in an
   * <input>, <textarea>, <select>, or a contenteditable element, so a
   * single-letter combo like Ctrl+M doesn't fire while composing text.
   * Set true to let this binding fire everywhere regardless of focus.
   */
  allowInInputs?: boolean;
  /**
   * Whether to call event.preventDefault() on match. Defaults to true,
   * since most bound combos (Ctrl+M, Ctrl+K, ...) also carry a native
   * browser/OS meaning we want to suppress.
   */
  preventDefault?: boolean;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}

function matches(event: KeyboardEvent, binding: ShortcutBinding): boolean {
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;

  // Treat Ctrl and Cmd interchangeably so one binding covers Windows/Linux
  // (ctrlKey) and macOS (metaKey) without duplicate registrations.
  const wantsCtrlOrMeta = !!binding.ctrl;
  const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
  if (wantsCtrlOrMeta !== hasCtrlOrMeta) return false;

  if (!!binding.shift !== event.shiftKey) return false;
  if (!!binding.alt !== event.altKey) return false;

  return true;
}

/**
 * Registers a set of keyboard shortcuts for the lifetime of the calling
 * component. Bindings are checked in order; the first match wins.
 *
 * @example
 * useShortcutKeySet([
 *   { key: 'm', ctrl: true, handler: () => toggleSidebar() },
 * ])
 */
export function useShortcutKeySet(bindings: ShortcutBinding[]) {
  function onKeydown(event: KeyboardEvent) {
    if (event.repeat) return;

    for (const binding of bindings) {
      if (!matches(event, binding)) continue;
      if (!binding.allowInInputs && isTypingTarget(event.target)) continue;

      if (binding.preventDefault !== false) event.preventDefault();
      binding.handler(event);
      break;
    }
  }

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
}
