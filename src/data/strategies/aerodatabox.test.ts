import { afterEach, describe, expect, it, vi } from "vitest"
import { AeroDataBoxStrategy } from "./aerodatabox"

const strategy = new AeroDataBoxStrategy()

describe("AeroDataBoxStrategy", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("throws when the RapidAPI key env var is missing", async () => {
    vi.stubEnv("VITE_RAPIDAPI_KEY", "")
    await expect(strategy.fetch("FRA")).rejects.toThrow("Missing VITE_RAPIDAPI_KEY")
  })

  it("throws on a non-OK HTTP response", async () => {
    vi.stubEnv("VITE_RAPIDAPI_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, status: 429, json: async () => ({}),
    } as Response)
    await expect(strategy.fetch("FRA")).rejects.toThrow("AeroDataBox: HTTP 429")
  })

  it("maps a full AeroDataBox payload to the Flight domain model", async () => {
    vi.stubEnv("VITE_RAPIDAPI_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        departures: [{
          number:    "LH 400",
          status:    "scheduled",
          airline:   { iata: "LH", name: "Lufthansa" },
          movement:  {
            airport:            { iata: "JFK", name: "John F. Kennedy" },
            scheduledTimeLocal: "2026-04-13 10:30+02:00",
            gate:               "B22",
          },
        }],
      }),
    } as Response)

    const rows = await strategy.fetch("FRA")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      airlineCode:   "LH",
      airlineName:   "Lufthansa",
      flightNumber:  "LH400",      // space stripped
      destination:   "JFK",
      departureTime: "10:30",
      gate:          "B22",
      status:        "Scheduled",
    })
  })

  it("falls back to terminal when gate is absent", async () => {
    vi.stubEnv("VITE_RAPIDAPI_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        departures: [{
          number:   "AA 101",
          airline:  { iata: "AA", name: "American" },
          movement: { airport: { iata: "LAX" }, terminal: "T2" },
        }],
      }),
    } as Response)

    const rows = await strategy.fetch("FRA")
    expect(rows[0].gate).toBe("T2")
  })

  it("returns an empty array when departures is missing", async () => {
    vi.stubEnv("VITE_RAPIDAPI_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, json: async () => ({}),
    } as Response)
    expect(await strategy.fetch("FRA")).toEqual([])
  })

  it("exposes the correct sourceName", () => {
    expect(strategy.sourceName).toBe("AeroDataBox (Live)")
  })
})
