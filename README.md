# Spotter ELD Trip Planner

Full-stack FMCSA HOS-compliant trip planning app. Built with Django (backend) and React (frontend).

## Features

- **Trip Planning** — Input current location, pickup, dropoff, and current cycle hours
- **Route Map** — Interactive Leaflet map showing both route segments with OpenStreetMap tiles
- **HOS Engine** — Full FMCSA 70hr/8-day rule simulation:
  - 11-hour driving limit per shift
  - 14-hour driving window
  - 30-minute break after 8 cumulative driving hours
  - 10-hour mandatory off-duty between shifts
  - Fuel stops every 1,000 miles
  - 1-hour stop at pickup and dropoff
- **ELD Log Sheets** — Authentic paper log grid, drawn on HTML Canvas, one per calendar day
  - Downloadable as PNG
  - All 4 duty statuses plotted (Off Duty, Sleeper Berth, Driving, On Duty Not Driving)
  - Remarks section with location changes
  - Hours totals column

## Stack

| Layer | Tech |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| Frontend | React 18 + Leaflet |
| Geocoding | Nominatim (OpenStreetMap) |
| Routing | OSRM public API |
| Map tiles | OpenStreetMap |
| Hosting (BE) | Railway / Render |
| Hosting (FE) | Vercel |

## Local Development

### Backend

```bash
cd backend
python3 -m venv venv || python -m venv venv (Windows)
source venv/bin/activate || venv\Scripts\activate (Windows)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API available at `http://localhost:8000/api/`

### Frontend

```bash
cd frontend
npm install
npm start
```

App available at `http://localhost:3000`

> **Note:** The frontend proxies `/api/*` to `localhost:8000` in development.

## API

### `POST /api/trip/`

```json
{
  "current_location": "Dallas, TX",
  "pickup_location": "Oklahoma City, OK",
  "dropoff_location": "Denver, CO",
  "current_cycle_used": 20
}
```

Returns route info, HOS-compliant schedule events, and daily ELD log data.

## Deployment

### Backend (Railway)

1. Connect GitHub repo to Railway
2. Set root directory to `backend/`
3. Railway auto-detects Python + `requirements.txt`
4. Set env vars: `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=your-domain.railway.app`

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Set env var: `REACT_APP_API_URL=https://your-backend.railway.app/api`

## HOS Rules Applied (Property Carrier, 70hr/8-day)

| Rule | Value |
|---|---|
| Max driving per shift | 11 hours |
| Driving window | 14 hours from first duty |
| Off-duty required between shifts | 10 consecutive hours |
| Break requirement | 30 min after 8 cumulative driving hours |
| Weekly cycle | 70 hours in any 8 consecutive days |
| Fuel interval | Every 1,000 miles |
| Pickup/dropoff time | 1 hour each |
| Average speed | 55 mph |

## Assessment Assumptions

- Property-carrying driver only
- 70hr/8-day rule (no 60hr/7-day option)
- No adverse driving conditions exception
- No short-haul exceptions
- Driver starts each trip with 10 hours off already served
