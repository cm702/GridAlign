# GridAlign

GridAlign compares publicly described utility transmission projects and surfaces nearby cross-utility pairs for human review. The dashboard includes an interactive map with overview and selected-match focus, scroll-wheel zoom, a compact selected-pair summary with distance/date/rank and a shortcut to full details, map/list selection, an expanded map view, selectable layers, project context and related matches, project and schedule search filters, sortable match rankings, side-by-side project details, printable and CSV match summaries, suggested coordination questions, and a Gemini assistant that receives the selected pair's public project data, screening score, and coordination prompts as context.

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

Distances and date gaps come from the supplied challenge workbook. Mapped project and named-location coordinates are screening data; project-specific coordinate citations and verification records are not attached. Mapped endpoint joins and cross-utility links are visual straight-line approximations, not surveyed or source-verified route geometry. Map detail cards, CSV exports, and printable match briefs preserve these caveats; route GeoJSON is intentionally not exported because verified route geometry is unavailable. The location guide recommends confirming candidate locations against public utility documents before treating them as verified. Shared crews, right-of-way, outages, equipment, procurement, costs, and savings are suggestions to investigate—not confirmed resources or outcomes.
