import { useEffect, useRef, useState } from 'react';
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

// Interface for region summary data
interface RegionSummary {
   code: string;
   name: string;
   rating_counts: {
      [key: string]: number;
   };
   avalanche_problem_counts: {
      [key: string]: number;
   };
}

// This is needed because the leaflet.vectorgrid types are not available
declare module 'leaflet' {
   namespace vectorGrid {
      function protobuf(url: string, options?: any): L.Layer;
   }
}

// Mapping between German and English avalanche problem terms
const avalancheProblemMapping: { [key: string]: string } = {
   'Triebschnee': 'wind_drifted_snow',
   'Altschnee': 'persistent_weak_layers',
   'Neuschnee': 'new_snow',
   'Gleitschnee': 'gliding_snow',
   'Nassschnee': 'wet_snow'
};

function isCurrentFeature(properties: any, today = new Date().toISOString().substring(0, 10)) {
   return (
      (!properties.start_date || properties.start_date <= today) &&
      (!properties.end_date || properties.end_date > today)
   );
}

// Function to get color based on count value
function getColorForCount(count: number, max: number): string {
   // Color scale from light yellow to dark red
   const intensity = Math.min(Math.max(count / max, 0), 1);
   
   if (count === 0) return '#ffffff'; // White for zero count
   
   // Color scale from yellow to orange to red
   if (intensity < 0.25) return '#ffffb2';
   if (intensity < 0.5) return '#fecc5c';
   if (intensity < 0.75) return '#fd8d3c';
   return '#e31a1c';
}

const VectorTileLayer: React.FC<VectorTileLayerProps> = ({ filter }) => {
   const map = useMap();
   const vectorLayerRef = useRef<L.Layer | null>(null);
   const [regionSummaries, setRegionSummaries] = useState<RegionSummary[]>([]);
   const [maxCounts, setMaxCounts] = useState<{ [key: string]: number }>({});

   // Load region summary data
   useEffect(() => {
      const fetchRegionSummary = async () => {
         try {
            const response = await fetch('/region_summary.json');
            const data: RegionSummary[] = await response.json();
            setRegionSummaries(data);
            
            // Calculate max counts for each category
            const maxRatingCounts: { [key: string]: number } = {};
            const maxProblemCounts: { [key: string]: number } = {};
            
            // Find max values for each rating and problem type
            data.forEach(region => {
               // Process rating counts
               Object.entries(region.rating_counts).forEach(([rating, count]) => {
                  if (!maxRatingCounts[rating] || count > maxRatingCounts[rating]) {
                     maxRatingCounts[rating] = count;
                  }
               });
               
               // Process avalanche problem counts
               Object.entries(region.avalanche_problem_counts).forEach(([problem, count]) => {
                  if (!maxProblemCounts[problem] || count > maxProblemCounts[problem]) {
                     maxProblemCounts[problem] = count;
                  }
               });
            });
            
            setMaxCounts({
               ...maxRatingCounts,
               ...maxProblemCounts
            });
         } catch (error) {
            console.error('Error fetching region summary data:', error);
         }
      };
      
      fetchRegionSummary();
   }, []);

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
                     },
                     'micro-regions': (properties: any) => {
                        // Filter by date to show only current regions
                        const consideredRegion =
                           properties.id.startsWith("AT") || properties.id.startsWith("CH") || properties.id.startsWith("DE") ||
                           properties.id.startsWith("IT-2") || properties.id.startsWith("IT-3") || properties.id.startsWith("IT-5");
                        if (!isCurrentFeature(properties) || !consideredRegion) {
                           return { fill: false, stroke: false };
                        }

                        // Find the region summary data for this region
                        const regionData = regionSummaries.find(r => r.code === properties.id);
                        if (!regionData) {
                           // Default styling if no data found
                           return {
                              weight: 2,
                              color: '#000000',
                              opacity: 1,
                              fill: true,
                              fillColor: '#ffffff',
                              fillOpacity: 0.2,
                           };
                        }

                        // Determine color based on filter
                        let fillColor = '#ffffff';
                        let fillOpacity = 0.2;
                        let count = 0;

                        if (filter.category === 'Gefahrenstufe' && filter.value !== 'alle') {
                           // Get count for the selected danger level
                           count = regionData.rating_counts[filter.value] || 0;
                           const maxCount = maxCounts[filter.value] || 1;
                           fillColor = getColorForCount(count, maxCount);
                           fillOpacity = 0.7;
                        } else if (filter.category === 'Lawinenprobleme' && filter.value !== 'alle') {
                           // Get count for the selected avalanche problem
                           const problemKey = avalancheProblemMapping[filter.value];
                           if (problemKey) {
                              count = regionData.avalanche_problem_counts[problemKey] || 0;
                              const maxCount = maxCounts[problemKey] || 1;
                              fillColor = getColorForCount(count, maxCount);
                              fillOpacity = 0.7;
                           }
                        }

                        return {
                           weight: 2,
                           color: '#000000',
                           opacity: 1,
                           fill: true,
                           fillColor,
                           fillOpacity,
                           // Store count for potential label display
                           customData: { count }
                        };
                     }
                  },
                  interactive: true,
                  getFeatureId: (feature: any) => feature.properties.id,
                  // Add tooltip to show count on hover
                  onEachFeature: (feature: any, layer: any) => {
                     if (feature.properties) {
                        const regionData = regionSummaries.find(r => r.code === feature.properties.id);
                        if (regionData) {
                           let tooltipContent = `<b>${regionData.name}</b> (${regionData.code})`;
                           
                           if (filter.category === 'Gefahrenstufe' && filter.value !== 'alle') {
                              const count = regionData.rating_counts[filter.value] || 0;
                              tooltipContent += `<br>Gefahrenstufe ${filter.value}: ${count}`;
                           } else if (filter.category === 'Lawinenprobleme' && filter.value !== 'alle') {
                              const problemKey = avalancheProblemMapping[filter.value];
                              if (problemKey) {
                                 const count = regionData.avalanche_problem_counts[problemKey] || 0;
                                 tooltipContent += `<br>${filter.value}: ${count}`;
                              }
                           }
                           
                           layer.bindTooltip(tooltipContent);
                        }
                     }
                  }
               }
            );

            // Add the layer to the map and store the reference
            vectorGrid.addTo(map);
            vectorLayerRef.current = vectorGrid;

         } catch (error) {
            console.error('Error fetching metadata or creating vector layer:', error);
         }
      };

      // Only create the layer if we have region summaries data
      if (regionSummaries.length > 0) {
         fetchMetadataAndCreateLayer();
      }

      // Cleanup function
      return () => {
         if (vectorLayerRef.current) {
            map.removeLayer(vectorLayerRef.current);
         }
      };
   }, [map, filter, regionSummaries, maxCounts]); // Re-run when map, filter, or region data changes

   return null; // This component doesn't render anything
};

export default VectorTileLayer;