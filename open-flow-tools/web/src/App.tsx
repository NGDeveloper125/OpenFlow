import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { steps } from '@/steps'
import { useEngineStore } from '@/stores/engine'

export default function App() {
  const { status, coreVersion, caps, error, init } = useEngineStore()
  useEffect(() => { init() }, [init])

  return (
    <>
      <header className="topbar">
        <strong>OpenFlow</strong>
        {status === 'ready' ? (
          <span>
            Core v{coreVersion} · SIMD {caps?.simd ? '✓' : '✗'} · threads{' '}
            {caps?.threads && caps?.crossOriginIsolated ? '✓' : '✗'}
          </span>
        ) : status === 'error' ? (
          <span className="err">Engine error: {error}</span>
        ) : (
          <span>Loading engine…</span>
        )}
      </header>
      <div className="layout">
        <nav>
          {steps.map((s) => (
            <NavLink key={s.path} to={s.path}>{s.label}</NavLink>
          ))}
        </nav>
        <main><Outlet /></main>
      </div>
    </>
  )
}
