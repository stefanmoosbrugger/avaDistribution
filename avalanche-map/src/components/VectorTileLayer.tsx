import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet.vectorgrid';

// Define the interface for the filter props
interface FilterProps {
   category: 'Gefahrenstufe' | 'Lawinenprobleme';
   value: string;
}

interface VectorTileLayerProps {
   filter: FilterProps;
}

// This is needed because the leaflet.vectorgrid types are not available
declare module 'leaflet' {
   namespace vectorGrid {
      function protobuf(url: string, options?: any): L.Layer;
   }
}

function isCurrentFeature(properties, today = new Date().toISOString().substring(0, 10)) {
   return (
      (!properties.start_date || properties.start_date <= today) &&
      (!properties.end_date || properties.end_date > today)
   );
}

const VectorTileLayer: React.FC<VectorTileLayerProps> = ({ filter }) => {
   const map = useMap();
   const vectorLayerRef = useRef<L.Layer | null>(null);

   useEffect(() => {
      // Function to fetch metadata and create the vector layer
      const fetchMetadataAndCreateLayer = async () => {
         try {
            // Fetch metadata
            const response = await fetch('https://static.avalanche.report/eaws_pbf/metadata.json');
            const metadata = await response.json();

            // Remove existing layer if it exists
            if (vectorLayerRef.current) {
               map.removeLayer(vectorLayerRef.current);
            }

            // Get current date for filtering
            const now = new Date();

            // Create vector grid layer
            const vectorGrid = L.vectorGrid.protobuf(
               'https://static.avalanche.report/eaws_pbf/{z}/{x}/{y}.pbf',
               {
                  vectorTileLayerStyles: {
                     'micro-regions_elevation': (properties: any) => {
                        return { fill: false, stroke: false };
                     },
                     'outline': (properties: any) => {
                        return { fill: false, stroke: false };
                        return {
                           weight: 2,
                           color: '#000000',
                           opacity: 1,
                           fill: false
                        };
                     },
                     'micro-regions': (properties: any) => {
                        // Filter by date to show only current regions
                        const consideredRegion = 
                           properties.id.startsWith("AT") || properties.id.startsWith("CH") || properties.id.startsWith("DE") || 
                           properties.id.startsWith("IT-2") || properties.id.startsWith("IT-3") || properties.id.startsWith("IT-5");
                        if (!isCurrentFeature(properties)||!consideredRegion) {
                           return { fill: false, stroke: false };
                        }

                        // Default styling for visible regions
                        return {
                           weight: 2,
                           color: '#000000',
                           opacity: 1,
                           fill: true,
                           fillColor: '#ffffff',
                           fillOpacity: 0.2,
                        };
                     }
                  },
                  interactive: true,
                  getFeatureId: (feature: any) => feature.properties.id
               }
            );

            // Add the layer to the map and store the reference
            vectorGrid.addTo(map);
            vectorLayerRef.current = vectorGrid;

         } catch (error) {
            console.error('Error fetching metadata or creating vector layer:', error);
         }
      };

      fetchMetadataAndCreateLayer();

      // Cleanup function
      return () => {
         if (vectorLayerRef.current) {
            map.removeLayer(vectorLayerRef.current);
         }
      };
   }, [map, filter]); // Re-run when map or filter changes

   return null; // This component doesn't render anything
};

export default VectorTileLayer;