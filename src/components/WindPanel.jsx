import { useEffect, useRef, useState } from 'react';

// Simulated wind field over Punjab (lat 29.5–32.6, lon 73.5–77.0)
// Returns array of { lat, lon, u, v, speed, deg }
function generateWindField() {
  const field = [];
  const BASE_U = 3.5;  // m/s eastward
  const BASE_V = -1.2; // m/s northward
  for (let lat = 29.7; lat <= 32.5; lat += 0.35) {
    for (let lon = 73.7; lon <= 76.8; lon += 0.35) {
      const u = BASE_U + (Math.sin(lat * 4) * 1.8) + (Math.random() * 1.2 - 0.6);
      const v = BASE_V + (Math.cos(lon * 3) * 1.4) + (Math.random() * 1.0 - 0.5);
      const speed = Math.sqrt(u * u + v * v);
      const deg = (Math.atan2(u, v) * 180) / Math.PI;
      field.push({ lat, lon, u, v, speed, deg });
    }
  }
  return field;
}

const WIND_FIELD = generateWindField();

// Wind direction labels
function windDirLabel(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) + 360) / 22.5) % 16];
}

// Speed color (calm=blue → strong=red)
function speedColor(speed) {
  const t = Math.min(speed / 12, 1);
  const r = Math.round(59 + t * 196);
  const g = Math.round(158 - t * 130);
  const b = Math.round(255 - t * 200);
  return `rgb(${r},${g},${b})`;
}

