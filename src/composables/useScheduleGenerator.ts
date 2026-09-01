import { ref, shallowRef } from 'vue'
import type { Chiusura } from '@/engine/types'
import type { RichiestaGenerazione, RispostaGenerazione } from '@/engine/worker'
import type { ScheduleResult } from '@/features/schedule/types'

/**
 * Drives the worker that generates the schedule.
 *
 * The search explores a lot and can take seconds; running it on the main thread would freeze the
 * page. In production this same engine becomes an async server task without a line changing.
 *
 * The state lives at module level on purpose: every page reads the same generated schedule, and
 * a timetable regenerated per view would be both wasteful and — since the search has ties to
 * break — potentially a DIFFERENT timetable on each page.
 */
const result = shallowRef<ScheduleResult | null>(null)
const running = ref(false)
const failure = ref<string | null>(null)
const dataProblems = ref<string[]>([])
const progress = ref<{ week: number; total: number } | null>(null)

/**
 * The worker currently searching, if any. Without this a second click — or an edit followed by a
 * regenerate — left the previous search running: two workers competing, and whichever finished
 * last won, which is not necessarily the one built from the current data.
 */
let active: Worker | null = null

function stop() {
  active?.terminate()
  active = null
  running.value = false
  progress.value = null
}

export function useScheduleGenerator() {
  function generate(data: Record<string, unknown>, closures: Chiusura[]) {
    stop()
    running.value = true
    failure.value = null
    dataProblems.value = []
    progress.value = null

    const worker = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' })
    active = worker

    worker.onmessage = (event: MessageEvent<RispostaGenerazione>) => {
      if (event.data.stato === 'avanzamento') {
        progress.value = { week: event.data.settimana, total: event.data.totali }
        return
      }
      if (event.data.stato === 'fatto') result.value = event.data.esito
      else {
        failure.value = event.data.messaggio
        dataProblems.value = event.data.problemi
      }
      stop()
    }
    worker.onerror = (event) => {
      failure.value = event.message || 'Il generatore si è fermato in modo imprevisto'
      stop()
    }
    worker.postMessage({ dati: data, chiusure: closures } satisfies RichiestaGenerazione)
  }

  return { result, running, failure, dataProblems, progress, generate, stop }
}
