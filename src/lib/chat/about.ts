const STATS_TOPIC = /\b(inflation|cpi|gdp|food|core|price|unemployment|labour|labor|population|trade)\b/i;
const MCP_TOPIC = /\bmcp\b|model context protocol|gazette-nbs|gazette-web|\/api\/mcp|allowlist|allowed to call/i;

export function isAboutMcp(question: string): boolean {
  const text = question.trim().toLowerCase();
  if (!text) return false;
  if (STATS_TOPIC.test(text)) return false;
  if (MCP_TOPIC.test(text)) return true;
  if (/\b(hosting|hosted)\b/.test(text)) return true;
  if (/\b(the client|the server|the host|which tools|what tools|what functions|which functions)\b/.test(text)) return true;
  const asks = /\b(how|what|explain|describe|tell me|walk me)\b/.test(text);
  const subject = /\b(app|gazette|server|client|tools?|functions?|chat)\b/.test(text);
  const action = /\b(work|works|call|calls|calling|hosted|hosting|allowed|connect|connected|architecture)\b/.test(text);
  return asks && subject && (action || /\b(explain|describe)\b/.test(text));
}

export const MCP_ARCHITECTURE = [
  "How Gazette and MCP fit together:",
  "Gazette is a Next.js app. Published NBS tables are loaded into a snapshot (data/store.json, or a Postgres snapshot when DATABASE_URL is set). A chat answer does not download a new workbook and does not invent a figure.",
  "Hosting: the MCP server is this same app, at /api/mcp. That route accepts GET, POST, and DELETE and speaks Streamable HTTP through the official MCP TypeScript SDK (mcp-handler). On Vercel, /api/mcp is the public endpoint. The server name is gazette-nbs, version 1.0.0.",
  "Server: gazette-nbs registers eight tools. Each one only reads the loaded snapshot. None of them write the database, call another website, or run ingest. A name outside this list is rejected as UNKNOWN_TOOL and is not executed.",
  "The eight tools the MCP server is allowed to run:",
  "1. search_datasets — search the loaded catalogue.",
  "2. get_statistics — published observations for one indicator, period, and geography.",
  "3. compare_statistics — overlay series that share a unit and methodology group.",
  "4. get_dataset_metadata — description, sources, coverage, and revision notes.",
  "5. list_indicators — loaded indicators, units, and frequency.",
  "6. get_geographic_comparison — one period across Nigerian states. Missing states are not zero.",
  "7. calculate_trend — change between published observations.",
  "8. get_available_periods — periods that are actually in the snapshot.",
  "Client: the browser does not call those tools itself. Server code uses an MCP client named gazette-web. By default it opens Streamable HTTP to http://gazette.local/api/mcp and the fetch stays in this process, so it hits the same handler. If MCP_SERVER_URL is a non-empty URL, gazette-web connects to that remote server instead.",
  "What calls the client: the dashboard, explorer, map, and compare pages call gazette-web with a tool name and arguments. This chat box calls POST /api/chat, and that route calls the same client. POST /api/query is the other gateway; it checks the same eight-name allowlist, then calls the client. An external MCP client can connect directly to /api/mcp. The inspector records those calls.",
  "What this chat may ask for: when a model is connected, it may request only six of the eight tools — get_statistics, calculate_trend, get_geographic_comparison, compare_statistics, list_indicators, and search_datasets. It is not offered get_dataset_metadata or get_available_periods. Unknown names and arguments that are not an object are rejected. There is a cap of three rounds and three calls per round. With no model connected, the built-in parser may choose only get_statistics, compare_statistics, get_geographic_comparison, or calculate_trend.",
  "Ingest and the monthly cron are separate HTTP routes. They are not MCP tools, and the chat cannot call them.",
].join("\n\n");
