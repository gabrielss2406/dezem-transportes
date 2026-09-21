import { useEffect, useRef, useState } from 'react'
import { fortnightRangeFromKey, monthRangeFromKey } from '../lib/utils'

interface PeriodShortcutsProps {
  monthKey: string
  onMonthChange: (monthKey: string) => void
  onRangeChange: (range: { start: string; end: string }) => void
}

export function PeriodShortcuts({ monthKey, onMonthChange, onRangeChange }: PeriodShortcutsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown)
  }, [open])

  const applyRange = (range: { start: string; end: string }) => {
    onRangeChange(range)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Atalhos de período"
        title="Atalhos de período"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-outline-variant/20 bg-surface-container-highest p-2 shadow-xl">
          <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Atalhos
          </p>
          <button
            type="button"
            className="w-full rounded-lg px-2 py-2 text-left text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary"
            onClick={() => applyRange(fortnightRangeFromKey(monthKey, 1))}
          >
            1ª quinzena
          </button>
          <button
            type="button"
            className="w-full rounded-lg px-2 py-2 text-left text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary"
            onClick={() => applyRange(fortnightRangeFromKey(monthKey, 2))}
          >
            2ª quinzena
          </button>
          <div className="mt-1 border-t border-outline-variant/15 px-2 pt-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              Escolher mês
              <input
                type="month"
                value={monthKey}
                onChange={(event) => {
                  const nextMonth = event.target.value
                  onMonthChange(nextMonth)
                  applyRange(monthRangeFromKey(nextMonth))
                }}
                className="mt-1 w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-2 py-2 text-xs text-on-surface outline-none focus:border-primary"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
