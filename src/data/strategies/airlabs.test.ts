import { afterEach, describe, expect, it, vi } from "vitest"
import { AirLabsStrategy } from "./airlabs"

const strategy = new AirLabsStrategy()

describe("AirLabsStrategy", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("throws when the API key env var is missing", async () => {
    vi.stubEnv("VITE_AIRLABS_KEY", "")
    await expect(strategy.fetch("FRA")).rejects.toThrow("Missing VITE_AIRLABS_KEY")
  })

  it("throws on a non-OK HTTP response", async () => {
    vi.stubEnv("VITE_AIRLABS_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, status: 403, json: async () => ({}),
    } as Response)
    await expect(strategy.fetch("FRA")).rejects.toThrow("AirLabs: HTTP 403")
  })

  it("maps an AirLabs payload to the Flight domain model", async () => {
    vi.stubEnv("VITE_AIRLABS_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        response: [{
          flight_iata:   "LH400",
          airline_iata:  "LH",
          arr_iata:      "JFK",
          dep_time:      "2026-04-13 10:30",
          dep_gate:      "A12",
          status:        "scheduled",
        }],
      }),
    } as Response)

    const rows = await strategy.fetch("FRA")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      airlineCode:   "LH",
      flightNumber:  "LH400",
      destination:   "JFK",
      departureTime: "10:30",
      gate:          "A12",
      status:        "Scheduled",
    })
  })

  it("returns an empty array when response payload is missing", async () => {
    vi.stubEnv("VITE_AIRLABS_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, json: async () => ({}),
    } as Response)
    expect(await strategy.fetch("FRA")).toEqual([])
  })

  it("exposes the correct sourceName", () => {
    expect(strategy.sourceName).toBe("AirLabs (Live)")
  })
})
