/**
 * useClock — Custom React Hook
 *
 * PATTERN: Custom Hook — encapsulates the setInterval lifecycle (setup on
 * mount, clearInterval on unmount) so components receive a stable clock string
 * without owning timer logic. Follows the single-responsibility principle:
 * this hook knows only about ticking time.
 *
 * Returns a seconds-precision "HH:mm:ss" string that updates every 1 000 ms.
 */

import { useEffect, useState } from "react"

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function useClock(): string {
  const [clock, setClock] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1_000)
    // Cleanup: clear the interval on unmount to prevent setState calls on an
    // unmounted component — the most common source of React memory-leak warnings.
    return () => clearInterval(id)
  }, []) // Empty deps: interval is registered once and never re-created.

  return clock
}
