/**
 * Flight Repository
 *
 * PATTERN: Repository (Evans, Domain-Driven Design) — the single authoritative
 * point of access for flight departure data. Application and presentation code
 * never talk to APIs directly; they ask this repository, which encapsulates
 * all sourcing strategy behind a clean interface.
 *
 * PATTERN: Chain of Responsibility (GoF, Behavioural) — strategies are
 * evaluated in registration order. The first successful fetch short-circuits
 * the chain; any failure is swallowed (logged for observability) and control
 * passes to the next handler.
 *
 * OPEN/CLOSED PRINCIPLE: to add a new data source, implement FlightDataStrategy
 * and insert it into the array in createDefaultRepository(). No existing code
 * changes are required.
 *
 *          ┌──────────────────────────────────────────────┐
 *          │             FlightRepository                 │
 *          │                                              │
 *          │  [AeroDataBox] → [AirLabs] → [AviationStack] │
 *          │      → [OpenSky] → [Mock (Null Object)]      │
 *          │                                              │
 *          │  First success → return result               │
 *          │  All fail      → unreachable (Mock wins)     │
 *          └──────────────────────────────────────────────┘
 */

import type { Flight, FlightDataStrategy } from "../domain/flight";

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export type FetchResult = {
  flights: Flight[];
  sourceName: string;
};

export class FlightRepository {
  private readonly strategies: FlightDataStrategy[];
  constructor(strategies: FlightDataStrategy[]) {
    this.strategies = strategies;

    // INVARIANT: at least one strategy must be present. In practice, MockStrategy
    // is always last in the chain and acts as the unconditional guarantee.
    if (strategies.length === 0) {
      throw new Error("FlightRepository requires at least one strategy");
    }
  }

  /**
   * Iterates the strategy chain and returns the first successful result.
   *
   * CONTRACT: this method never throws. The MockStrategy (Null Object) at the
   * end of the chain ensures a result is always returned, even fully offline.
   */
  async fetchDepartures(
    iataCode: string,
    signal?: AbortSignal,
  ): Promise<FetchResult> {
    for (const strategy of this.strategies) {
      try {
        const flights = await strategy.fetch(iataCode, signal);
        return { flights, sourceName: strategy.sourceName };
      } catch (err) {
        // Log the failure for observability but do not propagate — degraded-
        // network and API key misconfiguration are expected in this context.
        console.warn(`[FlightRepository] ${strategy.sourceName} failed:`, err);
      }
    }

    // Defensive fallback: unreachable when MockStrategy is registered.
    return { flights: [], sourceName: "None" };
  }
}

// ---------------------------------------------------------------------------
// Composition Root
//
// PATTERN: Composition Root — all dependencies are wired here, once, at the
// outermost layer of the data module. The rest of the application depends only
// on the repository interface, not on concrete strategy implementations.
//
// Strategy priority order reflects data quality and cost:
//   1. AeroDataBox  — commercial, RapidAPI, richest real-time data
//   2. AirLabs      — commercial, broad airport coverage
//   3. AviationStack — commercial, reliable backup
//   4. OpenSky      — free / crowd-sourced, limited fields (no gates/status)
//   5. Mock         — always succeeds, offline demo (Null Object)
// ---------------------------------------------------------------------------

import { AeroDataBoxStrategy } from "./strategies/aerodatabox";
import { AirLabsStrategy } from "./strategies/airlabs";
import { AviationStackStrategy } from "./strategies/aviationstack";
import { OpenSkyStrategy } from "./strategies/opensky";
import { MockStrategy } from "./strategies/mock";

export const flightRepository = new FlightRepository([
  new AeroDataBoxStrategy(),
  new AirLabsStrategy(),
  new AviationStackStrategy(),
  new OpenSkyStrategy(),
  new MockStrategy(),
]);
