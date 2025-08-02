// App.tsx
import { useState, useEffect } from "react";
import "./App.css";
import AvalancheMap from "./components/AvalancheMap";
import MapLegend from "./components/Legend";
import OpenLayersVectorTileLayer from "./components/VectorTileLayer";
import CountryVectorTileLayer from "./components/CountryVectorTileLayer";
import PieChartLayer from "./components/PieChartLayer";
import FilterControls from "./components/FilterControls";

// Define the interface for the filter props
interface FilterProps {
  category: "Gefahrenstufe" | "Lawinenprobleme";
  value: string;
}

function App() {
  // State for the filter
  const [filter, setFilter] = useState<FilterProps>({
    category: "Gefahrenstufe",
    value: "alle",
  });

  // Define the interface for region summaries
  interface RegionSummary {
    code: string;
    name: string;
    rating_counts: { [key: string]: number };
    avalanche_problem_counts: { [key: string]: number };
  }

  const [regionSummaries, setRegionSummaries] = useState<RegionSummary[]>([]);
  const [maxCounts, setMaxCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchRegionSummary = async () => {
      try {
        const response = await fetch("/region_summary.json");
        const data = (await response.json()) as RegionSummary[];
        setRegionSummaries(data);

        const maxRatingCounts: { [key: string]: number } = {};
        const maxProblemCounts: { [key: string]: number } = {};

        data.forEach((region) => {
          Object.entries(region.rating_counts).forEach(([rating, count]) => {
            const countValue = count as number;
            if (
              !maxRatingCounts[rating] ||
              countValue > maxRatingCounts[rating]
            ) {
              maxRatingCounts[rating] = countValue;
            }
          });

          Object.entries(region.avalanche_problem_counts).forEach(
            ([problem, count]) => {
              const countValue = count as number;
              if (
                !maxProblemCounts[problem] ||
                countValue > maxProblemCounts[problem]
              ) {
                maxProblemCounts[problem] = countValue;
              }
            }
          );
        });

        setMaxCounts({ ...maxRatingCounts, ...maxProblemCounts });
      } catch (error) {
        console.error("Fehler beim Laden von region_summary.json:", error);
      }
    };

    fetchRegionSummary();
  }, []);

  // Handle filter changes
  const handleFilterChange = (newFilter: FilterProps) => {
    setFilter(newFilter);
  };

  return (
    <div className="app-container">
      {/* Main Map Component */}
      <AvalancheMap>
        {/* Conditionally render the appropriate Vector Tile Layer */}
        {filter.value === "alle" ? (
          <>
            <CountryVectorTileLayer
              filter={filter}
              regionSummaries={regionSummaries}
              maxCounts={maxCounts}
            />
            <PieChartLayer filter={filter} regionSummaries={regionSummaries} />
          </>
        ) : (
          <OpenLayersVectorTileLayer
            filter={filter}
            regionSummaries={regionSummaries}
            maxCounts={maxCounts}
          />
        )}
      </AvalancheMap>
      <MapLegend filter={filter} />
      {/* Filter Controls */}
      <FilterControls onFilterChange={handleFilterChange} />
    </div>
  );
}

export default App;
