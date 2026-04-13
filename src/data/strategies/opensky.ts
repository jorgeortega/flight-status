/**
 * OpenSky Network Strategy
 *
 * PATTERN: Adapter + Strategy — normalises the OpenSky public REST API
 * into the application's Flight domain model.
 *
 * API: GET https://opensky-network.org/api/flights/departure
 *   airport — ICAO airport code (OpenSky does not accept IATA codes)
 *   begin / end — Unix timestamps defining a time window (max 7 days)
 *
 * Auth: none — OpenSky is a crowd-sourced, unauthenticated public feed.
 *       Rate-limited to 100 calls/day for anonymous clients.
 *
 * TRADEOFFS vs. commercial sources:
 *  - No gate or status information (all flights are marked "Departed")
 *  - Data latency of several minutes; not suitable for real-time boarding gates
 *  - ICAO airport code required — mapped via IATA_TO_ICAO lookup table
 *
 * Docs: https://openskynetwork.github.io/opensky-api/rest.html
 */

import type { Flight, FlightDataStrategy } from "../../domain/flight"
import { IATA_TO_ICAO, DEFAULT_AIRPORT } from "../../domain/airport"
import { toClock } from "../../utils/time"

// Raw flight object from the OpenSky /flights/departure endpoint.
type OpenSkyFlight = {
  icao24?:              string
  firstSeen?:           number  // Unix timestamp
  callsign?:            string
  estArrivalAirport?:   string  // ICAO code
}

export class OpenSkyStrategy implements FlightDataStrategy {
  readonly sourceName = "OpenSky (Public)"

  async fetch(iataCode: string, signal?: AbortSignal): Promise<Flight[]> {
    // OpenSky requires ICAO; fall back to the default airport's ICAO if unknown.
    const icao = IATA_TO_ICAO[iataCode] ?? IATA_TO_ICAO[DEFAULT_AIRPORT.iata]

    const end   = Math.floor(Date.now() / 1_000)
    const begin = end - 6 * 60 * 60  // last 6 hours

    const response = await fetch(
      `https://opensky-network.org/api/flights/departure?airport=${icao}&begin=${begin}&end=${end}`,
      { signal },
    )

    if (!response.ok) throw new Error("OpenSky unavailable")

    const rows: OpenSkyFlight[] = await response.json()

    return (Array.isArray(rows) ? rows : []).slice(0, 20).map((item, index): Flight => ({
      id:            `opensky-${item.icao24 ?? "x"}-${item.firstSeen ?? index}-${index}`,
      // Callsign first two chars approximate the airline IATA code (e.g. "LH" from "LH400").
      airlineCode:   (item.callsign ?? "").trim().slice(0, 2).toUpperCase(),
      airlineName:   "OpenSky feed",
      flightNumber:  (item.callsign ?? "N/A").trim(),
      destination:   item.estArrivalAirport ?? "Unknown",
      // firstSeen is a Unix timestamp (seconds); convert to ISO before formatting.
      departureTime: item.firstSeen
        ? toClock(new Date(item.firstSeen * 1_000).toISOString())
        : "--:--",
      gate:   "--",        // OpenSky does not provide gate information
      status: "Departed",  // Historical feed — all returned flights have departed
    }))
  }
}
