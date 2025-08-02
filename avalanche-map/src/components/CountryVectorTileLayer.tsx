import React, { useEffect } from "react";
import { useMap } from "./AvalancheMap";
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

function shiftColor(hex, percent) {
  // Hex zu RGB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // Prozentuale Änderung anwenden
  r = Math.min(255, Math.max(0, r + r * percent));
  g = Math.min(255, Math.max(0, g + g * percent));
  b = Math.min(255, Math.max(0, b + b * percent));

  // Zurück zu Hex
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hexPart = Math.round(x).toString(16);
        return hexPart.length === 1 ? "0" + hexPart : hexPart;
      })
      .join("")
  );
}

// Country code to color mapping
const countryColors: { [key: string]: string } = {
  AT: "#ff6b6b", // Austria - red
  CH: "#4ecdc4", // Switzerland - teal
  DE: "#ffe66d", // Germany - yellow
  IT: "#1a535c", // Italy - dark teal
  FR: "#7cb518", // France - green
  SI: "#f7b801", // Slovenia - orange
  LI: "#ff9f1c", // Liechtenstein - amber
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

const CountryVectorTileLayer: React.FC<Props> = ({
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

        // Get country code (first 2 characters of the ID)
        let countryCode = "";
        if (id) {
          countryCode = id.substring(0, 2);
        }

        // Get color for country code
        let fillColor = "#ffffff";
        if (countryCode && countryColors[countryCode]) {
          fillColor = countryColors[countryCode];
          if (id.startsWith("AT-07")) {
            fillColor = shiftColor(fillColor, 0.4);
          }
          if (id.startsWith("AT-08")) {
            fillColor = shiftColor(fillColor, -0.4);
          }
          if (id.startsWith("AT-05")) {
            fillColor = shiftColor(fillColor, -0.6);
          }
          if (id.startsWith("IT-32-BZ")) {
            fillColor = shiftColor(fillColor, 0.4);
          }
        }

        return new Style({
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: "#000000", width: 1 }),
        });
      },
    });

    map.addLayer(vectorTileLayer);

    return () => {
      map.removeLayer(vectorTileLayer);
    };
  }, [map, filter, regionSummaries, maxCounts]);

  return null;
};

export default CountryVectorTileLayer;
