import { afterEach, describe, expect, it, vi } from "vitest"
import { AviationStackStrategy } from "./aviationstack"

const strategy = new AviationStackStrategy()

describe("AviationStackStrategy", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("throws when the API key env var is missing", async () => {
    vi.stubEnv("VITE_AVIATIONSTACK_KEY", "")
    await expect(strategy.fetch("FRA")).rejects.toThrow("Missing VITE_AVIATIONSTACK_KEY")
  })

  it("throws on a non-OK HTTP response", async () => {
    vi.stubEnv("VITE_AVIATIONSTACK_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false, json: async () => ({}),
    } as Response)
    await expect(strategy.fetch("FRA")).rejects.toThrow("AviationStack unavailable")
  })

  it("throws the API-provided error message on application-level errors", async () => {
    vi.stubEnv("VITE_AVIATIONSTACK_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ error: { message: "rate limit exceeded" } }),
    } as Response)
    await expect(strategy.fetch("FRA")).rejects.toThrow("rate limit exceeded")
  })

  it("maps a full AviationStack payload to the Flight domain model", async () => {
    vi.stubEnv("VITE_AVIATIONSTACK_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          flight_date:   "2026-04-13",
          flight_status: "scheduled",
          airline:     { iata: "LH",  name: "Lufthansa" },
          flight:      { iata: "LH123", number: "123" },
          arrival:     { airport: "Singapore Changi", iata: "SIN" },
          departure:   { scheduled: "2026-04-13T10:30:00.000Z", gate: "A3" },
        }],
      }),
    } as Response)

    const rows = await strategy.fetch("FRA")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      airlineCode:  "LH",
      airlineName:  "Lufthansa",
      flightNumber: "LH123",
      destination:  "Singapore Changi",
      gate:         "A3",
      status:       "Scheduled",
    })
  })

  it("defaults status to Scheduled when the field is absent", async () => {
    vi.stubEnv("VITE_AVIATIONSTACK_KEY", "test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          flight: { iata: "LH999" },
          arrival: { iata: "SIN" },
          departure: {},
        }],
      }),
    } as Response)

    const rows = await strategy.fetch("FRA")
    expect(rows[0].status).toBe("Scheduled")
  })

  it("exposes the correct sourceName", () => {
    expect(strategy.sourceName).toBe("AviationStack (Backup)")
  })
})
