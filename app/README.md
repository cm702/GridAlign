# GridAlign

GridAlign compares publicly described utility transmission projects and surfaces nearby cross-utility pairs for human review. The dashboard includes an interactive map with overview and selected-pair focus, scroll-wheel zoom, a documented project-cost breakdown, a compact selected-pair summary, map/list selection, an expanded map view, selectable layers, project context and related pairs, project, schedule, and distance-tier filters, sortable screening scores, side-by-side project details, printable and CSV summaries, suggested coordination questions, and a Gemini assistant that receives the selected pair's public project data, score explanation, and coordination prompts as context.

## Run locally

1. Install Node.js 20.19 or newer (or 22.12 or newer).
2. Install packages with `npm install`.
3. Copy `.env.example` to `.env`, replace `PASTE_YOUR_GEMINI_API_KEY_HERE` in `gemini_api_key` with a key from Google AI Studio, then set `gemini_model` and `gemini_fallback_model` to the model IDs you want.
4. Start the Vite development server with `npm run dev`.

The development server handles `/api/chat` on the same origin as the UI. Without a configured key, the dashboard still works and the assistant reports that it is not configured.

## Build and run production

```sh
npm run lint
npm test
npm run build
npm start
```

The Node server serves the production files from `dist` and proxies chat requests to Gemini. It listens on `PORT` if set, or port `4178` by default. The app reads the lowercase `gemini_api_key`, `gemini_model`, and `gemini_fallback_model` names from `app/.env` (or server-side environment variables on the host). The primary model is tried first, then the fallback model when the primary cannot answer. Do not add the key to client code or a `VITE_` variable. `.env` files are ignored by Git.

## Hosting on a GoDaddy domain

A domain registration alone does not run the app. Point the domain's DNS to a hosting plan that supports a persistent Node.js application, configure the host to build with `npm run build` and start with `npm start`, and set the three Gemini settings in the hosting provider's server-side environment configuration. If the selected GoDaddy hosting plan only serves static files, deploy the `dist` frontend and host `server.js` on a Node-capable service; route `/api/chat` to that service over HTTPS.

## Assistant and data limits

The browser sends the chat message history and the currently selected public project-pair details to `/api/chat`. The server calls the configured Gemini model using `gemini_api_key`; the key never needs to be sent to or embedded in the browser. Do not enter confidential, personal, or CEII information. Gemini suggestions are generated guidance, not engineering review or utility commitments.

## Project data and matching

The dashboard uses the normalized catalogs in `../new_data/processed/dominion_energy_south_carolina.json` and `../new_data/processed/georgia_power.json`. The raw source-page archive is retained under `../new_data/raw-pages/` for provenance and verification; these processed catalogs are a saved snapshot, not a live feed. Dominion contributes 54 coordinate-bearing projects. Georgia Power contributes only the 11 coordinate-bearing records whose project type is transmission or substation; generation projects and records without coordinates are excluded from this transmission-screening map.

Candidate pairs are calculated in the app by comparing every listed point in each cross-utility project pair with the Haversine formula. The distance-tier selector offers all 594 possible project pairs or cumulative challenge thresholds (<0.1, <1.6, <8, and <40 km), plus an outside-screen view (40 km or farther). It does not use the largest observed distance as the challenge limit. The challenge flags only pairs under 40 km; ten pairs in this snapshot qualify. The overview map draws only the under-40-km links to avoid clutter; selecting a farther pair focuses its link on the map.

Distance-based coordination tiers follow the challenge: under 0.1 km prompts verification of possible crossings and outage timing; under 1.6 km suggests checking right-of-way, access roads, and permits; under 8 km suggests site logistics, laydown yards, and deliveries; under 40 km suggests crews, cranes, contractors, and equipment. These benefits are cumulative by distance but only hypotheses to verify; near-coincident points do not prove that routes touch or cross. The score ranks qualifying pairs using 70% proximity to the 40 km limit and 30% schedule alignment when both schedule windows exist; with missing schedule data it uses proximity alone. Pairs at or beyond 40 km are not scored as geographic overlaps. The supplied `matches.json` is not used directly because its 22 records include generation projects that are outside this map's scope. Pair distances are the minimum separation between supplied points, not a verified route or corridor distance. Approximate project joins and pair links are visual aids only; coordinate-level citations, surveyed routes, and route geometry are not included.

Schedule strings are treated as exact dates, quarter windows, or year windows only when they parse as valid source values. Invalid or absent dates remain unavailable and are not silently repaired. Statuses and dates may be stale. Project costs are shown only where the supplied catalog reports them; absent costs remain unknown. The cost breakdown adds only the selected projects' disclosed estimates and reports missing amounts separately. It does not present a savings estimate: the supplied planning documents do not provide resource quantities, crew or equipment rates, mobilization costs, or the portion of project budgets that coordination could avoid. Any savings calculation without those inputs would be fabricated. Verify project facts, schedules, costs, and candidate locations against current public utility documents. Shared crews, right-of-way, outages, equipment, and procurement are suggestions to investigate—not confirmed resources or outcomes.
