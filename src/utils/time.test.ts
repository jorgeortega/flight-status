import { describe, it, expect } from "vitest"
import { toClock, aeroDataBoxTime, normaliseStatus } from "./time"

describe("toClock", () => {
  it("formats an ISO datetime string to HH:mm", () => {
    // We can only assert the pattern since the result is timezone-dependent.
    expect(toClock("2026-04-13T08:07:00.000Z")).toMatch(/^\d{2}:\d{2}$/)
  })

  it("returns --:-- for falsy inputs", () => {
    expect(toClock()).toBe("--:--")
    expect(toClock(null)).toBe("--:--")
    expect(toClock("")).toBe("--:--")
  })

  it("returns --:-- for an unparseable string", () => {
    expect(toClock("not-a-date")).toBe("--:--")
  })
})

describe("aeroDataBoxTime", () => {
  it("extracts HH:mm from an AeroDataBox local time string (positive offset)", () => {
    expect(aeroDataBoxTime("2026-04-13 10:30+02:00")).toBe("10:30")
  })

  it("extracts HH:mm with a negative UTC offset", () => {
    expect(aeroDataBoxTime("2026-04-13 00:05-05:00")).toBe("00:05")
  })

  it("returns --:-- for missing input", () => {
    expect(aeroDataBoxTime()).toBe("--:--")
    expect(aeroDataBoxTime("")).toBe("--:--")
  })

  it("extracts HH:mm from an ISO 8601 string with T separator", () => {
    expect(aeroDataBoxTime("2026-04-13T10:30:00+02:00")).toBe("10:30")
    expect(aeroDataBoxTime("2026-04-13T00:05:00-05:00")).toBe("00:05")
  })

  it("returns --:-- when the string contains no separator", () => {
    // Defensive: malformed payload without any date/time separator.
    expect(aeroDataBoxTime("nodatetime")).toBe("--:--")
  })
})

describe("normaliseStatus", () => {
  it("title-cases an all-caps status", () => {
    expect(normaliseStatus("SCHEDULED")).toBe("Scheduled")
  })

  it("title-cases a lower-case status", () => {
    expect(normaliseStatus("delayed")).toBe("Delayed")
  })

  it("returns Scheduled for null or undefined", () => {
    expect(normaliseStatus()).toBe("Scheduled")
    expect(normaliseStatus(null)).toBe("Scheduled")
  })
})
