export function FernTerminal() {
  const mockLines = [
    { prompt: true, text: 'fern session start --channels plugin:imessage' },
    { prompt: false, text: 'Session started. Loading context...' },
    { prompt: false, text: 'Read 01-daily/2026/04/2026-04-03.md' },
    { prompt: false, text: 'Read 02-memory/state.md' },
    { prompt: false, text: 'Read 02-memory/promises.md' },
    { prompt: false, text: 'Cron jobs re-created (7/7)' },
    { prompt: false, text: 'iMessage channel connected' },
    { prompt: false, text: '' },
    { prompt: true, text: 'Listening for messages...' },
  ]

  return (
    <div className="h-full flex flex-col bg-bg-dark rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blocked/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-reed/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-working/60" />
        </div>
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium ml-2">
          Fern Terminal
        </h3>
      </div>

      <div className="flex-1 p-4 font-mono text-[0.7rem] leading-relaxed overflow-y-auto feed-scroll">
        {mockLines.map((line, i) => (
          <div key={i} className={line.text === '' ? 'h-3' : ''}>
            {line.prompt ? (
              <span>
                <span className="text-fern">fern $</span>{' '}
                <span className="text-gray-300">{line.text}</span>
              </span>
            ) : (
              <span className="text-gray-500">{line.text}</span>
            )}
          </div>
        ))}
        <div className="mt-1 flex items-center">
          <span className="text-fern">fern $</span>
          <span className="ml-1.5 w-2 h-3.5 bg-fern/70 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
