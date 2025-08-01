import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet.vectorgrid';

function getCenterOfFeature(feature) {
   const coords = feature.geometry.coordinates.flat(Infinity); // alle Punkte extrahieren

   let sumLng = 0;
   let sumLat = 0;

   coords.forEach(coord => {
      sumLng += coord[0];
      sumLat += coord[1];
   });

   const center = [
      sumLng / coords.length,
      sumLat / coords.length
   ];

   return center; // [lng, lat]
}


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

// Interface for region center coordinates
interface RegionCenter {
   code: string;
   center: [number, number];
}

const VectorTileLayer: React.FC<VectorTileLayerProps> = ({ filter }) => {
   const map = useMap();
   const vectorLayerRef = useRef<L.Layer | null>(null);
   const markersLayerRef = useRef<L.LayerGroup | null>(null);
   const [regionSummaries, setRegionSummaries] = useState<RegionSummary[]>([]);
   const [maxCounts, setMaxCounts] = useState<{ [key: string]: number }>({});
   const [regionCenters, setRegionCenters] = useState<RegionCenter[]>([]);

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

            // Create an array to store region centers
            const centers: RegionCenter[] = [];

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

            // Fetch region geometries to get centers
            try {
               const geoResponse = await fetch('https://static.avalanche.report/eaws_pbf/metadata.json');
               const geoData = await geoResponse.json();

               // Extract region centers from metadata
               if (geoData && geoData.regions) {
                  const extractedCenters = Object.entries(geoData.regions).map(([code, region]: [string, any]) => {
                     // Use region center if available, otherwise use a default position
                     const center = region.center ?
                        [region.center.lat, region.center.lng] as [number, number] :
                        [0, 0] as [number, number];

                     return { code, center };
                  });

                  setRegionCenters(extractedCenters);
               }
            } catch (geoError) {
               console.error('Error fetching region geometries:', geoError);
            }
         } catch (error) {
            console.error('Error fetching region summary data:', error);
         }
      };

      fetchRegionSummary();
   }, []);

   // Function to create text markers for each region
   const createTextMarkers = () => {
      // Remove existing markers layer if it exists
      if (markersLayerRef.current) {
         map.removeLayer(markersLayerRef.current);
      }

      // Create a new layer group for markers
      const markersLayer = L.layerGroup();

      // Only create markers if we have region data and centers
      if (regionSummaries.length > 0 && regionCenters.length > 0) {
         regionSummaries.forEach(region => {
            // Find the center coordinates for this region
            const regionCenter = regionCenters.find(rc => rc.code === region.code);
            if (!regionCenter || regionCenter.center[0] === 0) return; // Skip if no valid center

            // Determine count based on filter
            let count = 0;

            if (filter.category === 'Gefahrenstufe' && filter.value !== 'alle') {
               count = region.rating_counts[filter.value] || 0;
            } else if (filter.category === 'Lawinenprobleme' && filter.value !== 'alle') {
               const problemKey = avalancheProblemMapping[filter.value];
               if (problemKey) {
                  count = region.avalanche_problem_counts[problemKey] || 0;
               }
            }

            // Only create marker if count > 0
            if (count > 0) {
               // Create a custom divIcon with the count
               const countIcon = L.divIcon({
                  className: 'count-marker',
                  html: `<div style="
                           background-color: white;
                           border: 2px solid black;
                           border-radius: 50%;
                           width: 24px;
                           height: 24px;
                           display: flex;
                           justify-content: center;
                           align-items: center;
                           font-weight: bold;
                           font-size: 12px;
                       ">${count}</div>`,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
               });

               // Create marker and add to layer
               const marker = L.marker(regionCenter.center as L.LatLngExpression, {
                  icon: countIcon,
                  interactive: false, // Don't capture mouse events
                  zIndexOffset: 1000 // Ensure it's above the vector layer
               });

               marker.addTo(markersLayer);
            }
         });
      }

      // Add markers layer to map and store reference
      markersLayer.addTo(map);
      markersLayerRef.current = markersLayer;
   };

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
                        //console.log(properties)
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
                     console.log("on each feature ")
                     console.log(feature.properties)
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

                     // 🧷 Marker auf Zentrum setzen
                     const marker = L.marker(center, {
                        icon: L.divIcon({
                           className: 'region-marker',
                           html: '📍',
                           iconSize: [20, 20],
                           iconAnchor: [10, 10]
                        })
                     }).addTo(map);

                     // 🗨️ Popup dranbinden
                     marker.bindPopup(popupContent);

                     // Optional auch das Layer selbst mit Tooltip
                     console.log("POPUP")
                     layer.bindTooltip(popupContent);
                  }
               }
            );

            // Add the layer to the map and store the reference
            vectorGrid.addTo(map);
            vectorLayerRef.current = vectorGrid;

            // Create text markers after vector layer is added
            createTextMarkers();

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
         if (markersLayerRef.current) {
            map.removeLayer(markersLayerRef.current);
         }
      };
   }, [map, filter, regionSummaries, maxCounts, regionCenters]); // Re-run when map, filter, or region data changes

   return null; // This component doesn't render anything
};

export default VectorTileLayer;