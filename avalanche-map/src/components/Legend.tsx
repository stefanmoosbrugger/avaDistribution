import React from "react";
import { colorClasses } from "../colorUtils";

const MapLegend: React.FC<Props> = ({ filter }) => {
  const legendSteps = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];

  const getColorForValue = (value: number): string | null => {
    const intensity = Math.min(Math.max(value / 210, 0), 1);

    for (const cls of colorClasses) {
      if (intensity >= cls.min && intensity < cls.max) {
        return cls.color;
      }
    }

    if (intensity >= 1) return "#4d0019";

    return null;
  };

  return (
    filter.value !== "alle" && (
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          background: "rgba(255, 255, 255, 0.9)",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          fontSize: "12px",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        <strong>Legende</strong>
        <div style={{ marginTop: "6px" }}>
          {legendSteps.map((val) => {
            const color = getColorForValue(val);
            if (!color) return null;

            return (
              <div
                key={val}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    backgroundColor: color,
                    border: "1px solid #000",
                    marginRight: "6px",
                  }}
                ></div>
                <span>{val}+</span>
              </div>
            );
          })}
        </div>
      </div>
    )
  );
};

export default MapLegend;