export default function WindPanel() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const frameRef = useRef(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [avgDir, setAvgDir] = useState('NE');
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    const speeds = WIND_FIELD.map(f => f.speed);
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    setAvgSpeed(mean.toFixed(1));
    const meanDeg = WIND_FIELD.reduce((a, f) => a + f.deg, 0) / WIND_FIELD.length;
    setAvgDir(windDirLabel(meanDeg));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Map lat/lon to canvas coords
    const LAT_MIN = 29.5, LAT_MAX = 32.6;
    const LON_MIN = 73.5, LON_MAX = 77.0;

    function toCanvas(lat, lon) {
      const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * canvas.width;
      const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * canvas.height;
      return { x, y };
    }

    // Particles for wind animation
    const NUM_PARTICLES = 300;
    const particles = Array.from({ length: NUM_PARTICLES }, () => ({
      lat: LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN),
      lon: LON_MIN + Math.random() * (LON_MAX - LON_MIN),
      age: Math.floor(Math.random() * 80),
      maxAge: 60 + Math.floor(Math.random() * 50),
    }));

    function getWindAt(lat, lon) {
      // Find nearest wind cell
      let best = WIND_FIELD[0];
      let bestDist = Infinity;
      for (const f of WIND_FIELD) {
        const d = (f.lat - lat) ** 2 + (f.lon - lon) ** 2;
        if (d < bestDist) { bestDist = d; best = f; }
      }
      return best;
    }

    function draw() {
      frameRef.current++;
      const t = frameRef.current;
      const W = canvas.width;
      const H = canvas.height;

      // Fade trail
      ctx.fillStyle = 'rgba(11,18,30,0.18)';
      ctx.fillRect(0, 0, W, H);

      // Draw particles
      for (const p of particles) {
        p.age++;
        if (p.age > p.maxAge) {
          p.lat = LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN);
          p.lon = LON_MIN + Math.random() * (LON_MAX - LON_MIN);
          p.age = 0;
          p.maxAge = 60 + Math.floor(Math.random() * 50);
          continue;
        }
        const wind = getWindAt(p.lat, p.lon);
        const spd = wind.speed;

        const prevPos = toCanvas(p.lat, p.lon);

        // Move particle
        const DT = 0.0007;
        p.lon += wind.u * DT;
        p.lat += wind.v * DT;

        // Wrap/reset
        if (p.lat < LAT_MIN || p.lat > LAT_MAX || p.lon < LON_MIN || p.lon > LON_MAX) {
          p.lat = LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN);
          p.lon = LON_MIN + Math.random() * (LON_MAX - LON_MIN);
          p.age = 0;
          continue;
        }

        const curPos = toCanvas(p.lat, p.lon);
        const life = 1 - p.age / p.maxAge;
        const alpha = life * 0.75;

        ctx.beginPath();
        ctx.moveTo(prevPos.x, prevPos.y);
        ctx.lineTo(curPos.x, curPos.y);
        ctx.strokeStyle = speedColor(spd).replace('rgb', 'rgba').replace(')', `,${alpha})`);
        ctx.lineWidth = 1.2 + spd * 0.08;
        ctx.stroke();
      }

      // Draw direction arrows on grid cells
      if (t % 1 === 0) {
        for (const f of WIND_FIELD) {
          const pos = toCanvas(f.lat, f.lon);
          const scale = Math.min(f.speed * 2.2, 18);
          const dx = (f.u / f.speed) * scale;
          const dy = -(f.v / f.speed) * scale;
          const alpha = 0.3 + (f.speed / 12) * 0.4;
          const color = speedColor(f.speed);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(pos.x - dx * 0.4, pos.y - dy * 0.4);
          ctx.lineTo(pos.x + dx * 0.7, pos.y + dy * 0.7);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(dy, dx);
          const hs = 5;
          ctx.beginPath();
          ctx.moveTo(pos.x + dx * 0.7, pos.y + dy * 0.7);
          ctx.lineTo(
            pos.x + dx * 0.7 - hs * Math.cos(angle - 0.5),
            pos.y + dy * 0.7 - hs * Math.sin(angle - 0.5)
          );
          ctx.lineTo(
            pos.x + dx * 0.7 - hs * Math.cos(angle + 0.5),
            pos.y + dy * 0.7 - hs * Math.sin(angle + 0.5)
          );
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Wind speed color scale for legend
  const SPEED_STOPS = [0, 3, 6, 9, 12];

  return (
    <div className="wind-panel">
      {/* Header */}
      <div className="wind-panel-header">
        <div className="wind-panel-title">
          <span className="wind-icon">💨</span>
          Wind Animation &amp; Direction
        </div>
        <div className="wind-meta">
          <div className="wind-meta-chip">
            <span className="wind-meta-lbl">Avg Speed</span>
            <span className="wind-meta-val">{avgSpeed} <span style={{fontSize:10}}>m/s</span></span>
          </div>
          <div className="wind-meta-chip">
            <span className="wind-meta-lbl">Direction</span>
            <span className="wind-meta-val">{avgDir}</span>
          </div>
          <div className="wind-meta-chip" style={{ minWidth: 110 }}>
            <span className="wind-meta-lbl">Compass</span>
            <span className="wind-meta-val" style={{ fontSize: 18 }}>
              {avgDir === 'NE' || avgDir === 'E' || avgDir === 'SE' || avgDir === 'ENE' || avgDir === 'ESE' || avgDir === 'NNE' ? '↗' : '→'}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="wind-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={900}
          height={260}
          className="wind-canvas"
        />
        {/* Overlay labels */}
        <div className="wind-overlay-label top-left">PUNJAB WIND FIELD</div>
        <div className="wind-overlay-label top-right">Oct–Nov 2023 · 10m AGL</div>

        {/* Speed legend */}
        <div className="wind-speed-legend">
          <div className="wind-legend-title">Wind Speed (m/s)</div>
          <div className="wind-legend-bar">
            {SPEED_STOPS.map((spd, i) => (
              <div key={spd} className="wind-legend-seg">
                <div
                  className="wind-legend-color"
                  style={{ background: speedColor(spd) }}
                />
                <span className="wind-legend-lbl">{spd}</span>
              </div>
            ))}
            <div className="wind-legend-seg">
              <div className="wind-legend-color" style={{ background: speedColor(12) }} />
              <span className="wind-legend-lbl">12+</span>
            </div>
          </div>
        </div>

        {/* Wind direction compass rose */}
        <div className="wind-compass">
          <div className="compass-ring">
            {['N','E','S','W'].map((d, i) => (
              <div
                key={d}
                className="compass-label"
                style={{ transform: `rotate(${i * 90}deg) translateY(-28px) rotate(-${i * 90}deg)` }}
              >
                {d}
              </div>
            ))}
            <div
              className="compass-needle"
              style={{ transform: `rotate(${45}deg)` }}
            >
              <div className="needle-north" />
              <div className="needle-south" />
            </div>
            <div className="compass-center" />
          </div>
        </div>
      </div>

      {/* Hourly wind strip */}
      <div className="wind-hourly-strip">
        <div className="wind-hourly-title">Hourly Wind Direction (24h)</div>
        <div className="wind-hourly-cells">
          {Array.from({ length: 24 }, (_, h) => {
            const deg = 30 + Math.sin(h * 0.4) * 60 + Math.random() * 20;
            const spd = 3 + Math.sin(h * 0.3 + 1) * 2.5 + Math.random();
            return (
              <div key={h} className="wind-hour-cell">
                <div className="wind-hour-label">{h}h</div>
                <div
                  className="wind-hour-arrow"
                  style={{
                    transform: `rotate(${deg}deg)`,
                    color: speedColor(spd),
                  }}
                >
                  ↑
                </div>
                <div className="wind-hour-spd" style={{ color: speedColor(spd) }}>
                  {spd.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
