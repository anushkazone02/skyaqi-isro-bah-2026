import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import xgboost as xgb

print("=" * 55)
print("SkyAQI Prototype — Training")
print("=" * 55)

# =============================================================
# STEP 1 — LOAD DATA
# =============================================================
print("\n[1] Loading data...")

# Define file paths using DATA_DIR
pm25_file = f"{DATA_DIR}/cpcb_punjab_pm25.csv"
fires_file = f"{DATA_DIR}/Punjab_FIRMS_fires.csv"
grid_file = f"{DATA_DIR}/Punjab_GRID_features_annual.csv"
hcho_file = f"{DATA_DIR}/Punjab_HCHO_daily_grid.csv"
sat_file = f"{DATA_DIR}/Punjab_STATION_daily_features.csv" # Inferring based on original script

# Station-level daily satellite/met features (from GEE)
sat = pd.read_csv(sat_file)
# CPCB ground truth PM2.5 
cpcb = pd.read_csv(pm25_file)

print(f"    Satellite rows: {len(sat)}")
print(f"    CPCB rows:      {len(cpcb)}")

# =============================================================
# STEP 2 — CLEAN + MERGE INTO FEATURE TABLE
# =============================================================
print("\n[2] Building feature table...")

# Standardize date formats
sat['date'] = pd.to_datetime(sat['date']).dt.strftime('%Y-%m-%d')
cpcb['date'] = pd.to_datetime(cpcb['date']).dt.strftime('%Y-%m-%d')

# Merge satellite features with CPCB PM2.5 on station + date
df = pd.merge(sat, cpcb, on=['station', 'date'], how='inner')
print(f"    Merged rows: {len(df)}")

if len(df) < 50:
    print("    WARNING: very few matched rows. Check station names match")
    print("    exactly between the two files (e.g. 'MandiGobindgarh').")


rename_map = {
    'AOD': 'aod',
    'NO2': 'no2',
    'CO': 'co',
    'temperature_2m': 'temp',
    'dewpoint_temperature_2m': 'dewpoint',
    'u_component_of_wind_10m': 'u_wind',
    'v_component_of_wind_10m': 'v_wind',
    'surface_pressure': 'pressure',
}
df = df.rename(columns=rename_map)

# Drop rows with missing critical values
df = df.dropna(subset=['aod', 'pm25'])

# --- FEATURE ENGINEERING ---
# Wind speed from u/v components
df['wind_speed'] = np.sqrt(df['u_wind']**2 + df['v_wind']**2)

# Relative humidity proxy from temp and dewpoint (simplified)
df['humidity'] = 100 - 5 * (df['temp'] - df['dewpoint'])
df['humidity'] = df['humidity'].clip(0, 100)

# Day-of-year seasonal features
df['doy'] = pd.to_datetime(df['date']).dt.dayofyear
df['doy_sin'] = np.sin(2 * np.pi * df['doy'] / 365)
df['doy_cos'] = np.cos(2 * np.pi * df['doy'] / 365)

# --- PHYSICS TERM ---
# ERA5-Land doesn't give PBLH directly, so we use a proxy:
# a stability index from pressure + temperature. If you have real PBLH,
# replace this line. For prototype, AOD/temp ratio approximates the
# column-to-surface relationship (higher temp = deeper mixing = lower surface conc.)
df['physics_term'] = df['aod'] / (df['temp'] - 250)  # temp in Kelvin, offset avoids div by small number
df['physics_term'] = df['physics_term'].replace([np.inf, -np.inf], np.nan).fillna(df['aod'])

# Final feature list
features = ['aod', 'no2', 'co', 'temp', 'humidity', 'wind_speed',
            'pressure', 'doy_sin', 'doy_cos', 'physics_term']
features = [f for f in features if f in df.columns]  # keep only existing
print(f"    Features used: {features}")

# Fill any remaining NaNs in features with column median
for f in features:
    df[f] = df[f].fillna(df[f].median())

X = df[features]
y = df['pm25']

