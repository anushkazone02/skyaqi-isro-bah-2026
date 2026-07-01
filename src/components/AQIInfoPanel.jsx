import { useEffect, useRef, useMemo } from 'react';
import { getAqiCategory, AQI_SCALE } from '../utils';

// Simulated pollutant data for the panel
const POLLUTANTS = [
  { key: 'PM2.5',  val: 87,  unit: 'µg/m³', max: 250, sup: '2.5' },
  { key: 'PM10',   val: 124, unit: 'µg/m³', max: 350, sup: '10' },
  { key: 'CO',     val: 1.8, unit: 'mg/m³', max: 10,  sup: null },
  { key: 'SO₂',   val: 14,  unit: 'ppb',   max: 100, sup: null },
  { key: 'NO₂',   val: 38,  unit: 'ppb',   max: 200, sup: null },
  { key: 'O₃',    val: 52,  unit: 'ppb',   max: 200, sup: null },
];

// Generate 24-hr synthetic AQI trend
function genTrend(center) {
  const pts = [];
  for (let h = 0; h < 24; h++) {
    const noise = (Math.sin(h * 0.7 + 1.2) * 40) + (Math.random() * 30 - 15);
    pts.push(Math.max(10, Math.round(center + noise)));
  }
  return pts;
}

function Sparkline({ data, color }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(99,179,237,0.07)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(f => {
      ctx.beginPath();
      ctx.moveTo(0, f * H);
      ctx.lineTo(W, f * H);
      ctx.stroke();
    });

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');

    // Build path
    const xs = data.map((_, i) => (i / (data.length - 1)) * W);
    const ys = data.map(v => H - ((v - min) / range) * (H - 4) - 2);

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < data.length; i++) {
      const cpx = (xs[i - 1] + xs[i]) / 2;
      ctx.bezierCurveTo(cpx, ys[i - 1], cpx, ys[i], xs[i], ys[i]);
    }

    // Fill
    ctx.lineTo(xs[xs.length - 1], H);
    ctx.lineTo(xs[0], H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < data.length; i++) {
      const cpx = (xs[i - 1] + xs[i]) / 2;
      ctx.bezierCurveTo(cpx, ys[i - 1], cpx, ys[i], xs[i], ys[i]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dot at peak
    const peakIdx = data.indexOf(Math.max(...data));
    ctx.beginPath();
    ctx.arc(xs[peakIdx], ys[peakIdx], 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data, color]);

  return <canvas ref={canvasRef} width={280} height={70} style={{ width: '100%', height: 70 }} />;
}

export default function AQIInfoPanel({ avgAqi }) {
  const aqi = avgAqi || 197;
  const cat = getAqiCategory(aqi);
  const trend = useMemo(() => genTrend(aqi), [aqi]);

  const colorBar = [
    { label: '0', color: '#00c853' },
    { label: '50', color: '#aeea00' },
    { label: '100', color: '#ffd600' },
    { label: '200', color: '#ff6d00' },
    { label: '300', color: '#dd2c00' },
    { label: '400', color: '#6a0000' },
    { label: '500', color: '#3d0000' },
  ];

  return (
    <div className="aqi-info-panel">
      {/* Header */}
      <div className="aip-header">
        <div className="aip-header-left">
          <span className="aip-icon">🌫</span>
          <span className="aip-title">Air Quality Index</span>
        </div>
        <div className="aip-mascot">🧍</div>
      </div>

      {/* Big AQI Number */}
      <div className="aip-score-row">
        <div className="aip-score" style={{ color: cat.color }}>{aqi}</div>
        <div className="aip-badge" style={{ background: cat.color + '22', border: `1.5px solid ${cat.color}`, color: cat.color }}>
          {cat.label}
        </div>
      </div>

      {/* Pollutants table */}
      <div className="aip-divider" />
      <div className="aip-pollutants">
        {POLLUTANTS.map(p => {
          const pct = Math.min((p.val / p.max) * 100, 100);
          const pCat = p.key === 'PM2.5'
            ? getAqiCategory(p.val * 2.2)
            : p.key === 'PM10'
            ? getAqiCategory(p.val * 1.5)
            : getAqiCategory(p.val * 3);
          return (
            <div className="aip-poll-row" key={p.key}>
              <div className="aip-poll-name">
                {p.key}
                <span className="aip-poll-arrow" style={{ color: pCat.color }}>↗</span>
              </div>
              <div className="aip-poll-val">
                <strong>{p.val}</strong>
                <span className="aip-poll-unit">{p.unit}</span>
              </div>
              <div className="aip-poll-bar-bg">
                <div
                  className="aip-poll-bar-fill"
                  style={{ width: `${pct}%`, background: pCat.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 24hr Trend */}
      <div className="aip-divider" />
      <div className="aip-trend-title">AQI Trend · Last 24 Hours</div>
      <div className="aip-trend-labels">
        <span>0</span>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>12h</span>
        <span>Now</span>
      </div>
      <div className="aip-sparkline-wrap">
        <Sparkline data={trend} color={cat.color} />
      </div>

      {/* AQI color bar */}
      <div className="aip-color-scale">
        {AQI_SCALE.map(s => (
          <div key={s.label} className="aip-scale-seg" style={{ background: s.color }}>
            <span className="aip-scale-lbl">{s.min}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
