/**
 * @deprecated
 * Domain types have moved to the domain layer:
 *
 *   Flight, FlightDataStrategy  → src/domain/flight.ts
 *   LocalAirport, AirportWithCoords, airport data → src/domain/airport.ts
 *
 * API response shapes (AviationStackFlight, OpenSkyFlight, etc.) are now
 * private to their respective adapter in src/data/strategies/.
 *
 * This file is kept only to avoid breaking the git history reference.
 */
