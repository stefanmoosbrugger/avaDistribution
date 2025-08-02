import React, { useEffect, useState } from "react";
import { useMap } from "./AvalancheMap";
import { fromLonLat } from "ol/proj";
import { Overlay } from "ol";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  PieController,
} from "chart.js";

// Register required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, PieController);

// Define the super-region positions
const superRegionPositions = {
  CH: [8.2275, 46.8182], // Middle of Switzerland
  DE: [11.3833, 47.6167], // 20km south of Bad Tölz
  "AT-07": [11.4, 47.2683], // Innsbruck
  "AT-08": [9.8167, 47.1667], // Bludenz
  "AT-05": [12.8, 47.3167], // Zell am See
  "AT-other": [15.45, 47.0667], // Graz
  "IT-32-BZ": [11.35, 46.5], // Bozen
  "IT-other": [10.8333, 46.0833], // 50km north of Gardasee
};

// Define colors for the pie chart segments
const dangerLevelColors = [
  "#ccffcc",
  "#ffff00",
  "#ff9900",
  "#ff0000",
  "#9102ff",
];
const avalancheProblemColors = [
  "#3366ff",
  "#ff9900",
  "#33cc33",
  "#ff3300",
  "#cc00cc",
];

interface PieChartLayerProps {
  filter: {
    category: "Gefahrenstufe" | "Lawinenprobleme";
    value: string;
  };
  regionSummaries: Array<{
    code: string;
    name: string;
    rating_counts: { [key: string]: number };
    avalanche_problem_counts: { [key: string]: number };
  }>;
}

interface SuperRegionData {
  [key: string]: {
    dangerLevels: { [key: string]: number };
    avalancheProblems: { [key: string]: number };
  };
}

