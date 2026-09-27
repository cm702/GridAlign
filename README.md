# GridAlign

GridAlign is a demo-ready web app for screening public utility transmission project catalogs for potential cross-utility coordination. The React/Vite interface provides a map, kilometer-based proximity tiers, schedule and text filters, project-cost citations, CSV/print summaries, and a server-side Gemini assistant.

## Run the demo

```powershell
cd app
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. To use Gemini, copy `app/.env.example` to `app/.env` and set the lowercase `gemini_api_key`, `gemini_model`, and `gemini_fallback_model` values. The key stays on the server. The map, filters, project details, and exports work without Gemini credentials.

## Screening behavior

The current saved catalogs contain 54 Dominion Energy South Carolina projects and 11 eligible Georgia Power transmission/substation projects, creating 594 cross-utility pairs. Distances use the closest supplied coordinate-point pair, calculated with Haversine; ten pairs are strictly under 40 km in this snapshot. The challenge tiers are under 0.1 km, 1.6 km, 8 km, and 40 km. The score is an app-defined ranking heuristic, not a probability or challenge-mandated formula.

Project coordinates and straight-line map connections are screening aids, not verified route geometry. Displayed project costs are reported capital budgets, not a basis for calculating coordination savings; the supplied sources lack shareable-work quantities, rates, and avoided-cost amounts. See [app/README.md](./app/README.md) for production deployment and data caveats.
