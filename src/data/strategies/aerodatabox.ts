/**
 * AeroDataBox Strategy
 *
 * PATTERN: Adapter (GoF, Structural) — translates the AeroDataBox RapidAPI
 * wire format into the application's Flight domain model, insulating the rest
 * of the system from third-party API specifics.
 *
 * PATTERN: Strategy (GoF, Behavioural) — implements FlightDataStrategy so the
 * FlightRepository can invoke it uniformly alongside other sources.
 *
 * API: GET /flights/airports/iata/{iataCode}
 *   offsetMinutes / durationMinutes — relative FIDS window (avoids clock-skew
 *     issues with absolute datetime params across timezones)
 *   withLeg=false — single `movement` object per flight, smaller payload
 *   withCancelled=false — departure boards hide cancelled flights
 *
 * Auth: RapidAPI key via X-RapidAPI-Key header (env: VITE_RAPIDAPI_KEY)
 * Docs: https://doc.aerodatabox.com/
 */

import type { Flight, FlightDataStrategy } from "../../domain/flight"
import { aeroDataBoxTime, normaliseStatus } from "../../utils/time"

// ---------------------------------------------------------------------------
// Raw API response types (scoped to this adapter — not part of the domain)
// ---------------------------------------------------------------------------

/** Movement leg as returned by AeroDataBox when withLeg=false. */
type AeroDataBoxMovement = {
  airport?: { iata?: string; name?: string }
  /** Flat string in older responses: "YYYY-MM-DD HH:mm±HH:mm" */
  scheduledTimeLocal?: string
  /** Nested object in newer v2 responses */
  scheduledTime?: { local?: string; utc?: string }
  gate?: string
  terminal?: string
}

type AeroDataBoxFlight = {
  /** Flight number including space: "LH 400" */
  number?: string
  status?: string
  isCancelled?: boolean
  airline?: { iata?: string; name?: string }
  movement?: AeroDataBoxMovement
}

type AeroDataBoxResponse = {
  departures?: AeroDataBoxFlight[]
}

// ---------------------------------------------------------------------------
// Strategy implementation
// ---------------------------------------------------------------------------

export class AeroDataBoxStrategy implements FlightDataStrategy {
  readonly sourceName = "AeroDataBox (Live)"

  async fetch(iataCode: string, signal?: AbortSignal): Promise<Flight[]> {
    const apiKey = import.meta.env.VITE_RAPIDAPI_KEY
    if (!apiKey) throw new Error("Missing VITE_RAPIDAPI_KEY")

    const params = new URLSearchParams({
      offsetMinutes:   "-120",  // include flights from 2 hours ago
      durationMinutes: "720",   // window: next 12 hours
      direction:       "Departure",
      withLeg:         "false",
      withCancelled:   "false",
      withCodeshared:  "true",
      withCargo:       "false",
      withPrivate:     "false",
      withLocation:    "false",
    })

    const response = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${iataCode}?${params}`,
      {
        signal,
        headers: {
          "X-RapidAPI-Key":  apiKey,
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com",
        },
      },
    )

    if (!response.ok) throw new Error(`AeroDataBox: HTTP ${response.status}`)

    const payload: AeroDataBoxResponse = await response.json()
    const rows = payload.departures ?? []

    return rows.slice(0, 25).map((item, index): Flight => ({
      id:            `adb-${item.number?.replace(/\s+/g, "") ?? index}-${index}`,
      airlineCode:   (item.airline?.iata ?? "").toUpperCase(),
      airlineName:   item.airline?.name ?? "Unknown",
      // AeroDataBox returns "LH 400"; strip the space to match IATA convention.
      flightNumber:  item.number?.replace(/\s+/g, "") ?? "N/A",
      destination:   item.movement?.airport?.iata
                  ?? item.movement?.airport?.name
                  ?? "Unknown",
      // Prefer the flat field (v1); fall back to the nested object (v2).
      departureTime: aeroDataBoxTime(
        item.movement?.scheduledTimeLocal ?? item.movement?.scheduledTime?.local,
      ),
      // Prefer gate; fall back to terminal identifier when gate is unassigned.
      gate:          item.movement?.gate ?? item.movement?.terminal ?? "--",
      status:        normaliseStatus(item.status),
    }))
  }
}
