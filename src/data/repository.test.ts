/**
 * FlightRepository tests — Chain of Responsibility behaviour
 *
 * These tests verify the repository's core contract: try strategies in order,
 * return the first success, swallow failures silently, and never throw.
 */

import { describe, it, expect, vi } from "vitest"
import { FlightRepository } from "./repository"
import type { FlightDataStrategy } from "../domain/flight"

// Minimal strategy factory — keeps tests focused on behaviour, not boilerplate.
function makeStrategy(
  name: string,
  result: "success" | "fail",
): FlightDataStrategy {
  return {
    sourceName: name,
    fetch: result === "success"
      ? vi.fn().mockResolvedValue([])
      : vi.fn().mockRejectedValue(new Error(`${name} failed`)),
  }
}

describe("FlightRepository", () => {
  it("throws when constructed with an empty strategy list", () => {
    expect(() => new FlightRepository([])).toThrow()
  })

  it("returns the first strategy's result when it succeeds", async () => {
    const s1 = makeStrategy("S1", "success")
    const repo = new FlightRepository([s1])
    const result = await repo.fetchDepartures("FRA")
    expect(result.sourceName).toBe("S1")
    expect(s1.fetch).toHaveBeenCalledWith("FRA", undefined)
  })

  it("skips a failing strategy and falls through to the next", async () => {
    const s1 = makeStrategy("S1", "fail")
    const s2 = makeStrategy("S2", "success")
    const repo = new FlightRepository([s1, s2])
    const result = await repo.fetchDepartures("FRA")
    expect(result.sourceName).toBe("S2")
    expect(s1.fetch).toHaveBeenCalledTimes(1)
    expect(s2.fetch).toHaveBeenCalledTimes(1)
  })

  it("does not call later strategies once an earlier one succeeds", async () => {
    const s1 = makeStrategy("S1", "success")
    const s2 = makeStrategy("S2", "success")
    const repo = new FlightRepository([s1, s2])
    await repo.fetchDepartures("FRA")
    expect(s2.fetch).not.toHaveBeenCalled()
  })

  it("returns empty flights when all strategies fail", async () => {
    const repo = new FlightRepository([
      makeStrategy("S1", "fail"),
      makeStrategy("S2", "fail"),
    ])
    const result = await repo.fetchDepartures("FRA")
    expect(result.flights).toEqual([])
    expect(result.sourceName).toBe("None")
  })

  it("passes the iataCode and AbortSignal to the strategy", async () => {
    const s1 = makeStrategy("S1", "success")
    const repo = new FlightRepository([s1])
    const signal = new AbortController().signal
    await repo.fetchDepartures("JFK", signal)
    expect(s1.fetch).toHaveBeenCalledWith("JFK", signal)
  })

  it("never throws even when all strategies fail", async () => {
    const repo = new FlightRepository([makeStrategy("S1", "fail")])
    await expect(repo.fetchDepartures("FRA")).resolves.toBeDefined()
  })
})
