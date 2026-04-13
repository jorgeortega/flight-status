/**
 * Mock Strategy — Offline / Demo Fallback
 *
 * PATTERN: Null Object (Woolf) — an implementation that always succeeds and
 * returns a canned dataset, eliminating the need for null-checks or error
 * states in callers. The board is never empty in offline / demo environments.
 *
 * PATTERN: Strategy (GoF) — same interface as live sources, making the
 * offline fallback completely transparent to the FlightRepository.
 *
 * The simulated async delay (600 ms) makes the loading state visible in
 * demos and prevents instant-flash UX on localhost.
 */

import type { Flight, FlightDataStrategy } from "../../domain/flight"

// Canned flights represent a realistic FRA departure board snapshot.
const DEMO_FLIGHTS: readonly Flight[] = [
  { id: "m1", airlineCode: "LH", airlineName: "Lufthansa",         flightNumber: "LH450",  destination: "Los Angeles (LAX)", departureTime: "10:15", gate: "A12", status: "Boarding"  },
  { id: "m2", airlineCode: "SQ", airlineName: "Singapore Airlines", flightNumber: "SQ25",   destination: "Singapore (SIN)",   departureTime: "11:05", gate: "B22", status: "Scheduled" },
  { id: "m3", airlineCode: "EK", airlineName: "Emirates",           flightNumber: "EK46",   destination: "Dubai (DXB)",       departureTime: "12:40", gate: "C10", status: "Delayed"   },
  { id: "m4", airlineCode: "BA", airlineName: "British Airways",    flightNumber: "BA903",  destination: "London (LHR)",      departureTime: "14:20", gate: "A05", status: "Scheduled" },
  { id: "m5", airlineCode: "AF", airlineName: "Air France",         flightNumber: "AF1234", destination: "Paris (CDG)",       departureTime: "15:55", gate: "D02", status: "Last Call" },
  { id: "m6", airlineCode: "AA", airlineName: "American Airlines",  flightNumber: "AA101",  destination: "New York (JFK)",    departureTime: "16:30", gate: "B18", status: "Scheduled" },
]

export class MockStrategy implements FlightDataStrategy {
  readonly sourceName = "Demo Mode (Offline)"

  async fetch(_iataCode: string): Promise<Flight[]> {
    // Simulate network latency so the loading skeleton is visible in demos.
    await new Promise((resolve) => setTimeout(resolve, 600))
    // Return a shallow copy so callers cannot mutate the shared constant.
    return [...DEMO_FLIGHTS]
  }
}
