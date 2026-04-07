import { useState, useEffect } from 'react'

interface HeaderProps {
  connected: boolean
  usingSeed: boolean
}

export function Header({ connected, usingSeed }: HeaderProps) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    function tick() {
      setClock(
        new Date().toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="text-center py-5 px-4 bg-gradient-to-br from-bg-card to-bg-primary border-b border-border">
      <h1 className="text-xl font-semibold text-fern tracking-wide">
        Mission Control
      </h1>
      <div className="text-xs text-gray-500 mt-1">{clock}</div>
      <div className="mt-2 flex items-center justify-center gap-2 text-xs">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            connected
              ? 'bg-working'
              : usingSeed
                ? 'bg-reed'
                : 'bg-blocked'
          }`}
        />
        <span className={connected ? 'text-working' : usingSeed ? 'text-reed' : 'text-blocked'}>
          {connected ? 'live' : usingSeed ? 'demo mode' : 'disconnected'}
        </span>
      </div>
    </header>
  )
}
