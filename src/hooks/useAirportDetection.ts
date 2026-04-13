/**
 * useAirportDetection — Custom React Hook
 *
 * PATTERN: Custom Hook — wraps the two-phase airport detection strategy
 * behind a single hook that emits a stable state object.
 *
 * Detection runs in two sequential phases:
 *
 *   Phase 1 — Synchronous (zero latency, no permissions)
 *     Reads the browser's IANA timezone and maps it to the nearest hub airport
 *     via TIMEZONE_AIRPORT_MAP. This seeds the board immediately on first render.
 *
 *   Phase 2 — Asynchronous (up to 3.5 s, requires geolocation permission)
 *     Requests the device's GPS coordinates and finds the nearest airport by
 *     Euclidean distance. Overwrites the Phase 1 result if it resolves.
 *     Silently falls back to Phase 1 on denial, timeout, or error.
 *
 * The `ready` flag gates data fetching in useFlightBoard so the board always
 * loads against the best available airport — not a stale Phase 1 guess that
 * may be corrected 3 seconds later.
 */

import { useEffect, useState } from "react"
import {
  detectFromTimezone,
  detectFromGeolocation,
} from "../domain/airport"
import type { LocalAirport } from "../domain/airport"

type AirportDetectionState = {
  airport: LocalAirport
  /**
   * Becomes true once geolocation has settled (resolved, denied, or timed out).
   * Always becomes true — it is the hook's completion signal, not a success flag.
   */
  ready: boolean
}

export function useAirportDetection(): AirportDetectionState {
  const [state, setState] = useState<AirportDetectionState>({
    airport: detectFromTimezone(), // Phase 1: synchronous seed
    ready: false,
  })

  useEffect(() => {
    let cancelled = false

    detectFromGeolocation().then((geo) => {
      if (cancelled) return
      setState({
        // Phase 2 wins if it resolved; otherwise keep Phase 1 result.
        airport: geo ?? detectFromTimezone(),
        ready: true,
      })
    })

    // Cleanup prevents a setState call on an unmounted component if geolocation
    // is still pending when the component tree is torn down.
    return () => {
      cancelled = true
    }
  }, []) // Runs once: airport detection is a one-shot operation per session.

  return state
}
