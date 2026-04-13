/**
 * BoardRow
 *
 * PATTERN: Presentational Component — receives one Flight domain object and
 * renders a single table row. No state, no effects, no data fetching.
 * Kept deliberately narrow so it can be replaced or tested in isolation.
 *
 * PATTERN: Graceful Degradation — when the airline logo CDN returns a 404
 * for unknown or new airlines, the onError handler hides the broken-image
 * icon rather than showing an ugly placeholder.
 */

import type { JSX } from "react"
import type { Flight } from "../domain/flight"
import { StatusBadge } from "./StatusBadge"
import { logoUrl } from "../utils/airline"

type Props = { flight: Flight }

export function BoardRow({ flight }: Props): JSX.Element {
  const {
    airlineCode, airlineName, flightNumber,
    destination, departureTime, gate, status,
  } = flight

  // Fallback display when IATA code is absent: first two chars of airline name,
  // uppercased. E.g. "NoLogo Air" → "NO". Prevents empty cells in the grid.
  const displayCode = airlineCode || airlineName.slice(0, 2).toUpperCase()

  return (
    <div className="board-table board-row">
      <span className="airline-cell">
        <img
          src={logoUrl(airlineCode)}
          alt={`${airlineName} logo`}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <small>{displayCode}</small>
      </span>
      <span>{flightNumber}</span>
      <span>{destination}</span>
      <span>{departureTime}</span>
      <span>{gate}</span>
      <StatusBadge status={status} />
    </div>
  )
}
