/// <reference lib="webworker" />
import init, { version } from './pkg/ui_tools.js'
import { simd, threads } from 'wasm-feature-detect'
import type { Request, Response } from './protocol'

const ready = init() // fetches + instantiates ui_tools_bg.wasm once

const post = (msg: Response) => self.postMessage(msg)

self.onmessage = async (e: MessageEvent<Request>) => {
  const msg = e.data
  try {
    await ready
    switch (msg.type) {
      case 'ping':
        post({ id: msg.id, type: 'ping', coreVersion: version() })
        break
      case 'capabilities':
        post({
          id: msg.id,
          type: 'capabilities',
          simd: await simd(),
          threads: await threads(),
          crossOriginIsolated: self.crossOriginIsolated,
          cores: navigator.hardwareConcurrency,
        })
        break
    }
  } catch (err) {
    post({ id: msg.id, type: 'error', message: String(err) })
  }
}
