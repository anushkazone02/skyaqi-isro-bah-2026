import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { useCSV } from '../useCSV';
import { getAqiCategory, AQI_SCALE } from '../utils';
import AQIInfoPanel from './AQIInfoPanel';
import WindPanel from './WindPanel';

const PUNJAB_CENTER = [31.1, 75.3];

export default function AQIMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersRef = useRef([]);
  const [showMarkers, setShowMarkers] = useState(false);
  const { data: aqiData, loading } = useCSV('/data/aqi_predictions.csv');

  // Stats
  const stats = useMemo(() => {
    if (!aqiData.length) return { avg: 0, max: 0, pctPoor: 0 };
    const avg = Math.round(aqiData.reduce((s, r) => s + r.predicted_aqi, 0) / aqiData.length);
    const max = Math.max(...aqiData.map(r => r.predicted_aqi));
    const poor = aqiData.filter(r => r.predicted_aqi > 200).length;
    const pctPoor = Math.round((poor / aqiData.length) * 100);
    return { avg, max, pctPoor };
  }, [aqiData]);

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const container = mapRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: PUNJAB_CENTER,
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
      minZoom: 5,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;

    // Fix Leaflet container sizing in flex layout
    const fix = () => { map.invalidateSize(); map.setView(PUNJAB_CENTER, 7); };
    setTimeout(fix, 50);
    setTimeout(fix, 200);
    setTimeout(fix, 600);
  }, []);


  // Add heatmap once data is ready
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !aqiData.length) return;

    // Remove old heat layer and markers
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Fit to data bounds
    const lats = aqiData.map(r => r.lat);
    const lons = aqiData.map(r => r.lon);
    const bounds = L.latLngBounds(
      [Math.min(...lats) - 0.3, Math.min(...lons) - 0.3],
      [Math.max(...lats) + 0.3, Math.max(...lons) + 0.3]
    );
    map.fitBounds(bounds, { padding: [20, 20] });

    // Build heatmap points: [lat, lon, intensity 0–1]
    const maxAqi = Math.max(...aqiData.map(r => r.predicted_aqi));
    const heatPoints = aqiData.map(row => [
      row.lat,
      row.lon,
      Math.min(row.predicted_aqi / maxAqi, 1),
    ]);

    // Custom gradient matching Indian AQI scale
    const heat = L.heatLayer(heatPoints, {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      max: 1,
      gradient: {
        0.00: '#00c853',   // Good
        0.20: '#aeea00',   // Satisfactory
        0.40: '#ffd600',   // Moderate
        0.60: '#ff6d00',   // Poor
        0.80: '#dd2c00',   // Very Poor
        1.00: '#6a0000',   // Severe
      },
    });
    heat.addTo(map);
    heatLayerRef.current = heat;

    // Also add popup markers (smaller, subtle)
    aqiData.forEach(row => {
      const cat = getAqiCategory(row.predicted_aqi);
      const isLow = row.confidence === 'medium';
      const size = 10;
      const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-1}"
          fill="${cat.color}"
          fill-opacity="${isLow ? 0.3 : 0.7}"
          stroke="${cat.color}"
          stroke-width="1"
          stroke-dasharray="${isLow ? '2,2' : 'none'}"
        />
      </svg>`;
      const icon = L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size/2, size/2] });
      const marker = L.marker([row.lat, row.lon], { icon, opacity: showMarkers ? 1 : 0 });
      marker.bindPopup(`
        <div class="custom-tooltip">
          <div class="tooltip-aqi" style="color:${cat.color}">${row.predicted_aqi}</div>
          <div class="tooltip-cat">${cat.label}</div>
          <div class="tooltip-row"><span class="tooltip-key">CONF</span><span class="tooltip-val">${row.confidence?.toUpperCase()}</span></div>
          <div class="tooltip-row"><span class="tooltip-key">LAT</span><span class="tooltip-val">${Number(row.lat).toFixed(3)}</span></div>
          <div class="tooltip-row"><span class="tooltip-key">LON</span><span class="tooltip-val">${Number(row.lon).toFixed(3)}</span></div>
        </div>
      `, { className: 'leaflet-popup-no-style' });
      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [aqiData]);

  // Toggle marker opacity
  useEffect(() => {
    markersRef.current.forEach(m => {
      m.setOpacity(showMarkers ? 1 : 0);
    });
  }, [showMarkers]);

  const statAvgCat = getAqiCategory(stats.avg);

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">▸ View 01 — Surface AQI Prediction</div>
        <h1 className="hero-title">Punjab Air Quality <span>Intelligence Map</span></h1>
        <p className="hero-statement">
          <strong>600 million+ Indians</strong> live beyond reach of a ground air quality monitor.
          This system fills that gap — predicting surface AQI across Punjab using satellite AOD and meteorological
          reanalysis, corrected for atmospheric boundary layer height before modeling.
        </p>
      </div>

      {/* Stat cards */}
      <div className="stat-cards section-gap">
        <div className="stat-card">
          <div className="stat-card-label">Mean Predicted AQI</div>
          <div className="stat-card-value" style={{ color: statAvgCat.color }}>{loading ? '—' : stats.avg}</div>
          <div className="stat-card-sub">{loading ? '' : statAvgCat.label}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Peak AQI</div>
          <div className="stat-card-value" style={{ color: getAqiCategory(stats.max).color }}>{loading ? '—' : stats.max}</div>
          <div className="stat-card-sub">{loading ? '' : getAqiCategory(stats.max).label}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Area in Poor+</div>
          <div className="stat-card-value" style={{ color: '#ff6d00' }}>{loading ? '—' : `${stats.pctPoor}%`}</div>
          <div className="stat-card-sub">Predicted AQI &gt; 200</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Data Points</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-cyan)' }}>{loading ? '—' : aqiData.length}</div>
          <div className="stat-card-sub">Satellite grid cells</div>
        </div>
      </div>

      {/* Main layout: Map + AQI Panel side by side */}
      <div className="aqi-main-layout section-gap">
        {/* Map */}
        <div className="map-section-inner">
          <div className="map-container">
            <div className="map-inner" ref={mapRef} />
            {loading && (
              <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(8,13,20,0.7)',zIndex:900 }}>
                <span style={{ fontFamily:'var(--font-mono)',color:'var(--accent-cyan)',letterSpacing:2 }}>LOADING DATA...</span>
              </div>
            )}

            {/* Heatmap toggle */}
            <div className="map-toggle-bar">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showMarkers}
                  onChange={e => setShowMarkers(e.target.checked)}
                  style={{ accentColor: 'var(--accent-cyan)' }}
                />
                <span>Show Grid Points</span>
              </label>
              <span className="map-toggle-info">🌡 AQI Heatmap active</span>
            </div>

            {/* Legend */}
            <div className="legend-panel">
              <div className="legend-title">AQI Scale (Indian Std.)</div>
              {AQI_SCALE.map(s => (
                <div className="legend-row" key={s.label}>
                  <div className="legend-swatch" style={{ background: s.color }} />
                  <span className="legend-label">{s.label}</span>
                  <span className="legend-range">{s.min}–{s.max}</span>
                </div>
              ))}
              <hr className="legend-divider" />
              <div className="legend-title">Confidence</div>
              <div className="legend-conf-row">
                <div className="conf-high" />
                <span className="legend-label" style={{ fontSize: 11 }}>High confidence</span>
              </div>
              <div className="legend-conf-row">
                <div className="conf-med" />
                <span className="legend-label" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Medium — uncertain</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                Faded/dashed cells show<br/>where the model is less sure.<br/>We don't hide uncertainty.
              </div>
            </div>
          </div>
        </div>

        {/* AQI Info Panel */}
        <div className="aqi-panel-slot">
          <AQIInfoPanel avgAqi={stats.avg || 197} />
        </div>
      </div>

      {/* Wind Panel below */}
      <div style={{ padding: '0 28px 32px' }}>
        <WindPanel />
      </div>
    </div>
  );
}
