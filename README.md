# SkyAQI — Satellite-Based Surface AQI and HCHO Hotspot Dashboard

A satellite-driven air-quality analytics prototype for Punjab, India. This project visualizes:

- predicted surface AQI over a Punjab spatial grid
- HCHO hotspot detection linked to possible biomass burning influence
- fire activity timelines using NASA FIRMS-style points
- a simplified atmospheric/transport story through animated web maps

The repository combines a React + Vite frontend with generated CSV datasets and a Python training script used to build the prediction data files consumed by the app.

## Project Overview

This project addresses the challenge of estimating air quality where dense ground monitoring networks are absent or sparse. The system uses a demo workflow based on satellite-derived aerosol information, meteorological proxies, and grid-level pollution estimates to surface a visual AQI map and hotspot narrative for Punjab during the October–November 2023 period.

The frontend is built as an interactive dashboard, not as a deployed backend service. The actual app loads prepared CSV files from `public/data/` and renders them in Leaflet-based maps.

## Problem Statement

Punjab experiences severe seasonal air quality deterioration during crop-residue burning periods. Ground monitoring coverage is limited, and it is hard to understand where pollution is worst, when it peaks, and how smoke-driven emissions relate to HCHO anomalies.

This project attempts to provide a compact, visual, satellite-informed view of:

- surface AQI patterns across Punjab,
- likely pollution hotspots,
- HCHO anomalies associated with fire-driven emissions,
- and a time-based story from fire occurrence to atmospheric hotspot formation.

## Objectives

- Build a visual AQI estimation dashboard for Punjab.
- Combine satellite and atmospheric indicators with a simple ML-style prediction workflow.
- Show fire-to-HCHO progression over time using an animation panel.
- Provide a recruiter-friendly, explainable data-science prototype.
- Keep the project self-contained and easy to run locally.

## Key Features

- Surface AQI heatmap across Punjab
- Indian AQI scale coloring and confidence visualization
- Fire activity timeline over October–November 2023
- HCHO hotspot detection and visual bloom by date
- Animated wind field panel
- Side-by-side storytelling panels for pollution and transport context
- Data-driven frontend with static CSV inputs

## Technologies Used

| Category | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 19 | UI rendering |
| App tooling | Vite | dev server and build pipeline |
| Mapping | Leaflet + react-leaflet | map rendering and overlays |
| Visualization | custom SVG/canvas + Leaflet heat layers | AQI map, wind animation, markers |
| Data parsing | Papa Parse | CSV ingestion |
| Modeling helper | Python | training pipeline script |
| Data science | pandas, NumPy, scikit-learn, XGBoost | feature engineering, regression model |

## Project Architecture / Workflow

The repository follows a lightweight architecture:

1. Python script `training.py` prepares or simulates feature engineering and model outputs.
2. It exports CSVs containing AQI predictions, HCHO hotspot data, and fire points.
3. The frontend loads those CSV files from `public/data/`.
4. React components render interactive maps and animated visual analyses.
5. The app does not connect to a live backend or persistent database.

## Folder Structure

```text
skyaqi-isro-bah-2026/
├── public/
│   └── data/
│       ├── aqi_predictions.csv
│       ├── fires.csv
│       └── hcho_hotspots.csv
├── src/
│   ├── components/
│   │   ├── AQIInfoPanel.jsx
│   │   ├── AQIMap.jsx
│   │   ├── FireHCHOMap.jsx
│   │   ├── Methodology.jsx
│   │   └── WindPanel.jsx
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── useCSV.js
│   └── utils.js
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── training.py
├── vite.config.js
└── public/favicon.svg
```

## Installation and Setup

This project is a JavaScript frontend and requires Node.js and npm.

```bash
# clone the repository
# cd skyaqi-isro-bah-2026

npm install
```

Optional Python dependencies for the training script:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## How to Run the Project

Start the Vite development server:

```bash
npm run dev -- --host
```

Then open the local URL shown in the terminal, typically:

```text
http://localhost:5173/
```

To build the production bundle:

```bash
npm run build
```

To preview the built app:

```bash
npm run preview -- --host
```

## Dataset Information

The project loads local CSV files from `public/data/`:

- `aqi_predictions.csv` — grid-based AQI predictions
- `fires.csv` — fire event locations and dates
- `hcho_hotspots.csv` — HCHO anomaly/hotspot records per date

Important note: the repo does not include a full dataset pipeline, raw remote-data download script, or complete training archive. The frontend uses static CSVs already committed to the repo.

## Model / Algorithm Details

The project includes a training script, `training.py`, which:

- reads satellite and station-related feature CSV inputs,
- merges ground AQI data with model features,
- engineers features such as wind speed, humidity, day-of-year signals, and a physics term,
- trains an XGBoost regressor to predict PM2.5 / AQI,
- saves `aqi_predictions.csv`, `hcho_hotspots.csv`, and `fires.csv`.

This is a prototype-level predictive workflow rather than a production-ready operational model.

A few important cautions:

- the repository does not include a saved model artifact,
- no explicit training/test split report file is present,
- no deployment pipeline or inference API is implemented,
- the app is a visual dashboard fed by generated static data.

## Results and Performance

The project does not include a published validation report, benchmark output file, or saved model metrics artifact. The `training.py` script prints evaluation metrics when executed, but the repository itself does not contain a final trained model or evaluation summary file.

Therefore, no verified accuracy or performance score should be claimed from this repo alone.

## Screenshots / Demo

No screenshots or demo assets are included in the repository at the moment. If you want, add images under an `assets/` or `docs/` folder and link them below.

## Future Enhancements

- Replace static CSVs with a real data pipeline and API
- Add a backend with model inference endpoints
- Include a richer uncertainty and confidence model
- Add a satellite source download and preprocessing module
- Support filtering by district or date range
- Improve documentation and add automated tests

## Contributors

This project currently does not specify contributor names in the repository metadata. Please add names here when ready.

## License

No license file has been added to this repository yet. If you want to publish or share the project publicly, choose a license and add it to the repo.

## Notes for Review

This repository is best understood as a compelling, visual prototype for environmental data storytelling and satellite-driven AQI analysis. It is well-suited for demonstration and portfolio presentation, but it is not a complete operational forecasting application.

## Recommended Next Steps

- add a real data acquisition and preprocessing pipeline,
- add a proper dependency file for the Python training script,
- document the exact source datasets if they are external,
- choose and add a project license.

---

If you want, I can also help convert this into a more polished portfolio-style README tailored for GitHub recruiters.
