// UI -> worker
export type Request =
  | { id: number; type: 'ping' }
  | { id: number; type: 'capabilities' }

// worker -> UI. Replies reuse the request's `type`, so they can be matched by type.
export type Response =
  | { id: number; type: 'ping'; coreVersion: string }
  | { id: number; type: 'capabilities'; simd: boolean; threads: boolean; crossOriginIsolated: boolean; cores: number }
  | { id: number; type: 'error'; message: string }

export type RequestType = Request['type']
export type ReplyFor<T extends RequestType> = Extract<Response, { type: T }>
export type RequestBody<T extends RequestType> = Omit<Extract<Request, { type: T }>, 'id'>
