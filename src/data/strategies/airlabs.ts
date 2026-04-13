/**
 * AirLabs Strategy
 *
 * PATTERN: Adapter + Strategy — normalises the AirLabs v9 schedules endpoint
 * into the application's Flight domain model.
 *
 * API: GET https://airlabs.co/api/v9/schedules
 *   dep_iata — departure airport IATA code
 *
 * Auth: api_key query parameter (env: VITE_AIRLABS_KEY)
 * Docs: https://airlabs.co/docs/schedules
 */

import type { Flight, FlightDataStrategy } from "../../domain/flight"
import { normaliseStatus } from "../../utils/time"

// Raw response shape returned by AirLabs /schedules.
// Only the fields consumed by the adapter are declared.
type AirLabsFlight = {
  flight_iata?:   string
  flight_number?: string
  airline_iata?:  string
  arr_iata?:      string
  /** "YYYY-MM-DD HH:mm" airport-local time */
  dep_time?:      string
  dep_gate?:      string
  status?:        string
}

export class AirLabsStrategy implements FlightDataStrategy {
  readonly sourceName = "AirLabs (Live)"

  async fetch(iataCode: string, signal?: AbortSignal): Promise<Flight[]> {
    const apiKey = import.meta.env.VITE_AIRLABS_KEY
    if (!apiKey) throw new Error("Missing VITE_AIRLABS_KEY")

    const params = new URLSearchParams({ api_key: apiKey, dep_iata: iataCode })
    const response = await fetch(
      `https://airlabs.co/api/v9/schedules?${params}`,
      { signal },
    )

    if (!response.ok) throw new Error(`AirLabs: HTTP ${response.status}`)

    const payload = await response.json() as { response?: AirLabsFlight[] }
    const rows = Array.isArray(payload?.response) ? payload.response : []

    return rows.slice(0, 25).map((item, index): Flight => ({
      id:            `airlabs-${item.flight_iata ?? index}-${index}`,
      airlineCode:   (item.airline_iata ?? "").toUpperCase(),
      airlineName:   item.airline_iata ?? "Unknown",
      flightNumber:  item.flight_iata ?? item.flight_number ?? "N/A",
      destination:   item.arr_iata ?? "Unknown",
      // AirLabs dep_time format: "YYYY-MM-DD HH:mm" — take the time part.
      departureTime: item.dep_time ? item.dep_time.split(" ")[1] ?? "--:--" : "--:--",
      gate:          item.dep_gate ?? "--",
      status:        normaliseStatus(item.status),
    }))
  }
}
