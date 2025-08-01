import { useState } from 'react';
import './App.css';
import AvalancheMap from './components/AvalancheMap';
import VectorTileLayer from './components/VectorTileLayer';
import FilterControls from './components/FilterControls';
import ExportButton from './components/ExportButton';

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

  // Handle filter changes
  const handleFilterChange = (newFilter: FilterProps) => {
    setFilter(newFilter);
  };

  return (
    <div className="app-container">
      {/* Main Map Component */}
      <AvalancheMap>
        {/* Vector Tile Layer with filter */}
        <VectorTileLayer filter={filter} />
      </AvalancheMap>
      
      {/* Filter Controls */}
      <FilterControls onFilterChange={handleFilterChange} />
      
      {/* Export Button */}
      <ExportButton />
    </div>
  );
}

export default App;
