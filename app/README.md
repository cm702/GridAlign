# GridAlign

GridAlign compares publicly described utility transmission projects and surfaces nearby cross-utility pairs for human review. The dashboard includes an interactive map with overview and selected-match focus, scroll-wheel zoom, named kilometer distance tiers, a scrollable results list, an early-access Gemini assistant, a compact selected-pair summary, project and schedule filters, side-by-side project details, sourced project-cost totals, printable and CSV match summaries, and suggested coordination questions.

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

## Demo behavior and data limits

The app screens 54 Dominion Energy South Carolina projects against 11 eligible Georgia Power transmission/substation projects, generating 594 cross-utility pairs. It measures the nearest supplied coordinate points with Haversine distance; 10 pairs are under the strict 40 km challenge threshold in this saved data snapshot. Distance tiers follow the challenge thresholds (<0.1, <1.6, <8, and <40 km); exactly 40 km is outside the screen. Schedule gaps are derived from supplied project date fields where they parse. The score is an app-defined ranking heuristic, not a challenge-prescribed formula or probability.

Mapped project coordinates are screening data; point-specific citations and verified route geometry are not attached. Map endpoint joins and cross-utility links are straight-line illustrations, not surveyed routes or evidence of a shared corridor. The cost panel and CSV show disclosed project-budget estimates and missing-cost counts only. The source documents do not provide enough shareable-work quantities, rates, or avoided costs to calculate defensible coordination savings. Validate project locations, schedules, routes, and coordination assumptions with current public filings and both utilities.
