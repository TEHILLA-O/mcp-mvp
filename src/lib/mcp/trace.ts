export interface McpTrace {
  id: string;
  tool: string;
  status: "success" | "error";
  arguments: unknown;
  startedAt: string;
  durationMs: number;
  responseBytes: number;
  response: unknown;
  error?: string;
}

export interface ToolRun {
  ok: boolean;
  trace: McpTrace;
  result: unknown;
  text: string;
}

export interface LiveTrace {
  id: string;
  tool: string;
  status: "executing" | "success" | "error";
  arguments: unknown;
  startedAt: string;
  durationMs: number | null;
  responseBytes: number | null;
  response: unknown;
  error?: string;
}
