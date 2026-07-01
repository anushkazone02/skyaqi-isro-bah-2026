import { useState } from 'react';
import AQIMap from './components/AQIMap';
import FireHCHOMap from './components/FireHCHOMap';

const TABS = [
  { id: 'fire', label: '🔥 Fire → HCHO Animation' },
  { id: 'aqi',  label: '🗺 Surface AQI Map' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('fire');

  return (
    <div className="page">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-logo-dot" />
          SkyAQI
        </div>
        <div className="nav-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={`nav-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', letterSpacing:1 }}>
          Punjab, India · Oct–Nov 2023
        </div>
      </nav>

      {/* Views */}
      <div className="animate-in" key={activeTab}>
        {activeTab === 'aqi'  && <AQIMap />}
        {activeTab === 'fire' && <FireHCHOMap />}
      </div>
    </div>
  );
}
