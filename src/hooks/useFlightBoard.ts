/**
 * useFlightBoard — Custom React Hook
 *
 * PATTERN: Custom Hook — separates all board state orchestration (fetch,
 * filter, refresh, auto-poll) from the presentation layer. Components below
 * this hook are purely presentational and never touch APIs directly.
 *
 * PATTERN: Command (GoF, Behavioural) — `refresh` is an imperative command
 * the UI can invoke without knowing the underlying fetch orchestration. The
 * hook encapsulates "how to refresh"; components only know "call refresh()".
 *
 * Data flow:
 *   useAirportDetection (iataCode, ready)
 *     → useFlightBoard
 *       → FlightRepository.fetchDepartures()   [Chain of Responsibility]
 *         → strategies[]                       [Strategy chain]
 *           → Flight[]
 *       → client-side filter (useMemo)
 *         → filteredFlights[]
 *
 * Auto-refresh cadence: 60 s — matches typical FIDS update frequency at
 * major airports and stays within free-tier API rate limits.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { flightRepository } from "../data/repository"
import { toClock } from "../utils/time"
import type { Flight } from "../domain/flight"

const AUTO_REFRESH_MS = 60_000

export type FlightBoardState = {
  flights:         Flight[]
  filteredFlights: Flight[]
  sourceName:      string
  isLoading:       boolean
  updatedAt:       string
  query:           string
  setQuery:        (q: string) => void
  /** Imperatively trigger a data refresh — safe to call while a fetch is in flight. */
  refresh:         () => void
}

export function useFlightBoard(
  iataCode: string,
  /** Gate from useAirportDetection — prevents fetching against a stale timezone guess. */
  ready: boolean,
): FlightBoardState {
  const [flights,    setFlights]    = useState<Flight[]>([])
  const [sourceName, setSourceName] = useState("—")
  const [isLoading,  setIsLoading]  = useState(true)
  const [updatedAt,  setUpdatedAt]  = useState("--:--")
  const [query,      setQuery]      = useState("")

  /**
   * useCallback stabilises the function reference so the useEffect dependency
   * array remains accurate — without it, every render would produce a new
   * `refresh` function and trigger an infinite fetch loop.
   */
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    try {
      const result = await flightRepository.fetchDepartures(iataCode, signal)
      setFlights(result.flights)
      setSourceName(result.sourceName)
    } finally {
      // Always update the timestamp, even on partial failure.
      setUpdatedAt(toClock(new Date().toISOString()))
      setIsLoading(false)
    }
  }, [iataCode])

  // Initial fetch — gated on `ready` so airport detection settles first.
  // AbortController ensures any in-flight request is cancelled on unmount or
  // iataCode change, preventing stale state updates.
  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    refresh(controller.signal)
    return () => controller.abort()
  }, [ready, refresh])

  // Auto-refresh every 60 s without a full page reload.
  useEffect(() => {
    if (!ready) return
    const id = setInterval(() => refresh(), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [ready, refresh])

  /**
   * Client-side full-text filter over destination, flight number, and airline
   * code. useMemo prevents re-filtering on re-renders unrelated to data or query.
   *
   * An empty query returns the full unfiltered list (short-circuit avoids the
   * string operations entirely when the search box is blank).
   */
  const filteredFlights = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return flights
    return flights.filter((f) =>
      `${f.destination} ${f.flightNumber} ${f.airlineCode}`
        .toLowerCase()
        .includes(term),
    )
  }, [flights, query])

  return {
    flights,
    filteredFlights,
    sourceName,
    isLoading,
    updatedAt,
    query,
    setQuery,
    // Expose a zero-argument public API — the internal AbortSignal is an
    // implementation detail the UI has no business knowing about.
    refresh: () => refresh(),
  }
}
