# MCP - MVP tools

Endpoint: `/api/mcp`

Transport: Streamable HTTP, served by `mcp-handler` on the official MCP TypeScript SDK. The handler speaks the current protocol and falls back to stateless Streamable HTTP for 2025 clients.

The web application calls this server with `@modelcontextprotocol/client`. It does not invent a parallel REST shape for the same statistics. `POST /api/query` is only an application gateway: it allowlists the tools below and records the client round-trip.

## Tools

### search_datasets

Search the loaded NBS catalogue.

- `query` optional string
- `category` optional string (`prices`, `national_accounts`)
- `geography` optional string
- `limit` optional integer, 1–50

Returns dataset id, name, description, category, geographic coverage, period range, indicator ids, source URL, publication title and limitations.

### get_statistics

Published observations for one indicator.

- `indicator` required id, for example `cpi.all_items.yoy`
- `start_period`, `end_period` optional `YYYY`, `YYYY-MM` or `YYYY-Q1`
- `geography` optional, default `nga` for national series. State series need a code such as `NG-LA`
- `frequency` optional, and must match the series. MCP - MVP does not resample.

Returns indicator metadata, unit, methodology, warnings, and date-ordered observations with source URL, publication title, retrieval time and revision.

### compare_statistics

- `indicators` one to six ids
- `start_period`, `end_period` optional
- `geography` a string or a list, required in spirit for `geographies`
- `comparison_type` `overlay`, `difference` or `geographies`

`overlay` and `difference` require the same unit, frequency and methodology group. CPI year-on rates can be compared with each other. They cannot be overlaid on real GDP growth or on an index. `difference` for a percent rate is in percentage points. Periods missing on either side stay null.

### get_dataset_metadata

- `dataset_id` such as `nbs-cpi`, `nbs-gdp-q`, `nbs-gdp-a`

Returns description, indicators, revisions, methodology and limitations.

### list_indicators

- `category` optional
- `search` optional

### get_geographic_comparison

- `indicator` a state-level id: `cpi.all_items.yoy.state` or `cpi.all_items.index.state`
- `period` a published period
- `geography_level` must be `state`

National series are rejected rather than allocated to states. States without a value are listed in `missing`.

### calculate_trend

- `indicator`
- `start_period`, `end_period` optional
- `geography` optional

Returns absolute change, percentage-point change when the series is already a rate, percent change when the start value is not zero, period-over-period movement, min, max, average, and a sentence that only restates those figures.

### get_available_periods

- `indicator`
- `geography` optional

Returns the native frequency and the periods that exist, so the interface does not offer empty months.

## External client

Cursor, or another Streamable HTTP client:

```json
{
  "mcpServers": {
    "mcp-mvp": {
      "url": "https://YOUR_DEPLOYMENT/api/mcp"
    }
  }
}
```

For a stdio-only client:

```json
{
  "mcpServers": {
    "mcp-mvp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://127.0.0.1:3000/api/mcp"]
    }
  }
}
```

Local check without a desktop client:

```bash
npm run mcp:smoke
```

## Errors

Tool failures return `isError: true` and `structuredContent.error` with a code such as `UNKNOWN_INDICATOR`, `INVALID_PERIOD`, `FREQUENCY_MISMATCH`, `INCOMPATIBLE_SERIES`, `NO_GEOGRAPHIC_SERIES` or `INCOMPATIBLE_REVISION`. The message is safe to show. Internal exceptions are logged on the server and replaced with a generic message.
