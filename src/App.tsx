/**
 * App — Root Component
 *
 * This component is intentionally thin. Its only responsibilities are:
 *   1. Compose the hooks that manage state (airport detection, board data, clock)
 *   2. Derive static display values (boardDate computed once via useMemo)
 *   3. Wire hooks to presentational components via props
 *
 * PATTERN: Container / Presenter split — App is the container; BoardHeader,
 * SearchBar, FlightBoard, and the footer are presentational. No fetching or
 * formatting logic lives here.
 *
 * Deployment: https://flight-status-kappa.vercel.app/
 */

import { useMemo, useState } from "react";
import { BoardHeader } from "./components/BoardHeader";
import { SearchBar } from "./components/SearchBar";
import { FlightBoard } from "./components/FlightBoard";
import { useClock } from "./hooks/useClock";
import { useAirportDetection } from "./hooks/useAirportDetection";
import { useFlightBoard } from "./hooks/useFlightBoard";
import { resolveAirport } from "./domain/airport";
import type { LocalAirport } from "./domain/airport";

function App() {
  const { airport: detectedAirport, ready } = useAirportDetection();

  // Manual airport — set when the user submits a search query.
  // Overrides the auto-detected airport for all downstream data fetching.
  const [manualAirport, setManualAirport] = useState<LocalAirport | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const activeAirport = manualAirport ?? detectedAirport;

  // If the user explicitly chose an airport, don't wait for geolocation to settle.
  const isReady = ready || manualAirport !== null;

  const board = useFlightBoard(activeAirport.iata, isReady);
  const clock = useClock();

  // Computed once on mount — the date does not change during a session.
  const boardDate = useMemo(
    () =>
      new Intl.DateTimeFormat([], {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  function handleAirportSearch(value: string) {
    const resolved = resolveAirport(value);
    if (resolved) {
      setManualAirport(resolved);
      setSearchError(null);
    } else {
      setSearchError(`No airport found matching "${value}"`);
    }
  }

  return (
    <main className="app">
      <BoardHeader
        airport={activeAirport}
        clock={clock}
        boardDate={boardDate}
        updatedAt={board.updatedAt}
        isLoading={board.isLoading}
      />

      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={handleAirportSearch}
        error={searchError}
      />

      <FlightBoard
        flights={board.flights}
        isLoading={board.isLoading}
        iataCode={activeAirport.iata}
      />

      <footer className="board-footer">
        <div className="board-ticker">
          <span>
            Source: {board.sourceName} &nbsp;|&nbsp; Airport:{" "}
            {activeAirport.iata} ({activeAirport.city}) &nbsp;|&nbsp;
          </span>
        </div>
      </footer>
    </main>
  );
}

export default App;
