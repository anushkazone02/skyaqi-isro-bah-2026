import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { useCSV } from '../useCSV';
import { generateDateRange, formatDateDisplay } from '../utils';

const PUNJAB_CENTER = [31.1, 75.3];

// Index data by date
function indexByDate(rows, key = 'date') {
  const idx = {};
  rows.forEach(r => {
    const d = r[key];
    if (!idx[d]) idx[d] = [];
    idx[d].push(r);
  });
  return idx;
}

// Build fire SVG icon
function makeFireIcon() {
  return L.divIcon({
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:radial-gradient(circle,#ff4400,#ff0000);
      box-shadow:0 0 8px 3px rgba(255,80,0,0.7);
      animation:fire-pulse 1.2s ease-in-out infinite alternate;
    "></div>`,
    className: 'fire-icon',
    iconSize: [12, 12], iconAnchor: [6, 6],
  });
}

// Build HCHO icon
function makeHchoIcon(anomaly) {
  const r = Math.min(4 + anomaly * 3.5, 24);
  const opacity = Math.min(0.5 + anomaly * 0.08, 0.9);
  return L.divIcon({
    html: `<div style="
      width:${r*2}px;height:${r*2}px;border-radius:50%;
      background:radial-gradient(circle,rgba(160,80,255,${opacity}),rgba(100,0,200,0.1));
      box-shadow:0 0 ${r}px ${r/2}px rgba(160,80,255,0.5);
      border:1px solid rgba(180,111,255,0.6);
    "></div>`,
    className: 'hcho-icon',
    iconSize: [r*2, r*2], iconAnchor: [r, r],
  });
}

const DATES = generateDateRange();

export default function FireHCHOMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const fireLayerRef = useRef(L.layerGroup());
  const hchoLayerRef = useRef(L.layerGroup());
  const animRef = useRef(null);

  const [dateIdx, setDateIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed] = useState(600); // ms per day

  const { data: firesRaw, loading: loadingF } = useCSV('/data/fires.csv');
  const { data: hchoRaw,  loading: loadingH } = useCSV('/data/hcho_hotspots.csv');

  const firesByDate = useMemo(() => indexByDate(firesRaw), [firesRaw]);
  const hchoByDate  = useMemo(() => indexByDate(hchoRaw),  [hchoRaw]);

  const currentDate = DATES[dateIdx];
  const todayFires  = firesByDate[currentDate] || [];
  const todayHcho   = hchoByDate[currentDate]?.filter(r => r.is_hotspot == 1) || [];

  // Init map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: PUNJAB_CENTER, zoom: 7,
      zoomControl: false, attributionControl: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    fireLayerRef.current.addTo(map);
    hchoLayerRef.current.addTo(map);
    mapInstanceRef.current = map;
  }, []);

  // Render markers for current date
  useEffect(() => {
    fireLayerRef.current.clearLayers();
    hchoLayerRef.current.clearLayers();

    // Show fires from today + 1 day before (linger effect)
    const prevDate = DATES[Math.max(0, dateIdx - 1)];
    const firesToShow = [...(firesByDate[currentDate] || []), ...(firesByDate[prevDate] || [])];
    firesToShow.forEach(r => {
      const m = L.marker([r.lat, r.lon], { icon: makeFireIcon() });
      m.bindPopup(`<div class="custom-tooltip">
        <div style="color:#ff4400;font-size:16px;font-weight:700">🔥 Active Fire</div>
        <div class="tooltip-row"><span class="tooltip-key">DATE</span><span class="tooltip-val">${r.date}</span></div>
        <div class="tooltip-row"><span class="tooltip-key">LAT</span><span class="tooltip-val">${Number(r.lat).toFixed(3)}</span></div>
        <div class="tooltip-row"><span class="tooltip-key">LON</span><span class="tooltip-val">${Number(r.lon).toFixed(3)}</span></div>
      </div>`, { className: 'leaflet-popup-no-style' });
      fireLayerRef.current.addLayer(m);
    });

    todayHcho.forEach(r => {
      const m = L.marker([r.lat, r.lon], { icon: makeHchoIcon(r.hcho_anomaly) });
      m.bindPopup(`<div class="custom-tooltip">
        <div style="color:#b46fff;font-size:16px;font-weight:700">☁ HCHO Hotspot</div>
        <div class="tooltip-row"><span class="tooltip-key">ANOMALY</span><span class="tooltip-val">+${Number(r.hcho_anomaly).toFixed(2)}σ</span></div>
        <div class="tooltip-row"><span class="tooltip-key">DATE</span><span class="tooltip-val">${r.date}</span></div>
      </div>`, { className: 'leaflet-popup-no-style' });
      hchoLayerRef.current.addLayer(m);
    });
  }, [dateIdx, firesByDate, hchoByDate]);

  // Play/pause
  const tick = useCallback(() => {
    setDateIdx(i => {
      if (i >= DATES.length - 1) { setPlaying(false); return 0; }
      return i + 1;
    });
  }, []);

  useEffect(() => {
    if (playing) {
      animRef.current = setInterval(tick, speed);
    } else {
      clearInterval(animRef.current);
    }
    return () => clearInterval(animRef.current);
  }, [playing, speed, tick]);

  const loading = loadingF || loadingH;

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">▸ View 02 — Fire → HCHO Causal Chain (Centerpiece)</div>
        <h1 className="hero-title">From Stubble Fire to <span>Poison Cloud</span></h1>
        <p className="hero-statement">
          Press <strong style={{color:'var(--accent-cyan)'}}>▶ Play</strong> to watch fires ignite across Punjab, then
          purple HCHO hotspots bloom <strong>1–3 days later downwind</strong> — satellite data
          making the causal chain <em>watchable</em>, not just describable.
        </p>
      </div>

      {/* Map */}
      <div className="map-section section-gap">
        <div className="map-container">
          <div className="map-inner" ref={mapRef} />

          {loading && (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(8,13,20,0.8)',zIndex:900 }}>
              <span style={{ fontFamily:'var(--font-mono)',color:'var(--accent-cyan)',letterSpacing:2 }}>LOADING FIRE & HCHO DATA...</span>
            </div>
          )}

          {/* Map legend */}
          <div className="legend-panel">
            <div className="legend-title">Layer Key</div>
            <div className="legend-row">
              <div style={{ width:12,height:12,borderRadius:'50%',background:'#ff4400',boxShadow:'0 0 6px #ff4400',flexShrink:0 }} />
              <span className="legend-label">Active Fire (NASA FIRMS)</span>
            </div>
            <div className="legend-row" style={{ marginTop: 4 }}>
              <div style={{ width:16,height:16,borderRadius:'50%',background:'radial-gradient(circle,rgba(160,80,255,0.8),rgba(100,0,200,0.2))',boxShadow:'0 0 8px rgba(180,111,255,0.6)',border:'1px solid rgba(180,111,255,0.5)',flexShrink:0 }} />
              <span className="legend-label">HCHO Hotspot — glow∝anomaly</span>
            </div>
            <hr className="legend-divider" />
            <div style={{ fontSize:10,color:'var(--text-muted)',fontFamily:'var(--font-mono)',lineHeight:1.6 }}>
              Hotspots appear 1–3 days<br />after nearby fire events.<br />This lag = smoke transport time.
            </div>
          </div>

          {/* Inline fire-pulse keyframes */}
          <style>{`
            @keyframes fire-pulse {
              from { box-shadow: 0 0 6px 2px rgba(255,80,0,0.6); }
              to   { box-shadow: 0 0 14px 6px rgba(255,80,0,0.9); }
            }
            .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: transparent !important; border: none !important; box-shadow: none !important; }
            .leaflet-popup-content { margin: 0 !important; }
          `}</style>
        </div>
      </div>

      {/* Controls bar */}
      <div className="controls-bar">
        <button
          id="play-pause-btn"
          className="play-btn"
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={loading}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <div className="slider-wrap">
          <div className="date-label">
            {formatDateDisplay(currentDate)}
            <span style={{ marginLeft:12,fontSize:10,color:'var(--text-muted)' }}>
              Day {dateIdx+1} of {DATES.length}
            </span>
          </div>
          <input
            type="range" className="date-slider"
            min={0} max={DATES.length - 1} value={dateIdx}
            onChange={e => { setPlaying(false); setDateIdx(Number(e.target.value)); }}
          />
          <div style={{ display:'flex',justifyContent:'space-between',marginTop:2 }}>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-muted)' }}>1 Oct 2023</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text-muted)' }}>30 Nov 2023</span>
          </div>
        </div>

        <div className="counters">
          <div className="counter-chip">
            <div className="counter-chip-val" style={{ color:'#ff4400' }}>{todayFires.length}</div>
            <div className="counter-chip-lbl">Fires today</div>
          </div>
          <div className="counter-chip">
            <div className="counter-chip-val" style={{ color:'#b46fff' }}>{todayHcho.length}</div>
            <div className="counter-chip-lbl">HCHO hotspots</div>
          </div>
        </div>
      </div>
    </div>
  );
}
