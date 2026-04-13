import { describe, expect, it } from "vitest"
import { logoUrl } from "./airline"

describe("logoUrl", () => {
  it("builds a Kiwi CDN URL from an IATA code", () => {
    expect(logoUrl("LH")).toBe("https://images.kiwi.com/airlines/64/LH.png")
  })

  it("uppercases the airline code", () => {
    expect(logoUrl("lh")).toContain("/LH.png")
  })
})
