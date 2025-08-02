import React, { useEffect } from "react";
import { useMap } from "./AvalancheMap";
import { getColorForCount } from "../colorUtils";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { Style, Fill, Stroke } from "ol/style";

interface Props {
  filter: {
    category: "Gefahrenstufe" | "Lawinenprobleme";
    value: string;
  };
  regionSummaries: any[];
  maxCounts: { [key: string]: number };
}

const avalancheProblemMapping: { [key: string]: string } = {
  Triebschnee: "wind_drifted_snow",
  Altschnee: "persistent_weak_layers",
  Neuschnee: "new_snow",
  Gleitschnee: "gliding_snow",
  Nassschnee: "wet_snow",
};

function isCurrentFeature(
  properties: any,
  today = new Date().toISOString().substring(0, 10)
) {
  return (
    (!properties.start_date || properties.start_date <= today) &&
    (!properties.end_date || properties.end_date > today)
  );
}

const OpenLayersVectorTileLayer: React.FC<Props> = ({
  filter,
  regionSummaries,
  maxCounts,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const vectorTileSource = new VectorTileSource({
      format: new MVT(),
      url: "https://static.avalanche.report/eaws_pbf/{z}/{x}/{y}.pbf",
    });

    const vectorTileLayer = new VectorTileLayer({
      source: vectorTileSource,
      style: (feature) => {
        const props = feature.getProperties();
        const id = props.id;

        const consideredRegion =
          id?.startsWith("AT") ||
          id?.startsWith("CH") ||
          id?.startsWith("DE") ||
          id?.startsWith("IT-2") ||
          id?.startsWith("IT-3") ||
          id?.startsWith("IT-5");

        if (props.layer === "outline") {
          return new Style({
            stroke: new Stroke({ color: "#000000", width: 2 }),
          });
        }

        if (
          props.layer !== "micro-regions" ||
          !isCurrentFeature(props) ||
          !consideredRegion
        ) {
          return new Style({});
        }

        const regionData = regionSummaries.find((r) => r.code === id);
        let fillColor = "#ffffff";
        let count = 0;
        let max = 1;

        if (regionData) {
          if (filter.category === "Gefahrenstufe" && filter.value !== "alle") {
            count = regionData.rating_counts[filter.value] || 0;
            max = 210; //maxCounts[filter.value] || 1;
            if (count) {
              fillColor = getColorForCount(count, max);
            }
          } else if (
            filter.category === "Lawinenprobleme" &&
            filter.value !== "alle"
          ) {
            const key = avalancheProblemMapping[filter.value];
            if (key) {
              count = regionData.avalanche_problem_counts[key] || 0;
              max = 210; //maxCounts[key] || 1;
              if (count) {
                fillColor = getColorForCount(count, max);
              }
            }
          }
        }

        if (fillColor === "#ffffff") {
          return new Style({});
        }

        return new Style({
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: "#000000", width: 1 }),
        });
      },
    });

    const handleMapClick = (event) => {
      const coords = event.coordinate; // [x, y] in EPSG:3857
      console.log("Klick-Koordinaten (EPSG:3857):", coords);

      // Optional: Umwandlung in Längen-/Breitengrad (EPSG:4326)
      import("ol/proj").then(({ toLonLat }) => {
        const [lon, lat] = toLonLat(coords);
        console.log(
          `Längengrad: ${lon.toFixed(6)}, Breitengrad: ${lat.toFixed(6)}`
        );
      });
    };

    map.on("click", handleMapClick);
    map.addLayer(vectorTileLayer);

    return () => {
      map.removeLayer(vectorTileLayer);
    };
  }, [map, filter, regionSummaries, maxCounts]);

  return null;
};

export default OpenLayersVectorTileLayer;
