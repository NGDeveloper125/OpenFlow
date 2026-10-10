import { create } from 'zustand'
import { call } from '@/engine/engineClient'
import type { ReplyFor } from '@/engine/protocol'

type EngineState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  coreVersion: string
  caps: ReplyFor<'capabilities'> | null
  error: string
  init: () => Promise<void>
}

export const useEngineStore = create<EngineState>((set, get) => ({
  status: 'idle',
  coreVersion: '',
  caps: null,
  error: '',
  init: async () => {
    if (get().status !== 'idle') return // also absorbs StrictMode's double effect run
    set({ status: 'loading' })
    try {
      const { coreVersion } = await call({ type: 'ping' })
      const caps = await call({ type: 'capabilities' })
      set({ status: 'ready', coreVersion, caps })
    } catch (e) {
      set({ status: 'error', error: String(e) })
    }
  },
}))
