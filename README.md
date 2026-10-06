# Dualcast: dual-persona weather monitoring and alert system

Node.js backend + web frontend. No npm packages needed (Node 18 or newer).

## Run
    npm start
Open http://localhost:3000

## Test
    npm test

## Structure
    server.js            HTTP server, REST API, serves public/
    src/rules.js         Alert rules (T > 32.0, RH >= 85.0, wind <= 15) and agro formulas
    src/ingest.js        Open-Meteo fetch, payload validation, cache, offline fallback
    src/offline.js       Seasonal weather model (Kelvin and m/s raw payload)
    src/transform.js     Unit normalisation, daily aggregation, dew point, ET0
    src/adapters.js      Consumer 1 (public) and Consumer 2 (farmer) adapters
    src/audit.js         Boundary value verification matrix
    public/index.html   Frontend (calls /api/* only)
    test/api.test.js     12 automated tests

## API
    GET /api/health
    GET /api/locations
    GET /api/geocode?q=Mandya
    GET /api/public?city=Mandya          (add &lat=&lon=&name= for any Indian place)
    GET /api/farmer?city=Mandya
    GET /api/audit
    Test bench: add &simT=32.1&simRh=84.9&simW=10 to /api/public or /api/farmer

If Open-Meteo cannot be reached, the backend falls back to the offline model and the
badge in the page shows "Offline model". With internet it shows "Live: Open-Meteo".
