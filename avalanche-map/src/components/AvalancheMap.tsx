// AvalancheMap.tsx
import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { defaults as defaultControls } from 'ol/control';

// Map context for child components
const MapContext = createContext<Map | null>(null);
export const useMap = () => useContext(MapContext);

const DEFAULT_CENTER: [number, number] = [10.0, 47.0];
const DEFAULT_ZOOM = 6;

interface AvalancheMapProps {
  children?: React.ReactNode;
}

const AvalancheMap: React.FC<AvalancheMapProps> = ({ children }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const baseLayer = new TileLayer({
      source: new XYZ({
        url: 'https://static.avalanche.report/tms/{z}/{x}/{y}.webp',
        attributions: '© Avalanche.report',
      }),
    });

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat(DEFAULT_CENTER),
        zoom: DEFAULT_ZOOM,
      }),
      controls: defaultControls(),
    });

    setMapInstance(map);

    return () => {
      map.setTarget(null);
    };
  }, []);

  return (
    <MapContext.Provider value={mapInstance}>
      <div ref={mapRef} className="map-container" style={{ height: '100vh', width: '100%' }}>
        {children}
      </div>
    </MapContext.Provider>
  );
};

export default AvalancheMap;