# =============================================================
# STEP 3 — TRAIN XGBOOST
# =============================================================
print("\n[3] Training XGBoost...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)

model = xgb.XGBRegressor(
    n_estimators=300,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)
model.fit(X_train, y_train)

# =============================================================
# STEP 4 — VALIDATE (ISRO's exact metrics: RMSE, R, MAE)
# =============================================================
print("\n[4] Validation metrics:")
pred = model.predict(X_test)

rmse = np.sqrt(mean_squared_error(y_test, pred))
mae = mean_absolute_error(y_test, pred)
r2 = r2_score(y_test, pred)
r = np.sqrt(r2) if r2 > 0 else 0

print(f"    R  (correlation):  {r:.3f}")
print(f"    R2:                {r2:.3f}")
print(f"    RMSE:              {rmse:.2f} ug/m3")
print(f"    MAE:               {mae:.2f} ug/m3")
print("    ^^^ These numbers go on your validation slide.")

# Feature importance (nice to show judges)
importance = pd.DataFrame({
    'feature': features,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)
print("\n    Top features:")
print(importance.head(5).to_string(index=False))

# =============================================================
# STEP 5 — PREDICT ACROSS PUNJAB GRID -> aqi_predictions.csv
# =============================================================
print("\n[5] Predicting across Punjab grid...")

grid = pd.read_csv(grid_file)
grid = grid.rename(columns=rename_map)

# Recreate the same engineered features for the grid
grid['wind_speed'] = np.sqrt(grid['u_wind']**2 + grid['v_wind']**2)
grid['humidity'] = (100 - 5 * (grid['temp'] - grid['dewpoint'])).clip(0, 100)
# grid is annual mean -> use mid-year day for seasonal features
grid['doy_sin'] = np.sin(2 * np.pi * 180 / 365)
grid['doy_cos'] = np.cos(2 * np.pi * 180 / 365)
grid['physics_term'] = (grid['aod'] / (grid['temp'] - 250)).replace(
    [np.inf, -np.inf], np.nan).fillna(grid['aod'])

for f in features:
    if f in grid.columns:
        grid[f] = grid[f].fillna(grid[f].median())

grid['predicted_pm25'] = model.predict(grid[features])

# Convert PM2.5 to AQI (simplified Indian CPCB sub-index for PM2.5)
def pm25_to_aqi(pm):
    # Indian AQI breakpoints for PM2.5 (24-hr)
    breakpoints = [
        (0, 30, 0, 50), (30, 60, 51, 100), (60, 90, 101, 200),
        (90, 120, 201, 300), (120, 250, 301, 400), (250, 500, 401, 500)
    ]
    for lo, hi, alo, ahi in breakpoints:
        if lo <= pm <= hi:
            return round((ahi - alo) / (hi - lo) * (pm - lo) + alo)
    return 500 if pm > 500 else 0

grid['predicted_aqi'] = grid['predicted_pm25'].apply(pm25_to_aqi)

# Confidence proxy: prototype uses a simple heuristic — cells far from
# training conditions get lower confidence. (In production: Monte Carlo dropout.)
# Here we mark high AOD / extreme values as slightly lower confidence.
grid['confidence'] = 'high'
grid.loc[grid['aod'] > grid['aod'].quantile(0.9), 'confidence'] = 'medium'

# Save the file Aniket needs
out = grid[['lat', 'lon', 'predicted_aqi', 'confidence']].copy()
out.to_csv("aqi_predictions.csv", index=False)
print(f"    Saved aqi_predictions.csv ({len(out)} grid cells)")

# =============================================================
# STEP 6 — HCHO ANOMALIES + HOTSPOTS -> hcho_hotspots.csv
# =============================================================
print("\n[6] Computing HCHO hotspots...")

hcho = pd.read_csv(hcho_file)
hcho['date'] = pd.to_datetime(hcho['date']).dt.strftime('%Y-%m-%d')
hcho = hcho.dropna(subset=['HCHO'])

# Baseline = mean HCHO per grid cell across the whole Oct-Nov period
baseline = hcho.groupby(['lat', 'lon'])['HCHO'].mean().reset_index()
baseline = baseline.rename(columns={'HCHO': 'baseline'})
hcho = pd.merge(hcho, baseline, on=['lat', 'lon'])

# Anomaly = today's HCHO - baseline
hcho['hcho_anomaly'] = hcho['HCHO'] - hcho['baseline']

# Hotspot = anomaly more than 2 std above mean
threshold = hcho['hcho_anomaly'].mean() + 2 * hcho['hcho_anomaly'].std()
hcho['is_hotspot'] = (hcho['hcho_anomaly'] > threshold).astype(int)

# Save file Aniket needs (keep date so the slider works)
hcho_out = hcho[['lat', 'lon', 'date', 'hcho_anomaly', 'is_hotspot']].copy()
hcho_out.to_csv("hcho_hotspots.csv", index=False)
n_hotspots = hcho_out['is_hotspot'].sum()
print(f"    Saved hcho_hotspots.csv ({n_hotspots} hotspot cell-days flagged)")

# =============================================================
# STEP 7 — CLEAN FIRES -> fires.csv
# =============================================================
print("\n[7] Cleaning fire data...")

try:
    fires = pd.read_csv(fires_file)
    fires['date'] = pd.to_datetime(fires['date']).dt.strftime('%Y-%m-%d')
    # GEE reduceToVectors gives geometry; extract lat/lon if present
    if 'lat' not in fires.columns:
        # try to parse from .geo column
        import json
        def get_coords(g):
            try:
                coords = json.loads(g)['coordinates']
                return pd.Series({'lon': coords[0], 'lat': coords[1]})
            except Exception:
                return pd.Series({'lon': np.nan, 'lat': np.nan})
        coords = fires['.geo'].apply(get_coords)
        fires = pd.concat([fires, coords], axis=1)
    fires_out = fires[['lat', 'lon', 'date']].dropna()
    fires_out.to_csv("fires.csv", index=False)
    print(f"    Saved fires.csv ({len(fires_out)} fire points)")
except Exception as e:
    print(f"    Could not process fires ({e}). Aniket can skip fire layer.")

print("\n" + "=" * 55)
print("DONE. Hand these 3 files to Aniket:")
print("    aqi_predictions.csv")
print("    hcho_hotspots.csv")
print("    fires.csv")
print("=" * 55)
