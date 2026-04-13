/**
 * Airport Domain
 *
 * PATTERN: Value Object (Evans, DDD) — LocalAirport is defined entirely by
 * its data (city + iata). It has no identity beyond its values; two instances
 * with the same fields are interchangeable. The `readonly` modifiers enforce
 * immutability at the type level.
 */

/** Minimal airport representation used throughout the application. */
export type LocalAirport = {
  readonly city: string
  /** IATA airport code, e.g. "FRA". Always uppercase. */
  readonly iata: string
}

/** Extended with coordinates for geolocation-based nearest-airport lookup. */
export type AirportWithCoords = LocalAirport & {
  readonly lat: number
  readonly lon: number
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

/**
 * Fallback airport used when both timezone detection and geolocation fail.
 * Frankfurt (FRA) chosen as a globally central, heavily-trafficked hub.
 */
export const DEFAULT_AIRPORT: LocalAirport = { city: "Frankfurt", iata: "FRA" }

/**
 * Maps IANA timezone identifiers to the nearest major departure hub.
 * Source: Intl.DateTimeFormat().resolvedOptions().timeZone
 *
 * Used as the synchronous fast-path for airport detection — zero latency,
 * no permissions required. Updated when a user's geolocation resolves.
 */
export const TIMEZONE_AIRPORT_MAP: Readonly<Record<string, LocalAirport>> = {
  "Europe/Berlin":       { city: "Frankfurt",    iata: "FRA" },
  "Europe/London":       { city: "London",       iata: "LHR" },
  "America/New_York":    { city: "New York",     iata: "JFK" },
  "America/Los_Angeles": { city: "Los Angeles",  iata: "LAX" },
  "Europe/Paris":        { city: "Paris",        iata: "CDG" },
  "Europe/Madrid":       { city: "Madrid",       iata: "MAD" },
  "Europe/Amsterdam":    { city: "Amsterdam",    iata: "AMS" },
  "Europe/Istanbul":     { city: "Istanbul",     iata: "IST" },
  "Asia/Singapore":      { city: "Singapore",    iata: "SIN" },
  "Asia/Kuala_Lumpur":   { city: "Kuala Lumpur", iata: "KUL" },
  "Asia/Dubai":          { city: "Dubai",        iata: "DXB" },
  "Asia/Hong_Kong":      { city: "Hong Kong",    iata: "HKG" },
  "Asia/Qatar":          { city: "Doha",         iata: "DOH" },
  "Australia/Sydney":    { city: "Sydney",       iata: "SYD" },
  "Australia/Melbourne": { city: "Melbourne",    iata: "MEL" },
}

/**
 * Known major hub airports with GPS coordinates for geolocation-based
 * nearest-airport matching.
 *
 * NOTE: Euclidean distance over lat/lon degrees is accurate enough here.
 * Haversine correction only matters below ~100 km; the closest two airports
 * in this list are > 500 km apart so the simpler formula is safe.
 */
export const KNOWN_AIRPORTS: readonly AirportWithCoords[] = [
  { city: "Frankfurt",    iata: "FRA", lat:  50.0379, lon:   8.5622 },
  { city: "London",       iata: "LHR", lat:  51.4700, lon:  -0.4543 },
  { city: "New York",     iata: "JFK", lat:  40.6413, lon: -73.7781 },
  { city: "Los Angeles",  iata: "LAX", lat:  33.9416, lon:-118.4085 },
  { city: "Paris",        iata: "CDG", lat:  49.0097, lon:   2.5479 },
  { city: "Madrid",       iata: "MAD", lat:  40.4893, lon:  -3.5676 },
  { city: "Amsterdam",    iata: "AMS", lat:  52.3105, lon:   4.7683 },
  { city: "Istanbul",     iata: "IST", lat:  41.2753, lon:  28.7519 },
  { city: "Singapore",    iata: "SIN", lat:   1.3644, lon: 103.9915 },
  { city: "Kuala Lumpur", iata: "KUL", lat:   2.7456, lon: 101.7072 },
  { city: "Dubai",        iata: "DXB", lat:  25.2532, lon:  55.3657 },
  { city: "Hong Kong",    iata: "HKG", lat:  22.3080, lon: 113.9185 },
  { city: "Doha",         iata: "DOH", lat:  25.2731, lon:  51.6081 },
  { city: "Sydney",       iata: "SYD", lat: -33.9399, lon: 151.1753 },
  { city: "Melbourne",    iata: "MEL", lat: -37.6690, lon: 144.8410 },
]

/**
 * IATA → ICAO mapping for the OpenSky Network, which identifies airports
 * exclusively by ICAO code in its public API.
 * Maintained manually; covers all airports in KNOWN_AIRPORTS.
 */
export const IATA_TO_ICAO: Readonly<Record<string, string>> = {
  FRA: "EDDF", LHR: "EGLL", JFK: "KJFK", LAX: "KLAX", CDG: "LFPG",
  MAD: "LEMD", AMS: "EHAM", IST: "LTFM", SIN: "WSSS", KUL: "WMKK",
  DXB: "OMDB", HKG: "VHHH", DOH: "OTHH", SYD: "YSSY", MEL: "YMML",
}

// ---------------------------------------------------------------------------
// Detection functions
// ---------------------------------------------------------------------------

/**
 * Synchronous fast-path: derives the nearest hub airport from the device's
 * IANA timezone. Returns DEFAULT_AIRPORT when the timezone is unrecognised.
 *
 * Called immediately on mount — no async, no permissions, no latency.
 */
export function detectFromTimezone(): LocalAirport {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return TIMEZONE_AIRPORT_MAP[tz] ?? DEFAULT_AIRPORT
}

/**
 * Finds the nearest known airport to a GPS coordinate using squared
 * Euclidean distance. O(n) over KNOWN_AIRPORTS (n ≤ 20), always fast.
 */
export function nearestAirport(lat: number, lon: number): LocalAirport {
  const distSq = (a: AirportWithCoords) => (lat - a.lat) ** 2 + (lon - a.lon) ** 2
  // Safe non-null assertion: KNOWN_AIRPORTS is statically non-empty.
  const best = KNOWN_AIRPORTS.reduce((acc, a) => (distSq(a) < distSq(acc) ? a : acc))
  return { city: best.city, iata: best.iata }
}

/**
 * Asynchronous slow-path: requests the device's geolocation and returns the
 * nearest known airport. Resolves `null` in any of these cases:
 *   - Browser does not support geolocation
 *   - User denies the permission prompt
 *   - The request times out (default: 3.5 s)
 *
 * The caller is responsible for falling back to detectFromTimezone() on null.
 */
export function detectFromGeolocation(timeoutMs = 3_500): Promise<LocalAirport | null> {
  if (!navigator.geolocation) return Promise.resolve(null)

  return new Promise((resolve) => {
    let settled = false

    // Guard against double-resolution (timeout fires after position callback).
    const settle = (result: LocalAirport | null) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const timer = window.setTimeout(() => settle(null), timeoutMs)

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        window.clearTimeout(timer)
        settle(nearestAirport(coords.latitude, coords.longitude))
      },
      () => {
        window.clearTimeout(timer)
        settle(null)
      },
      // maximumAge=300s: reuse a cached position up to 5 minutes old.
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: timeoutMs },
    )
  })
}
