import React, { useEffect } from "react";
import { useMap } from "./AvalancheMap";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import MVT from "ol/format/MVT";
import Point from "ol/geom/Point";
import { Style, Fill, Stroke, Text } from "ol/style";
import { transformExtent } from "ol/proj";
import TileGrid from "ol/tilegrid/TileGrid";
import Tile from "ol/VectorTile";

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

function getColorForCount(count: number, max: number): string {
  const intensity = Math.min(Math.max(count / max, 0), 1);
  if (count === 0) return "#ffffff";
  if (intensity < 0.25) return "#ffffb2";
  if (intensity < 0.5) return "#fecc5c";
  if (intensity < 0.75) return "#fd8d3c";
  return "#e31a1c";
}

const OpenLayersVectorTileLayerWithMarkers: React.FC<Props> = ({
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

    const idToCenterMap = new Map<string, [number, number]>();

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

        if (regionData) {
          let count = 0;

          if (filter.category === "Gefahrenstufe" && filter.value !== "alle") {
            count = regionData.rating_counts[filter.value] || 0;
            const max = maxCounts[filter.value] || 1;
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
              const max = maxCounts[key] || 1;
              if (count) {
                fillColor = getColorForCount(count, max);
              }
            }
          }
        }

        if (fillColor === "#ffffff") {
          return new Style({});
        }

        console.log(idToCenterMap.get(id));

        return new Style({
          fill: new Fill({ color: fillColor }),
          stroke: new Stroke({ color: "#000000", width: 1 }),
        });
      },
    });

    map.addLayer(vectorTileLayer);

    const handleTileLoad = (event) => {
      const tile = event.tile;
      const features = tile.getFeatures(); // <- hier kommst du ran!

      features.forEach((feature) => {
        const props = feature.getProperties();
        const id = props.id;

        if (id && !idToCenterMap.has(id)) {
          const geometry = feature.getGeometry();
          if (geometry) {
            const extent = geometry.getExtent(); // [minX, minY, maxX, maxY]
            const centerX = (extent[0] + extent[2]) / 2;
            const centerY = (extent[1] + extent[3]) / 2;
            idToCenterMap.set(id, [centerX, centerY]);
          }
        }
      });
    };

    vectorTileSource.on("tileloadend", handleTileLoad);

    return () => {
      map.removeLayer(vectorTileLayer);
    };
  }, [map, filter, regionSummaries, maxCounts]);

  return null;
};

export default OpenLayersVectorTileLayerWithMarkers;
