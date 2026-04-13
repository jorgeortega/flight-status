/**
 * AviationStack Strategy
 *
 * PATTERN: Adapter + Strategy — normalises the AviationStack v1 flights
 * endpoint into the application's Flight domain model.
 *
 * API: GET https://api.aviationstack.com/v1/flights
 *   dep_iata — departure airport IATA code
 *   limit    — max results per page
 *
 * Auth: access_key query parameter (env: VITE_AVIATIONSTACK_KEY)
 * Docs: https://aviationstack.com/documentation
 */

import type { Flight, FlightDataStrategy } from "../../domain/flight"
import { toClock, normaliseStatus } from "../../utils/time"

// Raw response shape from AviationStack /v1/flights.
type AviationStackFlight = {
  flight_date?:   string
  flight_status?: string
  airline?:     { iata?: string; name?: string }
  flight?:      { iata?: string; number?: string }
  arrival?:     { airport?: string; iata?: string }
  departure?:   { scheduled?: string; gate?: string }
}

type AviationStackResponse = {
  data?:  AviationStackFlight[]
  error?: { message?: string }
}

export class AviationStackStrategy implements FlightDataStrategy {
  readonly sourceName = "AviationStack (Backup)"

  async fetch(iataCode: string, signal?: AbortSignal): Promise<Flight[]> {
    const apiKey = import.meta.env.VITE_AVIATIONSTACK_KEY
    if (!apiKey) throw new Error("Missing VITE_AVIATIONSTACK_KEY")

    const params = new URLSearchParams({
      access_key: apiKey,
      dep_iata:   iataCode,
      limit:      "30",
    })
    const response = await fetch(
      `https://api.aviationstack.com/v1/flights?${params}`,
      { signal },
    )

    if (!response.ok) throw new Error("AviationStack unavailable")

    const payload: AviationStackResponse = await response.json()

    // AviationStack returns HTTP 200 even for API errors; check the body.
    if (payload?.error) {
      throw new Error(payload.error.message ?? "AviationStack request failed")
    }

    const rows = Array.isArray(payload?.data) ? payload.data : []

    return rows.slice(0, 20).map((item, index): Flight => ({
      id: item.flight_date
        ? `avi-${item.flight_date}-${item.flight?.iata ?? index}-${index}`
        : `avi-${index}`,
      airlineCode:   (item.airline?.iata ?? "").toUpperCase(),
      airlineName:   item.airline?.name ?? "Unknown",
      flightNumber:  item.flight?.iata ?? item.flight?.number ?? "N/A",
      destination:   item.arrival?.airport ?? item.arrival?.iata ?? "Unknown",
      // AviationStack departure.scheduled is a full ISO-8601 datetime.
      departureTime: toClock(item.departure?.scheduled),
      gate:          item.departure?.gate ?? "--",
      status:        normaliseStatus(item.flight_status),
    }))
  }
}
