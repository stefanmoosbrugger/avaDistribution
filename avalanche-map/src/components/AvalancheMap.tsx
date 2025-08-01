import { useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';

// Define the center of the map based on the metadata
const DEFAULT_CENTER: [number, number] = [47.0, 10.0]; // Approximate center of the Alps
const DEFAULT_ZOOM = 6;

interface AvalancheMapProps {
  children?: React.ReactNode;
}

// This is needed to make TypeScript happy with the props we're passing to MapContainer and TileLayer
const MapContainerWithProps = MapContainer as any;
const TileLayerWithProps = TileLayer as any;

const AvalancheMap: React.FC<AvalancheMapProps> = ({ children }) => {
  // Initialize Leaflet map
  useEffect(() => {
    // Fix for default marker icons in Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className="map-container" style={{ height: '100vh', width: '100%' }}>
      <MapContainerWithProps
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Base Map Layer */}
        <TileLayerWithProps
          url="https://static.avalanche.report/tms/{z}/{x}/{y}.webp"
          attribution="© Avalanche.report"
        />
        
        {/* Children will include the VectorTileLayer component */}
        {children}
      </MapContainerWithProps>
    </div>
  );
};

export default AvalancheMap;