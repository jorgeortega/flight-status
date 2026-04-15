/**
 * SearchBar
 *
 * Airport search input. The user types an IATA code ("JFK") or a city name
 * ("Frankfurt") and presses Enter — the parent resolves the query to an
 * airport and triggers a fresh data fetch.
 *
 * PATTERN: Controlled Component — value and onChange are owned by the parent
 * (App). The component is a pure function of its props; no internal state.
 */

import type { JSX, KeyboardEvent } from "react"

type Props = {
  value:    string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  error?:   string | null
}

export function SearchBar({ value, onChange, onSubmit, error }: Props): JSX.Element {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim())
    }
  }

  return (
    <section className="board-controls">
      <label htmlFor="airport-search" className="sr-only">
        Search by airport code or city
      </label>
      <div className="search-field">
        <input
          id="airport-search"
          type="search"
          placeholder="Airport code or city (e.g. JFK, Frankfurt)…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search by airport code or city"
        />
        {error && (
          <p className="search-field__error" role="alert">{error}</p>
        )}
      </div>
    </section>
  )
}
