/**
 * App — Root Component
 *
 * This component is intentionally thin. Its only responsibilities are:
 *   1. Compose the hooks that manage state (airport detection, board data, clock)
 *   2. Derive static display values (boardDate computed once via useMemo)
 *   3. Wire hooks to presentational components via props
 *
 * PATTERN: Container / Presenter split — App is the container; BoardHeader,
 * SearchBar, FlightBoard, and the footer are presentational. No fetching,
 * filtering, or formatting logic lives here.
 *
 * Deployment: https://flight-status-kappa.vercel.app/
 */

import { useMemo } from "react"
import { BoardHeader } from "./components/BoardHeader"
import { SearchBar }   from "./components/SearchBar"
import { FlightBoard } from "./components/FlightBoard"
import { useClock }              from "./hooks/useClock"
import { useAirportDetection }   from "./hooks/useAirportDetection"
import { useFlightBoard }        from "./hooks/useFlightBoard"

function App() {
  const { airport, ready } = useAirportDetection()
  const board              = useFlightBoard(airport.iata, ready)
  const clock              = useClock()

  // Computed once on mount — the date does not change during a session.
  const boardDate = useMemo(
    () =>
      new Intl.DateTimeFormat([], {
        weekday: "long",
        day:     "2-digit",
        month:   "short",
        year:    "numeric",
      }).format(new Date()),
    [],
  )

  return (
    <main className="app">
      <BoardHeader
        clock={clock}
        boardDate={boardDate}
        updatedAt={board.updatedAt}
        isLoading={board.isLoading}
        onRefresh={board.refresh}
      />

      <SearchBar value={board.query} onChange={board.setQuery} />

      <FlightBoard
        flights={board.filteredFlights}
        isLoading={board.isLoading}
        iataCode={airport.iata}
        query={board.query}
      />

      <footer className="board-footer">
        <div className="board-ticker">
          <span>
            Source: {board.sourceName} &nbsp;|&nbsp;
            Local Airport: {airport.iata} ({airport.city}) &nbsp;|&nbsp;
            Auto-refresh every 60 s
          </span>
        </div>
      </footer>
    </main>
  )
}

export default App
