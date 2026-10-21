const STATS_TOPIC = /\b(inflation|cpi|gdp|food|core|price|unemployment|labour|labor|population|trade)\b/i;
const MCP_TOPIC = /\bmcp\b|model context protocol|gazette-nbs|gazette-web|\/api\/mcp|allowlist|allowed to call/i;

const OVERVIEW =
  "Gazette is an MCP server for published Nigerian statistics. It lives at /api/mcp and its name is gazette-nbs. It can run eight tools, and each tool only reads the loaded NBS snapshot. The website uses a client named gazette-web to call those tools. This chat uses that same client.";

const API_OR_MCP =
  "This is an MCP server. The address /api/mcp is only where that server is hosted. A client connects, lists tools, and calls one of them. That conversation is MCP, carried over HTTP. The site also has ordinary routes such as /api/chat and /api/query. Those routes ask the MCP server for data. They are not a separate statistics API.";

const TOOLS =
  "The MCP server is allowed to run eight tools, and each one only reads the published snapshot. search_datasets searches the catalogue. get_statistics returns observations for one indicator. compare_statistics overlays series that share a unit. get_dataset_metadata returns the description and the sources. list_indicators lists what is loaded. get_geographic_comparison compares states for one period. calculate_trend measures the change between published points. get_available_periods lists periods that exist. Any other name is rejected.";

const CLIENT =
  "The browser does not call the tools. Server code uses an MCP client named gazette-web. That client talks to /api/mcp inside this app. If MCP_SERVER_URL is set, it uses that remote server instead. The dashboard, explorer, map, compare page, and this chat all go through that client.";

const HOST =
  "The MCP server is this Next.js app, at /api/mcp. The route accepts GET, POST, and DELETE, and the protocol is Streamable HTTP. The server name is gazette-nbs, version 1.0.0. On Vercel, that same path is the public endpoint.";

const CHAT =
  "This chat may request six tools: get_statistics, calculate_trend, get_geographic_comparison, compare_statistics, list_indicators, and search_datasets. It cannot request get_dataset_metadata or get_available_periods. It also cannot run ingest or the monthly cron. Any figure still has to come back from a tool.";

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

export function answerAbout(question: string): string {
  const text = question.toLowerCase();
  if (/\bapi\b/.test(text) && /\bmcp\b/.test(text)) return API_OR_MCP;
  const broad = /\b(how|explain|describe|fit|together|work)\b/.test(text);
  if (broad && /\bhost/.test(text) && /\bclient\b/.test(text)) return OVERVIEW;
  if (/\bchat\b/.test(text) && /\b(tool|function|allowed|call)/.test(text)) return CHAT;
  if (/\b(tool|function|allowed to call|allowed to run)\b/.test(text)) return TOOLS;
  if (/\bclient\b/.test(text)) return CLIENT;
  if (/\b(host|hosting|endpoint|vercel)\b/.test(text)) return HOST;
  if (/\bchat\b/.test(text)) return CHAT;
  return OVERVIEW;
}

export const MCP_FACTS = [OVERVIEW, API_OR_MCP, TOOLS, CLIENT, HOST, CHAT].join(" ");

export function plainReply(text: string): string {
  const spaced = text.replace(/\s*[—–]\s*/g, ". ").replace(/\.\s*\./g, ".").replace(/[ \t]{2,}/g, " ").trim();
  return spaced.replace(/([.?!]\s+)([a-z])/g, (_match, gap: string, letter: string) => `${gap}${letter.toUpperCase()}`);
}
