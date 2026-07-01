// AQI colour scale (Indian standard)
export const AQI_SCALE = [
  { label: 'Good',       min: 0,   max: 50,  color: '#00c853', rgb: [0,200,83] },
  { label: 'Satisfactory', min: 51, max: 100, color: '#aeea00', rgb: [174,234,0] },
  { label: 'Moderate',  min: 101, max: 200, color: '#ffd600', rgb: [255,214,0] },
  { label: 'Poor',      min: 201, max: 300, color: '#ff6d00', rgb: [255,109,0] },
  { label: 'Very Poor', min: 301, max: 400, color: '#dd2c00', rgb: [221,44,0] },
  { label: 'Severe',    min: 401, max: 500, color: '#6a0000', rgb: [106,0,0] },
];

export function getAqiCategory(aqi) {
  return AQI_SCALE.find(s => aqi >= s.min && aqi <= s.max) || AQI_SCALE[AQI_SCALE.length - 1];
}

// Generate all dates in Oct–Nov 2023
export function generateDateRange() {
  const dates = [];
  const start = new Date('2023-10-01');
  const end   = new Date('2023-11-30');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
