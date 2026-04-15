/**
 * FlightBoard
 *
 * PATTERN: Presentational Component — owns layout only. Receives pre-filtered
 * flights from useFlightBoard and is responsible for splitting them into the
 * two-column grid and rendering the appropriate empty state.
 *
 * Column split: left gets the ceiling-half, right gets the remainder. When
 * the total is odd, the left column is one row longer, which reads naturally
 * top-to-bottom on a departure board.
 *
 * Empty state hierarchy:
 *   isLoading=true          → skeleton/loading row
 *   flights=[] && !query    → "No departures found for {iata}"
 *   flights=[] && query     → "No results for "{query}""
 *   flights.length > 0      → two-column board (right panel hidden when < 2 rows)
 */

import type { JSX } from "react"
import type { Flight } from "../domain/flight"
import { BoardRow } from "./BoardRow"

type Props = {
  flights:   Flight[]
  isLoading: boolean
  iataCode:  string
}

// Column header labels — extracted as a constant so they render consistently
// across both panels and can be updated in one place.
const COLUMN_LABELS = ["Airline", "Flight", "To", "Time", "Gate", "Status"] as const

function BoardPanel({ flights }: { flights: Flight[] }): JSX.Element {
  return (
    <div className="board-panel">
      {/* aria-hidden: the column headers are presentational; screen readers
          should navigate by row content, not by repeated header cells. */}
      <div className="board-table board-table--head" aria-hidden="true">
        {COLUMN_LABELS.map((col) => <span key={col}>{col}</span>)}
      </div>
      {flights.map((f) => <BoardRow key={f.id} flight={f} />)}
    </div>
  )
}

export function FlightBoard({ flights, isLoading, iataCode }: Props): JSX.Element {
  if (isLoading) {
    return (
      <div className="board-wrap">
        <p className="board-note" aria-live="polite">Loading departures...</p>
      </div>
    )
  }

  if (flights.length === 0) {
    return (
      <div className="board-wrap">
        <p className="board-note" aria-live="polite">
          No departures found for {iataCode}
        </p>
      </div>
    )
  }

  const mid   = Math.ceil(flights.length / 2)
  const left  = flights.slice(0, mid)
  const right = flights.slice(mid)

  return (
    <div className="board-wrap">
      <div className="board-columns">
        <BoardPanel flights={left} />
        {/* Only render the right panel when it has content to avoid a ghost
            column with a header but no rows on small flight counts. */}
        {right.length > 0 && <BoardPanel flights={right} />}
      </div>
    </div>
  )
}
