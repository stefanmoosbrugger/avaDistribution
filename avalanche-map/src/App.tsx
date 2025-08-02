// App.tsx
import { useState, useEffect } from 'react';
import './App.css';
import AvalancheMap from './components/AvalancheMap';
import OpenLayersVectorTileLayerWithMarkers from './components/VectorTileLayer';
import FilterControls from './components/FilterControls';

// Define the interface for the filter props
interface FilterProps {
  category: 'Gefahrenstufe' | 'Lawinenprobleme';
  value: string;
}

function App() {
  // State for the filter
  const [filter, setFilter] = useState<FilterProps>({
    category: 'Gefahrenstufe',
    value: 'alle'
  });

  const [regionSummaries, setRegionSummaries] = useState<any[]>([]);
  const [maxCounts, setMaxCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchRegionSummary = async () => {
      try {
        const response = await fetch('/region_summary.json');
        const data: any[] = await response.json();
        setRegionSummaries(data);

        const maxRatingCounts: { [key: string]: number } = {};
        const maxProblemCounts: { [key: string]: number } = {};

        data.forEach(region => {
          Object.entries(region.rating_counts).forEach(([rating, count]) => {
            if (!maxRatingCounts[rating] || count > maxRatingCounts[rating]) {
              maxRatingCounts[rating] = count;
            }
          });

          Object.entries(region.avalanche_problem_counts).forEach(([problem, count]) => {
            if (!maxProblemCounts[problem] || count > maxProblemCounts[problem]) {
              maxProblemCounts[problem] = count;
            }
          });
        });

        setMaxCounts({ ...maxRatingCounts, ...maxProblemCounts });
      } catch (error) {
        console.error('Fehler beim Laden von region_summary.json:', error);
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
        {/* Vector Tile Layer with filter and data */}
        <OpenLayersVectorTileLayerWithMarkers 
          filter={filter} 
          regionSummaries={regionSummaries} 
          maxCounts={maxCounts} 
        />
      </AvalancheMap>

      {/* Filter Controls */}
      <FilterControls onFilterChange={handleFilterChange} />
    </div>
  );
}

export default App;