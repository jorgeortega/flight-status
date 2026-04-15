/**
 * Time Utilities
 *
 * Pure functions — no side effects, no I/O, no React dependencies.
 * Each function has a single responsibility and is independently unit-testable.
 *
 * DESIGN NOTE: formatters accept string | null | undefined rather than Date
 * so callers never need to pre-validate before passing API response fields.
 */

/**
 * Formats an ISO-8601 datetime string as "HH:mm" in the browser's local
 * timezone. Returns "--:--" for any falsy or unparseable input.
 *
 * INVARIANT: return value is always exactly 5 characters or "--:--".
 */
export function toClock(value?: string | null): string {
  if (!value) return "--:--"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "--:--"
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

/**
 * Extracts the "HH:mm" portion from AeroDataBox's local time strings.
 *
 * Handles two formats that the API returns depending on version:
 *   - Space-separated:  "YYYY-MM-DD HH:mm±HH:mm"   (older responses)
 *   - ISO 8601 with T:  "YYYY-MM-DDTHH:mm:ss±HH:mm" (newer responses)
 *
 * We intentionally do NOT parse this as a Date — that would re-convert
 * through the browser's timezone and produce the wrong local time for
 * airports in a different timezone than the user. Taking the literal string
 * slice preserves the airport-local time as intended.
 */
export function aeroDataBoxTime(scheduledTimeLocal?: string): string {
  if (!scheduledTimeLocal) return "--:--"
  // Detect separator: ISO 8601 uses "T", older AeroDataBox format uses " ".
  const sep = scheduledTimeLocal.includes("T") ? "T" : " "
  const timePart = scheduledTimeLocal.split(sep)[1]
  return timePart ? timePart.slice(0, 5) : "--:--"
}

/**
 * Title-cases a raw status string from any API source.
 * Returns "Scheduled" for falsy input (the safe default status).
 *
 * Example: "DEPARTED" → "Departed", "on time" → "On time"
 */
export function normaliseStatus(raw?: string | null): string {
  if (!raw) return "Scheduled"
  const s = raw.trim()
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
