import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

/**
 * Routing off the URL hash, in a dozen lines and no dependency.
 *
 * A demo gets shared as a link — "look at Pino's availability" — so the view has to survive a
 * reload and a paste. That is all a router would buy here, and `hashchange` already does it:
 * nothing to configure on the host, no library to keep current.
 */
export function useHashRoute<T extends string>(routes: readonly T[], fallback: T): Ref<T> {
  const read = (): T => {
    const value = window.location.hash.replace(/^#\/?/, '').split('/')[0]
    return (routes as readonly string[]).includes(value) ? (value as T) : fallback
  }

  const current = ref(fallback) as Ref<T>
  const sync = () => {
    current.value = read()
  }

  onMounted(() => {
    sync()
    window.addEventListener('hashchange', sync)
  })
  onUnmounted(() => window.removeEventListener('hashchange', sync))

  watch(current, (value) => {
    if (read() !== value) window.location.hash = `/${value}`
  })

  return current
}
