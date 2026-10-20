import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { mcpHandler } from "@/lib/mcp/server";
import type { McpTrace, ToolRun } from "@/lib/mcp/trace";
import { jsonBytes, sanitize } from "@/lib/security/sanitize";

export type { McpTrace, ToolRun };

const ALLOWED = new Set([
  "search_datasets",
  "get_statistics",
  "compare_statistics",
  "get_dataset_metadata",
  "list_indicators",
  "get_geographic_comparison",
  "calculate_trend",
  "get_available_periods",
]);

export function isAllowedTool(name: string): boolean {
  return ALLOWED.has(name);
}

export async function withMcpClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: "gazette-web", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } });
  const endpoint = process.env.MCP_SERVER_URL ?? "http://gazette.local/api/mcp";
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    fetch: process.env.MCP_SERVER_URL ? undefined : (url, init) => mcpHandler(new Request(url, init)),
  });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

async function execute(client: Client, requestId: string, name: string, args: Record<string, unknown>): Promise<ToolRun> {
  const started = Date.now();
  const startedAt = new Date().toISOString();
  if (!isAllowedTool(name)) {
    const message = "That tool is not part of the Gazette statistics server.";
    return {
      ok: false,
      result: { error: { code: "UNKNOWN_TOOL", message } },
      text: message,
      trace: trace(requestId, name, args, startedAt, Date.now() - started, { error: { code: "UNKNOWN_TOOL", message } }, message),
    };
  }
  try {
    const result = await client.callTool({ name, arguments: args });
    const text = result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
    const payload = result.structuredContent ?? { text };
    return {
      ok: !result.isError,
      result: payload,
      text,
      trace: trace(requestId, name, args, startedAt, Date.now() - started, payload, result.isError ? text : undefined),
    };
  } catch (error) {
    console.error(error);
    const message = "The MCP client did not receive a tool result.";
    return {
      ok: false,
      result: { error: { code: "MCP_FAILURE", message } },
      text: message,
      trace: trace(requestId, name, args, startedAt, Date.now() - started, { error: { code: "MCP_FAILURE", message } }, message),
    };
  }
}

function trace(id: string, tool: string, args: unknown, startedAt: string, durationMs: number, response: unknown, error?: string): McpTrace {
  const safe = sanitize(response);
  return {
    id,
    tool,
    status: error ? "error" : "success",
    arguments: sanitize(args),
    startedAt,
    durationMs,
    responseBytes: jsonBytes(safe),
    response: safe,
    error,
  };
}

export async function runTool(name: string, args: Record<string, unknown>, requestId: string): Promise<ToolRun> {
  return withMcpClient((client) => execute(client, requestId, name, args));
}

export async function runTools(calls: Array<{ requestId: string; name: string; arguments: Record<string, unknown> }>): Promise<ToolRun[]> {
  return withMcpClient(async (client) => {
    const results: ToolRun[] = [];
    for (const call of calls) results.push(await execute(client, call.requestId, call.name, call.arguments));
    return results;
  });
}

export async function discoverTools(): Promise<unknown> {
  return withMcpClient(async (client) => {
    const listed = await client.listTools();
    return listed.tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  });
}
