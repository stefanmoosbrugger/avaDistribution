// colorUtils.ts

export const colorClasses = [
  { min: 0.00001, max: 0.1, color: "#ffffcc" },
  { min: 0.1, max: 0.2, color: "#ffeda0" },
  { min: 0.2, max: 0.3, color: "#fed976" },
  { min: 0.3, max: 0.4, color: "#feb24c" },
  { min: 0.4, max: 0.5, color: "#fd8d3c" },
  { min: 0.5, max: 0.6, color: "#fc4e2a" },
  { min: 0.6, max: 0.7, color: "#e31a1c" },
  { min: 0.7, max: 0.8, color: "#bd0026" },
  { min: 0.8, max: 0.9, color: "#800026" },
  { min: 0.9, max: 1, color: "#4d0019" },
];

export function getColorForCount(count: number, max: number): string {
  const intensity = Math.min(Math.max(count / max, 0), 1);
  if (count === 0) return "#ffffff"; // Weiß für 0

  for (const cls of colorClasses) {
    if (intensity >= cls.min && intensity < cls.max) {
      return cls.color;
    }
  }

  return "#4d0019"; // höchste Intensität (>= 1)
}
