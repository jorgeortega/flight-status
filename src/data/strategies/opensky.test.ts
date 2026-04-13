import { afterEach, describe, expect, it, vi } from "vitest"
import { OpenSkyStrategy } from "./opensky"

const strategy = new OpenSkyStrategy()

describe("OpenSkyStrategy", () => {
  afterEach(() => vi.restoreAllMocks())

  it("throws on a non-OK HTTP response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, json: async () => [],
    } as Response)
    await expect(strategy.fetch("FRA")).rejects.toThrow("OpenSky unavailable")
  })

  it("maps an OpenSky payload to the Flight domain model", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [{
        icao24:              "abc123",
        firstSeen:           1_713_000_000,
        callsign:            "LH400  ",  // trailing spaces are real in the API
        estArrivalAirport:   "WSSS",
      }],
    } as Response)

    const rows = await strategy.fetch("FRA")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      airlineCode:  "LH",
      flightNumber: "LH400",   // callsign trimmed
      destination:  "WSSS",
      gate:         "--",
      status:       "Departed",
    })
    expect(rows[0].id).toContain("abc123")
  })

  it("handles an empty response array gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true, json: async () => [],
    } as Response)
    const rows = await strategy.fetch("FRA")
    expect(rows).toEqual([])
  })

  it("exposes the correct sourceName", () => {
    expect(strategy.sourceName).toBe("OpenSky (Public)")
  })
})
