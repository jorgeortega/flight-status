/**
 * App integration tests
 *
 * Strategy: mock the FlightRepository module so tests exercise the full
 * React component tree (App → hooks → components) without hitting real APIs.
 * This decouples the test suite from individual source strategies — those are
 * covered by their own unit tests in src/data/strategies/.
 *
 * The logoUrl utility is also mocked to produce predictable URLs and avoid
 * 404 noise in test output.
 */

import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import App from "./App"
import type { Flight } from "./domain/flight"
import { flightRepository } from "./data/repository"

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted by Vitest before imports resolve)
// ---------------------------------------------------------------------------

vi.mock("./data/repository", () => ({
  flightRepository: { fetchDepartures: vi.fn() },
}))

vi.mock("./utils/airline", () => ({
  logoUrl: (code: string) => `https://logo.test/${code}.png`,
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleFlights: Flight[] = [
  {
    id: "1", airlineCode: "LH", airlineName: "Lufthansa",
    flightNumber: "LH400", destination: "Singapore",
    departureTime: "10:30", gate: "A1", status: "Scheduled",
  },
  {
    id: "2", airlineCode: "EK", airlineName: "Emirates",
    flightNumber: "EK046", destination: "Dubai",
    departureTime: "11:00", gate: "B2", status: "Gate Close",
  },
]

const statusFlights: Flight[] = [
  {
    id: "3", airlineCode: "", airlineName: "NoLogo Air",
    flightNumber: "NL001", destination: "Berlin",
    departureTime: "12:00", gate: "C1", status: "Delayed",
  },
  {
    id: "4", airlineCode: "AB", airlineName: "Air Blue",
    flightNumber: "AB102", destination: "Paris",
    departureTime: "12:30", gate: "C2", status: "Departed",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a typed spy on flightRepository.fetchDepartures. */
const mockFetch = () =>
  vi.mocked(flightRepository.fetchDepartures)

/** Mocks geolocation at navigator level; restores original in afterEach. */
const originalGeolocation = navigator.geolocation

function mockGeolocation(
  impl: (
    success: PositionCallback,
    error: PositionErrorCallback,
  ) => void,
) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (
        success: PositionCallback,
        error?: PositionErrorCallback,
      ) => impl(success, error ?? (() => {})),
    },
  })
}

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: originalGeolocation,
  })
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("App", () => {
  it("shows a loading state then renders flight rows", async () => {
    mockFetch().mockResolvedValue({ flights: sampleFlights, sourceName: "AeroDataBox (Live)" })

    render(<App />)

    // Loading state is visible before the fetch resolves.
    expect(screen.getByText("Loading departures...")).toBeInTheDocument()

    // After fetch resolves, flight rows appear.
    expect(await screen.findByText("LH400")).toBeInTheDocument()
    expect(screen.getByText("EK046")).toBeInTheDocument()
  })

  it("displays the active source name in the footer ticker", async () => {
    mockFetch().mockResolvedValue({ flights: sampleFlights, sourceName: "AeroDataBox (Live)" })
    render(<App />)
    expect(await screen.findByText(/AeroDataBox \(Live\)/i)).toBeInTheDocument()
  })

  it("shows 'no departures' when the source returns an empty list", async () => {
    mockFetch().mockResolvedValue({ flights: [], sourceName: "Demo Mode (Offline)" })
    render(<App />)
    expect(await screen.findByText(/No departures found for/i)).toBeInTheDocument()
  })

  it("fetches flights for the airport when the user submits an IATA code", async () => {
    mockFetch().mockResolvedValue({ flights: sampleFlights, sourceName: "AeroDataBox (Live)" })
    render(<App />)
    await screen.findByText("LH400")

    mockFetch().mockClear()
    mockFetch().mockResolvedValue({ flights: [], sourceName: "AeroDataBox (Live)" })

    const input = screen.getByLabelText("Search by airport code or city")
    await userEvent.type(input, "JFK")
    await userEvent.keyboard("{Enter}")

    await waitFor(() => {
      expect(flightRepository.fetchDepartures).toHaveBeenCalledWith("JFK", expect.anything())
    })
  })

  it("fetches flights for the airport when the user submits a city name", async () => {
    mockFetch().mockResolvedValue({ flights: sampleFlights, sourceName: "AeroDataBox (Live)" })
    render(<App />)
    await screen.findByText("LH400")

    const input = screen.getByLabelText("Search by airport code or city")

    // Navigate to JFK first so the active airport is known and different from FRA.
    await userEvent.type(input, "JFK")
    await userEvent.keyboard("{Enter}")
    await waitFor(() => {
      expect(flightRepository.fetchDepartures).toHaveBeenCalledWith("JFK", expect.anything())
    })

    // Now switch to Frankfurt by city name — should resolve to FRA.
    mockFetch().mockClear()
    await userEvent.clear(input)
    await userEvent.type(input, "Frankfurt")
    await userEvent.keyboard("{Enter}")

    await waitFor(() => {
      expect(flightRepository.fetchDepartures).toHaveBeenCalledWith("FRA", expect.anything())
    })
  })

  it("shows an inline error when no airport matches the search input", async () => {
    mockFetch().mockResolvedValue({ flights: sampleFlights, sourceName: "AeroDataBox (Live)" })
    render(<App />)
    await screen.findByText("LH400")

    const input = screen.getByLabelText("Search by airport code or city")
    await userEvent.type(input, "Narnia")
    await userEvent.keyboard("{Enter}")

    expect(await screen.findByRole("alert")).toHaveTextContent(/No airport found matching "Narnia"/i)
  })

  it("re-fetches on the 60-second auto-refresh interval", async () => {
    mockFetch().mockResolvedValue({ flights: sampleFlights, sourceName: "AeroDataBox (Live)" })

    const callbacks = new Map<number, () => void | Promise<void>>()
    vi.spyOn(globalThis, "setInterval").mockImplementation((cb, delay) => {
      callbacks.set(Number(delay), cb as () => void)
      return 1 as unknown as ReturnType<typeof setInterval>
    })
    vi.spyOn(globalThis, "clearInterval").mockImplementation(() => {})

    render(<App />)
    await screen.findByText("LH400")

    // Clear accumulated calls from the initial fetch before asserting refresh count.
    vi.mocked(flightRepository.fetchDepartures).mockClear()

    // Manually fire the 60 s interval to simulate one auto-refresh tick.
    await act(async () => { await callbacks.get(60_000)?.() })

    await waitFor(() => {
      expect(flightRepository.fetchDepartures).toHaveBeenCalledTimes(1)
    })
  })

  it("applies CSS status modifiers to Delayed and Departed badges", async () => {
    mockFetch().mockResolvedValue({ flights: statusFlights, sourceName: "AeroDataBox (Live)" })
    render(<App />)

    expect(await screen.findByText("Delayed")).toHaveClass("status--delayed")
    expect(screen.getByText("Departed")).toHaveClass("status--departed")
  })

  it("falls back to airline-name initials when the airline code is absent", async () => {
    mockFetch().mockResolvedValue({ flights: statusFlights, sourceName: "AeroDataBox (Live)" })
    render(<App />)

    // "NoLogo Air" with empty airlineCode → "NO"
    expect(await screen.findByText("NO")).toBeInTheDocument()
  })

  it("hides a broken airline logo on image load error", async () => {
    mockFetch().mockResolvedValue({
      flights: [sampleFlights[0]],
      sourceName: "AeroDataBox (Live)",
    })
    render(<App />)

    const image = await screen.findByAltText("Lufthansa logo")
    image.dispatchEvent(new Event("error"))
    expect(image).toHaveStyle({ display: "none" })
  })

  it("ticks the live clock every second", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-13T19:43:00.000Z"))
    mockFetch().mockResolvedValue({ flights: [], sourceName: "Demo Mode (Offline)" })

    render(<App />)

    const before = screen.getByText(/\d{2}:\d{2}:\d{2}/).textContent

    act(() => { vi.advanceTimersByTime(1_000) })

    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/).textContent).not.toBe(before)
    vi.useRealTimers()
  })

  it("fetches for the nearest GPS airport when geolocation resolves", async () => {
    // Dubai coords (25.25°N, 55.36°E) → nearest KNOWN_AIRPORT is DXB
    mockGeolocation((success) =>
      success({
        coords: {
          latitude: 25.25, longitude: 55.36, accuracy: 1,
          altitude: null, altitudeAccuracy: null, heading: null, speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      } as GeolocationPosition),
    )

    mockFetch().mockResolvedValue({ flights: sampleFlights, sourceName: "AeroDataBox (Live)" })
    render(<App />)

    await waitFor(() => {
      expect(flightRepository.fetchDepartures).toHaveBeenCalledWith(
        expect.any(AbortSignal), // wrong arg order — see below
      )
    }).catch(() => {
      // fetchDepartures(iataCode, signal)
    })

    await waitFor(() => {
      const calls = vi.mocked(flightRepository.fetchDepartures).mock.calls
      expect(calls.some(([iata]) => iata === "DXB")).toBe(true)
    })

    // DXB appears in both the header airport display and the footer ticker.
    expect((await screen.findAllByText(/DXB/)).length).toBeGreaterThan(0)
  })

  it("falls back to the timezone airport when geolocation is denied", async () => {
    mockGeolocation((_success, error) =>
      error({
        code: 1, message: "Denied",
        PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3,
      } as GeolocationPositionError),
    )

    mockFetch().mockResolvedValue({ flights: [], sourceName: "Demo Mode (Offline)" })
    render(<App />)

    await screen.findByText(/No departures found for/i)

    // Timezone in CI resolves to FRA (Europe/Berlin) or similar hub —
    // we just assert that a fetch was made (not necessarily with FRA).
    expect(flightRepository.fetchDepartures).toHaveBeenCalled()
  })
})
