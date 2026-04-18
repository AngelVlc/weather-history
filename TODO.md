# weather-history - UI Feature

## Plan: Weather Dashboard

### Backend (Lambda + Function URL + CloudFront)

- **Architecture:**
  ```
  Lambda Function URL → CloudFront → User (API)
  ```

- **GET /stations** → List of available stations
  - Format: `{ id: "c20m236e01", name: "Alzira", territory: "Ribera Baja" }`
  - Implementation: DynamoDB Scan (simple, sufficient for ~3 stations)
  - Cache-Control: `public, max-age=21600` (6 hours)
  - Invalidation: After new data is saved by extractor Lambda

- **GET /stations/{stationId}?days=7** → Data for charts
  - Returns last N days of data for a station
  - Format: `{ stationId, stationName, territoryName, data: [{ date, tempMax, tempMin, tempAvg, precipitation }] }`
  - Implementation: DynamoDB Scan with filter by date
  - Cache-Control: `public, max-age=7200` (2 hours)
  - Invalidation: After new data is saved by extractor Lambda

**Note on GSI (Global Secondary Index):**
- Existing GSI: `date-index` (hash key: date, range key: pk) - for date-based queries
- Not used for UI endpoints (Scan is sufficient for small datasets)
- Future: Add `station-date-index` GSI when supporting 1+ year data queries

### CloudFront Invalidation

- **Automatic:** Lambda extractor triggers invalidation after saving new data
- **Manual:** Script `scripts/invalidate-cache.ts` for use with populate script

### Frontend (React + Vite)

**Tech Stack:**
- Framework: React 18 + Vite
- Language: TypeScript
- Router: react-router-dom
- Styling: Tailwind CSS
- Charts: Chart.js (react-chartjs-2)
- HTTP Client: fetch (built-in)

**Project Structure:**
```
packages/weather-ui/
├── public/
│   └── index.html
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Router + layout
│   ├── pages/
│   │   ├── Landing.tsx       # Station list
│   │   └── Station.tsx       # Station details + charts
│   ├── components/
│   │   ├── StationCard.tsx   # Card for station in list
│   │   ├── TemperatureChart.tsx   # Line chart (max/min/avg)
│   │   └── PrecipitationChart.tsx # Bar chart (precipitation)
│   ├── api/
│   │   └── weather.ts        # Fetch wrapper for API calls
│   └── index.css             # Tailwind imports
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

**Landing Page:**
- Title: "Estaciones meteorológicas"
- Grid of StationCards
- Format per card: "Alzira (Ribera Baja)"
- Click → navigate to /station/:stationId

**Station Details Page:**
- Title: stationName + territoryName
- Chart 1 (line): tempMax, tempMin, tempAvg over last 7 days
- Chart 2 (bar): precipitation over last 7 days
- Back button to return to Landing

### Tech Stack

- Frontend: React 18 + Vite + TypeScript
- Routing: react-router-dom
- Styling: Tailwind CSS
- Charts: Chart.js (react-chartjs-2)
- HTTP: fetch API (built-in)
- Deployment: S3 + CloudFront
- Backend: Lambda Function URL + CloudFront

### Cost Estimate

- S3: ~$0.50/month
- CloudFront (Always Free): $0
- Lambda Function URL: $0-2/month
- DynamoDB GSI (existing date-index): ~$1/month
- Total: ~$2-4/month

## Phase 1: Backend
- [x] Create new package `packages/weather-api`
- [x] Lambda `weather-api` to query DynamoDB
- [x] Endpoint GET /stations (returns station list)
- [x] Endpoint GET /stations/{stationId}?days=7 (returns chart data)
- [x] Add Cache-Control headers to responses
- [ ] Terraform: create Lambda + Function URL
- [ ] Terraform: create CloudFront distribution for API
- [ ] Add cloudfront:CreateInvalidation permission to Lambda role
- [x] Tests for Lambda
- [x] SAM template for local invoke (sam local invoke)
- [ ] Add to docker-compose for local development

## Phase 2: CloudFront Invalidation
- [ ] Integrate cache invalidation in Lambda extractor (after saving data)
- [ ] Create script `scripts/invalidate-cache.ts` for manual invalidation

## Phase 3: Frontend
- [x] Create package `packages/weather-ui`
- [x] Initialize Vite + React + TypeScript
- [x] Configure Tailwind CSS
- [x] Setup react-router-dom
- [x] Implement Landing page (station list)
- [x] Implement Station page (charts)
- [ ] Integrate with Lambda API via CloudFront (needs deployment)
- [x] Add global styles and layout
- [ ] Tests

## Phase 4: Deployment
- [x] Terraform: S3 bucket for static hosting
- [x] Terraform: CloudFront distribution + ACM certificate
- [x] CircleCI: add build-frontend job
- [x] CircleCI: add deploy-frontend job