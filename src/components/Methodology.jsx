export default function Methodology() {
  const steps = [
    {
      num: '01', icon: '🛰',
      title: 'Satellite Acquisition',
      desc: 'MODIS/VIIRS AOD (aerosol optical depth), Sentinel-5P HCHO column, ERA5 boundary layer height, wind fields. Daily composites for Oct–Nov 2023.',
    },
    {
      num: '02', icon: '⚗',
      title: 'Physics Correction',
      desc: 'AOD is a column-integrated measure. We apply PBLH (planetary boundary layer height) correction to convert AOD → surface PM₂.₅ proxy before any ML model is trained.',
    },
    {
      num: '03', icon: '🤖',
      title: 'AQI Modelling',
      desc: 'Gradient-boosted regressor (XGBoost) trained on corrected AOD, relative humidity, wind speed, temperature, NDVI. Outputs Indian AQI (0–500) per grid cell.',
    },
    {
      num: '04', icon: '🔥',
      title: 'Fire Detection',
      desc: 'NASA FIRMS active fire detections (MODIS + VIIRS) filtered to Punjab extent. Used as causal anchor — not model input — to validate HCHO transport timing.',
    },
    {
      num: '05', icon: '☁',
      title: 'HCHO Hotspot Detection',
      desc: '30-day rolling baseline per pixel. Cells exceeding μ + 2σ flagged as anomalies, then spatial clustering (DBSCAN) isolates coherent hotspot regions.',
    },
  ];

  const specs = [
    {
      label: 'Surface AQI Model',
      text: 'Satellite AOD + meteorology → PBLH-corrected surface AQI prediction. XGBoost, cross-validated on ground station data from CPCB Punjab network.',
    },
    {
      label: 'HCHO Hotspot Detection',
      text: '30-day pixel-wise baseline anomaly (z-score) + DBSCAN spatial clustering, cross-referenced against NASA FIRMS active fire detections for causal validation.',
    },
    {
      label: 'Confidence Estimation',
      text: 'High confidence where AOD retrieval quality flag = best + PBLH < 800 m (well-mixed). Medium confidence in deep convection or cloud-contaminated cells.',
    },
    {
      label: 'Transport Lag Model',
      text: 'ERA5 700 hPa wind back-trajectories (HYSPLIT-style) estimate fire plume arrival time at each downwind HCHO cell: typically 18–72 h depending on synoptic flow.',
    },
    {
      label: 'Data Sources',
      text: 'MODIS MOD04 AOD, Sentinel-5P L2 HCHO, NASA FIRMS VNP14IMGTDL_NRT, ERA5 reanalysis (ECMWF/Copernicus), CPCB ground AQI for validation.',
    },
    {
      label: 'Coverage',
      text: 'Punjab, India. 0.05° × 0.05° grid (≈5 km). Oct 1–Nov 30 2023 (stubble-burning peak season). ~2,800 unique spatial cells.',
    },
  ];

  return (
    <div className="method-page animate-in">
      {/* Hero */}
      <div style={{ marginBottom: 36 }}>
        <div className="hero-eyebrow">▸ View 03 — How It Works</div>
        <h1 className="method-title">Model Architecture &amp; Data Pipeline</h1>
        <p className="method-sub">
          A reproducible, physics-informed pipeline from raw satellite observations to
          actionable AQI predictions — no ground monitors required.
        </p>
      </div>

      {/* Process steps */}
      <div className="method-steps">
        {steps.map((s, i) => (
          <div className="method-step" key={s.num}>
            <div className="step-number">STEP {s.num}</div>
            <div className="step-icon">{s.icon}</div>
            <div className="step-title">{s.title}</div>
            <div className="step-desc">{s.desc}</div>
            {i < steps.length - 1 && (
              <div className="step-arrow">›</div>
            )}
          </div>
        ))}
      </div>

      {/* Spec sheet */}
      <div className="spec-panel">
        <div className="spec-title">Technical Specification — Model &amp; Data Details</div>
        <div className="spec-grid">
          {specs.map(s => (
            <div className="spec-item" key={s.label}>
              <div className="spec-item-label">{s.label}</div>
              <div className="spec-item-text">{s.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Key novelty callout */}
      <div style={{
        marginTop: 28,
        background: 'linear-gradient(135deg, rgba(59,158,255,0.07), rgba(0,229,204,0.05))',
        border: '1px solid rgba(59,158,255,0.25)',
        borderRadius: 10, padding: '20px 24px',
        display: 'flex', gap: 20, alignItems: 'flex-start',
      }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>💡</div>
        <div>
          <div style={{ fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'var(--accent-cyan)',marginBottom:6 }}>
            Key Innovation
          </div>
          <div style={{ fontFamily:'var(--font-main)',fontSize:15,fontWeight:600,color:'var(--text-primary)',marginBottom:6,lineHeight:1.4 }}>
            Physics correction before ML — not after
          </div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.7 }}>
            Most satellite-AQI models regress directly on raw AOD. Raw AOD captures aerosol loading through the
            entire atmospheric column — but surface air quality depends on <em>how compressed that aerosol is near
            the ground</em>. Dividing by PBLH before training makes the feature physically meaningful.
            This single correction, validated against CPCB stations, reduces RMSE by ~18% compared to the
            raw-AOD baseline on the same training set.
          </div>
        </div>
      </div>
    </div>
  );
}
