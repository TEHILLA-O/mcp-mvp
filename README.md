# Gazette

Gazette is a Nigeria statistics workspace. It loads published National Bureau of Statistics tables, serves them from a remote MCP endpoint, and draws those tool results as charts.

The figures are not estimated. The September 2026 CPI workbook (base 2024 = 100) and the Q2 2026 GDP workbook (2019 constant prices), plus annual real growth for 2020–2023 from the rebasing tables, are the library.

## What is loaded

| Series | Frequency | Source file |
| --- | --- | --- |
| CPI all-items index, year-on change, month-on change | Monthly | September 2026 CPI tables |
| Food index and food year-on change | Monthly | same |
| Core year-on change (all items less farm produce and energy) | Monthly | same |
| State all-items index | The three months printed in Table 5 | same |
| State all-items year-on change | September 2026 only | same |
| Real GDP growth, total and three sectors | Quarterly, 2024 Q1–2026 Q2 | Q2 2026 GDP tables |
| Sector shares of real GDP | Quarterly | same |
| Annual real GDP growth | 2020–2025 | Rebasing tables for 2020–2023, Q2 2026 workbook for 2024–2025 |

Labour-force microdata on the NBS catalogue is access-controlled. Unemployment is not in the library and is not filled in. The November 2009 CPI and the 2010-price GDP file were inspected and left out so they are not drawn as if they were the same series.

A January 2025 headline rate of 24.48 percent appeared in the February 2025 press release during the rebase. The September 2026 table prints about 27.61 percent for that month, which matches the linked index in that workbook. Gazette stores the later table only.

## Requirements

Node.js 20 or newer.

Postgres is optional. Without `DATABASE_URL`, the app reads `data/store.json`.

## Install

```bash
npm install
```

## Configure

```bash
copy .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres/Supabase connection. When set, and after the migration, the app reads `gazette_snapshot`. |
| `DATABASE_SSL` | `require` (default) or `disable` for a local database. |
| `INGEST_TOKEN` | Bearer token for `POST /api/admin/ingest`. |
| `CRON_SECRET` | Bearer token for the monthly Vercel cron, which does not download workbooks inside the request. |
| `MCP_SERVER_URL` | Optional. When empty, the site's server-side client uses the official SDK against the in-process handler. Set this to `http://127.0.0.1:3000/api/mcp` to force a network call. |
| `DEEPSEEK_API_KEY` | Optional DeepSeek key for the chat panel. The key stays on the server. Empty keeps the built-in parser. |
| `DEEPSEEK_BASE_URL` | DeepSeek API origin. Default `https://api.deepseek.com`. |
| `DEEPSEEK_MODEL` | DeepSeek model. Default `deepseek-chat`. |

## Database

```bash
psql "$DATABASE_URL" -f db/migrations/001_schema.sql
```

The migration creates the normalised tables and `gazette_snapshot`, which is the document the app reads. Ingestion upserts that document when `DATABASE_URL` is present. If the database is empty or unreachable, the bundled snapshot is used.

## Import the tables

The verified workbooks already sit in `data/raw/`. Rebuild the snapshot:

```bash
npm run ingest
```

To download the same catalogue files again (CPI September 2026 zip, GDP Q2 2026 zip, rebasing workbook) and rebuild:

```bash
npm run ingest:fetch
```

Those URLs are the public NBS microdata catalogue links checked for this project. The command is idempotent: a failed parse does not replace `data/store.json`.

## Develop

```bash
npm run dev
```

Open http://127.0.0.1:3000.

## MCP endpoint

`http://127.0.0.1:3000/api/mcp`

Tool reference: [docs/mcp-tools.md](docs/mcp-tools.md).

```bash
npm run mcp:smoke
```

An external Streamable HTTP client can use the route directly. A stdio-only client can use `npx mcp-remote http://127.0.0.1:3000/api/mcp`.

## Tests

```bash
npm test
```

Playwright (starts the dev server):

```bash
npx playwright install chromium
npm run test:e2e
```

The integration tests read the real snapshot, including the September 2026 headline year-on change and Q2 2026 real GDP growth. Synthetic rows are confined to the calculation tests.

## Production build

```bash
npm run build
npm start
```

## Deploy on Vercel

1. Import the repository.
2. Add `CRON_SECRET` if you want the monthly cron route to answer. It does not refetch NBS files inside the serverless request.
3. Add `DATABASE_URL` and `INGEST_TOKEN` only when you want ingestion to publish into Postgres.
4. Deploy. The snapshot in `data/store.json` is enough for the site and `/api/mcp` to serve the verified tables.

Do not claim a deployment succeeded until `vercel deploy` finishes. This repository does not deploy itself.

## Chart rules

`src/lib/visualization/recommend.ts` chooses a chart from the shape of the result:

- One observation is a figure, not a line.
- One period across states is a ranked bar. The map is a separate view. Missing states are hatched, not zero.
- Shares of one period may be a donut. Shares across quarters are a stacked bar.
- One time series is an area chart. Several compatible series are lines. Two series may be switched to a scatter of period-aligned pairs.
- A chart type outside that list is not offered. CPI rates are not overlaid on GDP growth.

## Boundaries

State shapes are geoBoundaries Nigeria ADM1, simplified, CC BY 4.0, from GRID3. They are not an NBS product.

## Limits

- No unemployment, trade, capital importation or population series.
- State inflation is only where Table 5 prints it.
- Annual and quarterly GDP are separate series.
- The natural-language box is a deterministic matcher. It does not call a language model, so it stays usable without an API key.
- Postgres relational tables are migrated but runtime reads go through `gazette_snapshot`, so a request does not reassemble the warehouse on every chart.
