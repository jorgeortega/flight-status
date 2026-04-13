import { describe, expect, it, vi, afterEach } from "vitest"
import {
  detectFromTimezone,
  nearestAirport,
  detectFromGeolocation,
  DEFAULT_AIRPORT,
} from "./airport"

describe("detectFromTimezone", () => {
  it("returns a known airport for a recognised timezone", () => {
    // We cannot control Intl output in jsdom, but we can verify the return shape.
    const result = detectFromTimezone()
    expect(result).toHaveProperty("iata")
    expect(result).toHaveProperty("city")
  })
})

describe("nearestAirport", () => {
  it("returns DXB for Dubai coordinates", () => {
    // 25.25°N 55.36°E is closest to Dubai (DXB) in KNOWN_AIRPORTS.
    expect(nearestAirport(25.25, 55.36).iata).toBe("DXB")
  })

  it("returns FRA for Frankfurt coordinates", () => {
    expect(nearestAirport(50.0, 8.5).iata).toBe("FRA")
  })

  it("returns JFK for New York coordinates", () => {
    expect(nearestAirport(40.6, -73.8).iata).toBe("JFK")
  })
})

describe("detectFromGeolocation", () => {
  afterEach(() => vi.restoreAllMocks())

  it("resolves null when geolocation is unsupported", async () => {
    // Temporarily remove navigator.geolocation.
    const original = navigator.geolocation
    Object.defineProperty(navigator, "geolocation", {
      configurable: true, value: undefined,
    })
    expect(await detectFromGeolocation()).toBeNull()
    Object.defineProperty(navigator, "geolocation", {
      configurable: true, value: original,
    })
  })

  it("resolves to the nearest airport when position is granted", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: {
              latitude: 25.25, longitude: 55.36, accuracy: 1,
              altitude: null, altitudeAccuracy: null, heading: null, speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          } as GeolocationPosition),
      },
    })

    const result = await detectFromGeolocation()
    expect(result?.iata).toBe("DXB")
  })

  it("resolves null when the user denies the prompt", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_: PositionCallback, error: PositionErrorCallback) =>
          error({
            code: 1, message: "Denied",
            PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3,
          } as GeolocationPositionError),
      },
    })

    expect(await detectFromGeolocation()).toBeNull()
  })

  it("resolves null when the timeout fires before a position arrives", async () => {
    vi.useFakeTimers()

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        // Never calls success or error — simulates a device that never responds.
        getCurrentPosition: () => {},
      },
    })

    const promise = detectFromGeolocation(100)
    vi.advanceTimersByTime(200)
    expect(await promise).toBeNull()

    vi.useRealTimers()
  })

  it("DEFAULT_AIRPORT is FRA", () => {
    expect(DEFAULT_AIRPORT.iata).toBe("FRA")
  })
})
