/**
 * Flight Domain Model
 *
 * PATTERN: Domain Model (Evans, Domain-Driven Design) — this file owns the
 * canonical representation of a departure within the bounded context of the
 * flight board. It is deliberately decoupled from every third-party API
 * schema; adapters in the data layer translate raw payloads into this shape.
 *
 * Keeping the domain model API-agnostic means a source can be added, removed,
 * or replaced without touching application or presentation code.
 */

/**
 * A normalised departure row as displayed on the board.
 *
 * All temporal values are pre-formatted strings (not Date objects) to avoid
 * timezone-sensitive conversions inside React render paths. The formatting
 * happens once, in the adapter, before data enters the domain.
 */
export type Flight = {
  /** Stable key for React reconciliation: `${source}-${flightNumber}-${index}` */
  id: string
  /** IATA airline code, e.g. "LH". Used for logo lookup and display. */
  airlineCode: string
  /** Full airline name, e.g. "Lufthansa". Shown as logo alt text. */
  airlineName: string
  /** IATA flight number, e.g. "LH400". Spaces stripped for consistency. */
  flightNumber: string
  /** Destination airport IATA code or name, e.g. "JFK". */
  destination: string
  /** Scheduled local departure time as "HH:mm". */
  departureTime: string
  /** Gate identifier or "--" when unknown. */
  gate: string
  /** Human-readable status string, title-cased, e.g. "Boarding". */
  status: string
}

/**
 * PATTERN: Strategy (GoF, Behavioural) — common interface implemented by
 * every flight data source. The FlightRepository calls `fetch` without
 * knowing which API is behind it.
 *
 * CONTRACT:
 *  - Throws on any unrecoverable failure (network error, missing API key, etc.)
 *  - Returns an empty array when the source returns zero departures — not a throw
 *  - Respects AbortSignal for cooperative cancellation (in-flight fetch abort)
 *  - Never mutates the returned Flight objects
 *
 * OPEN/CLOSED PRINCIPLE: adding a new data source = implement this interface
 * and register the strategy in the repository. Zero changes to existing code.
 */
export interface FlightDataStrategy {
  /**
   * Human-readable label surfaced in the board footer.
   * Example: "AeroDataBox (Live)"
   */
  readonly sourceName: string

  fetch(iataCode: string, signal?: AbortSignal): Promise<Flight[]>
}
