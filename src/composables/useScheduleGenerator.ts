import { ref, shallowRef } from 'vue'
import type { Chiusura } from '@/engine/types'
import type { RichiestaGenerazione, RispostaGenerazione } from '@/engine/worker'
import type { ScheduleResult } from '@/features/schedule/types'

/**
 * Drives the worker that generates the schedule.
 *
 * The search explores a lot and can take seconds; running it on the main thread would freeze the
 * page. In production this same engine becomes an async server task without a line changing.
 */
export function useScheduleGenerator() {
  const result = shallowRef<ScheduleResult | null>(null)
  const running = ref(false)
  const failure = ref<string | null>(null)
  const dataProblems = ref<string[]>([])

  function generate(data: Record<string, unknown>, closures: Chiusura[]) {
    running.value = true
    failure.value = null
    dataProblems.value = []

    const worker = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (event: MessageEvent<RispostaGenerazione>) => {
      if (event.data.stato === 'fatto') result.value = event.data.esito
      else {
        failure.value = event.data.messaggio
        dataProblems.value = event.data.problemi
      }
      running.value = false
      worker.terminate()
    }
    worker.onerror = (event) => {
      failure.value = event.message || 'Il generatore si è fermato in modo imprevisto'
      running.value = false
      worker.terminate()
    }
    worker.postMessage({ dati: data, chiusure: closures } satisfies RichiestaGenerazione)
  }

  return { result, running, failure, dataProblems, generate }
}
