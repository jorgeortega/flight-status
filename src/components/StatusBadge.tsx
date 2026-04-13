/**
 * StatusBadge
 *
 * PATTERN: Presentational Component — a pure mapping from a status string to
 * a styled pill. No internal state; no side effects; fully driven by props.
 *
 * The status → CSS-modifier mapping is co-located with the component it serves
 * (Single Responsibility). Adding a new status means one new entry in
 * STATUS_CLASS_MAP — no logic scattered across the codebase.
 *
 * CSS class contract (defined in index.css):
 *   .status--boarding   orange — final boarding call
 *   .status--delayed    red    — departure pushed back
 *   .status--departed   blue   — gate closed / airborne
 *   .status--scheduled  yellow — default / on time
 */

import type { JSX } from "react"

type Props = { status: string }

type StatusRule = {
  test: (lowerCased: string) => boolean
  cls:  string
}

// Evaluated in order; first match wins.
const STATUS_RULES: StatusRule[] = [
  { test: (s) => s.includes("board") || s.includes("call"), cls: "status--boarding"  },
  { test: (s) => s.includes("delay"),                       cls: "status--delayed"   },
  { test: (s) => s.includes("depart") || s.includes("land"),cls: "status--departed"  },
]

function resolveClass(status: string): string {
  const s = status.toLowerCase()
  return STATUS_RULES.find((r) => r.test(s))?.cls ?? "status--scheduled"
}

export function StatusBadge({ status }: Props): JSX.Element {
  return (
    <span className={`status ${resolveClass(status)}`}>
      {status}
    </span>
  )
}
