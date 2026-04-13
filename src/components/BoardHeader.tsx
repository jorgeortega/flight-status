/**
 * BoardHeader
 *
 * PATTERN: Presentational Component — displays the board title, live clock,
 * date, last-updated timestamp, and a manual-refresh trigger. All values are
 * injected as props; this component owns zero state.
 *
 * The clock and boardDate are provided by the parent (App) rather than
 * computed here to keep this component a pure function of its props —
 * easier to snapshot-test and to storybook in isolation.
 */

import type { JSX } from "react"

type Props = {
  clock:      string   // "HH:mm:ss" from useClock
  boardDate:  string   // formatted date string, stable across re-renders
  updatedAt:  string   // "HH:mm" timestamp of last successful fetch
  isLoading:  boolean
  onRefresh:  () => void
}

export function BoardHeader({
  clock, boardDate, updatedAt, isLoading, onRefresh,
}: Props): JSX.Element {
  return (
    <header className="board-header">
      <div className="header-main">
        <h1>Gate Summary</h1>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh flight data"
        >
          {isLoading ? "LOADING..." : "REFRESH"}
        </button>
      </div>
      <div className="header-meta">
        <span>{boardDate}</span>
        <strong>{clock}</strong>
        <em>Updated {updatedAt}</em>
      </div>
    </header>
  )
}