const PieChartLayer: React.FC<PieChartLayerProps> = ({
  filter,
  regionSummaries,
}) => {
  const map = useMap();
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [superRegionData, setSuperRegionData] = useState<SuperRegionData>({});

  // Group regions into super-regions and calculate accumulated counts
  useEffect(() => {
    if (!regionSummaries.length) return;

    const data: SuperRegionData = {
      CH: { dangerLevels: {}, avalancheProblems: {} },
      DE: { dangerLevels: {}, avalancheProblems: {} },
      "AT-07": { dangerLevels: {}, avalancheProblems: {} },
      "AT-08": { dangerLevels: {}, avalancheProblems: {} },
      "AT-05": { dangerLevels: {}, avalancheProblems: {} },
      "AT-other": { dangerLevels: {}, avalancheProblems: {} },
      "IT-32-BZ": { dangerLevels: {}, avalancheProblems: {} },
      "IT-other": { dangerLevels: {}, avalancheProblems: {} },
    };

    // Initialize counts
    Object.keys(data).forEach((region) => {
      data[region].dangerLevels = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
      data[region].avalancheProblems = {
        wind_drifted_snow: 0,
        new_snow: 0,
        wet_snow: 0,
        gliding_snow: 0,
        persistent_weak_layers: 0,
      };
    });

    // Accumulate counts for each region
    regionSummaries.forEach((region) => {
      const code = region.code;
      let superRegion = "";

      // Determine which super-region this region belongs to
      if (code.startsWith("CH")) {
        superRegion = "CH";
      } else if (code.startsWith("DE")) {
        superRegion = "DE";
      } else if (code.startsWith("AT-07")) {
        superRegion = "AT-07";
      } else if (code.startsWith("AT-08")) {
        superRegion = "AT-08";
      } else if (code.startsWith("AT-05")) {
        superRegion = "AT-05";
      } else if (code.startsWith("AT")) {
        superRegion = "AT-other";
      } else if (code.startsWith("IT-32-BZ")) {
        superRegion = "IT-32-BZ";
      } else if (code.startsWith("IT")) {
        superRegion = "IT-other";
      } else {
        return; // Skip if not in any super-region
      }

      // Accumulate danger level counts
      Object.entries(region.rating_counts).forEach(([level, count]) => {
        data[superRegion].dangerLevels[level] =
          (data[superRegion].dangerLevels[level] || 0) + (count as number);
      });

      // Accumulate avalanche problem counts
      Object.entries(region.avalanche_problem_counts).forEach(
        ([problem, count]) => {
          data[superRegion].avalancheProblems[problem] =
            (data[superRegion].avalancheProblems[problem] || 0) +
            (count as number);
        }
      );
    });

    setSuperRegionData(data);
  }, [regionSummaries]);

  // Create and add overlays to the map
  useEffect(() => {
    if (
      !map ||
      !Object.keys(superRegionData).length ||
      filter.value !== "alle"
    ) {
      // Remove existing overlays when filter is not "alle"
      overlays.forEach((overlay) => map?.removeOverlay(overlay));
      setOverlays([]);
      return;
    }

    // Remove existing overlays
    overlays.forEach((overlay) => map.removeOverlay(overlay));

    // Create new overlays
    const newOverlays: Overlay[] = [];

    Object.entries(superRegionPositions).forEach(([region, position]) => {
      if (!superRegionData[region]) return;

      // Create container element for the chart
      const element = document.createElement("div");
      element.className = "pie-chart-container";
      element.style.width = "50px";
      element.style.height = "50px";
      element.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      element.style.borderRadius = "50%";
      element.style.padding = "5px";
      element.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.3)";

      // Create overlay
      const overlay = new Overlay({
        element: element,
        position: fromLonLat(position),
        positioning: "center-center",
        stopEvent: true,
      });

      // Add overlay to map
      map.addOverlay(overlay);
      newOverlays.push(overlay);

      // Render chart in the element
      const chartData =
        filter.category === "Gefahrenstufe"
          ? {
              labels: ["1", "2", "3", "4", "5"],
              datasets: [
                {
                  data: [
                    superRegionData[region].dangerLevels["1"],
                    superRegionData[region].dangerLevels["2"],
                    superRegionData[region].dangerLevels["3"],
                    superRegionData[region].dangerLevels["4"],
                    superRegionData[region].dangerLevels["5"],
                  ],
                  backgroundColor: dangerLevelColors,
                  borderWidth: 1,
                },
              ],
            }
          : {
              labels: [
                "Triebschnee",
                "Neuschnee",
                "Nassschnee",
                "Gleitschnee",
                "Altschnee",
              ],
              datasets: [
                {
                  data: [
                    superRegionData[region].avalancheProblems.wind_drifted_snow,
                    superRegionData[region].avalancheProblems.new_snow,
                    superRegionData[region].avalancheProblems.wet_snow,
                    superRegionData[region].avalancheProblems.gliding_snow,
                    superRegionData[region].avalancheProblems
                      .persistent_weak_layers,
                  ],
                  backgroundColor: avalancheProblemColors,
                  borderWidth: 1,
                },
              ],
            };

      // Use React to render the chart into the element
      const root = document.createElement("div");
      root.style.width = "100%";
      root.style.height = "100%";
      element.appendChild(root);

      // Add region label
      // const label = document.createElement("div");
      // label.textContent = region;
      // label.style.textAlign = "center";
      // label.style.fontWeight = "bold";
      // label.style.fontSize = "12px";
      // label.style.marginTop = "5px";
      // element.appendChild(label);

      // Render the chart using vanilla JS since we can't use React directly here
      const canvas = document.createElement("canvas");
      root.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        new ChartJS(ctx, {
          type: "pie",
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false,
              },
            },
          },
        });
      }
    });

    setOverlays(newOverlays);

    // Cleanup function
    return () => {
      newOverlays.forEach((overlay) => map.removeOverlay(overlay));
    };
  }, [map, superRegionData, filter]);

  return null;
};

export default PieChartLayer;
