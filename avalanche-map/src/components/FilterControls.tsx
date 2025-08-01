import { useState } from 'react';

// Define the interface for the filter props
interface FilterProps {
  category: 'Gefahrenstufe' | 'Lawinenprobleme';
  value: string;
}

interface FilterControlsProps {
  onFilterChange: (filter: FilterProps) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ onFilterChange }) => {
  const [category, setCategory] = useState<'Gefahrenstufe' | 'Lawinenprobleme'>('Gefahrenstufe');
  const [value, setValue] = useState<string>('alle');
  
  // Handle category change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as 'Gefahrenstufe' | 'Lawinenprobleme';
    setCategory(newCategory);
    setValue('alle'); // Reset value when category changes
    onFilterChange({ category: newCategory, value: 'alle' });
  };
  
  // Handle value change
  const handleValueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onFilterChange({ category, value: newValue });
  };
  
  return (
    <div
      className="controls-container"
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        minWidth: '300px'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>Kategorie</label>
          <select
            value={category}
            onChange={handleCategoryChange}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '120px'
            }}
          >
            <option value="Gefahrenstufe">Gefahrenstufe</option>
            <option value="Lawinenprobleme">Lawinenprobleme</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>{category}</label>
          <select
            value={value}
            onChange={handleValueChange}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '120px'
            }}
          >
            {category === 'Gefahrenstufe' ? (
              <>
                <option value="alle">alle</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </>
            ) : (
              <>
                <option value="alle">alle</option>
                <option value="Triebschnee">Triebschnee</option>
                <option value="Altschnee">Altschnee</option>
                <option value="Neuschnee">Neuschnee</option>
                <option value="Gleitschnee">Gleitschnee</option>
                <option value="Nassschnee">Nassschnee</option>
              </>
            )}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;