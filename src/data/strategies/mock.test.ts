import { describe, expect, it } from "vitest"
import { MockStrategy } from "./mock"

const strategy = new MockStrategy()

describe("MockStrategy", () => {
  it("always resolves with a non-empty flight list", async () => {
    const rows = await strategy.fetch("FRA")
    expect(rows.length).toBeGreaterThan(0)
  })

  it("returns a fresh array on each call (no shared reference)", async () => {
    const a = await strategy.fetch("FRA")
    const b = await strategy.fetch("FRA")
    expect(a).not.toBe(b)
  })

  it("returns flights with all required Flight fields", async () => {
    const rows = await strategy.fetch("FRA")
    for (const row of rows) {
      expect(row).toMatchObject({
        id:            expect.any(String),
        airlineCode:   expect.any(String),
        airlineName:   expect.any(String),
        flightNumber:  expect.any(String),
        destination:   expect.any(String),
        departureTime: expect.any(String),
        gate:          expect.any(String),
        status:        expect.any(String),
      })
    }
  })

  it("ignores the iataCode argument (always returns demo data)", async () => {
    const fra = await strategy.fetch("FRA")
    const jfk = await strategy.fetch("JFK")
    expect(fra).toEqual(jfk)
  })

  it("exposes the correct sourceName", () => {
    expect(strategy.sourceName).toBe("Demo Mode (Offline)")
  })
})
