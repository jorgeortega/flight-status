/**
 * SearchBar
 *
 * PATTERN: Controlled Component — value and onChange are owned entirely by
 * the parent (useFlightBoard). The input never manages its own state, making
 * the search behaviour fully testable through the hook alone with no DOM
 * interaction required.
 *
 * The visible <label> is visually hidden via .sr-only but present in the
 * accessibility tree for screen readers and automated test selectors
 * (getByLabelText / findByLabelText).
 */

import type { JSX } from "react"

type Props = {
  value:    string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props): JSX.Element {
  return (
    <section className="board-controls">
      {/* sr-only keeps the label out of the visual layout while preserving a11y */}
      <label htmlFor="flight-search" className="sr-only">
        Search departures
      </label>
      <input
        id="flight-search"
        type="search"
        placeholder="Search departures..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search departures"
      />
    </section>
  )
}
