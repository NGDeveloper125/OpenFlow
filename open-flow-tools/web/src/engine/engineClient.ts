import type { RequestType, RequestBody, ReplyFor, Response } from './protocol'

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (r: Response) => void; reject: (e: Error) => void }>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<Response>) => {
      const p = pending.get(e.data.id)
      if (!p) return // later: route id-less events (epochEnd, ...) to listeners here
      pending.delete(e.data.id)
      if (e.data.type === 'error') p.reject(new Error(e.data.message))
      else p.resolve(e.data)
    }
  }
  return worker
}

export function call<T extends RequestType>(req: RequestBody<T> & { type: T }): Promise<ReplyFor<T>> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (r: Response) => void, reject })
    getWorker().postMessage({ ...req, id })
  })
}
