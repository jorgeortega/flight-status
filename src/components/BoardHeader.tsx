/**
 * BoardHeader
 *
 * PATTERN: Presentational Component — displays the board title, active airport,
 * live clock, date, and last-updated timestamp. All values are injected as
 * props; this component owns zero state.
 */

import type { JSX } from "react";
import type { LocalAirport } from "../domain/airport";

type Props = {
  airport: LocalAirport; // currently displayed airport (detected or user-selected)
  clock: string; // "HH:mm:ss" from useClock
  boardDate: string; // formatted date string, stable across re-renders
  updatedAt: string; // "HH:mm" timestamp of last successful fetch
  isLoading: boolean;
};

export function BoardHeader({
  airport,
  clock,
  boardDate,
  updatedAt,
  isLoading,
}: Props): JSX.Element {
  return (
    <header className="board-header">
      <div className="header-main">
        <div className="header-title">
          <h1>Gate Summary</h1>
          <p className="header-airport">
            <span className="header-airport__iata">{airport.iata}</span> (
            <span className="header-airport__city">{airport.city}</span>)
          </p>
        </div>
        {isLoading && <span className="header-loading">Loading…</span>}
      </div>
      <div className="header-meta">
        <span>{boardDate}</span>
        <strong>{clock}</strong>
        <em>Updated {updatedAt}</em>
      </div>
    </header>
  );
}
