import "server-only";

export interface DeepseekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export function deepseekConfig(): DeepseekConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() ?? "";
  const baseUrl = (process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  return { apiKey, baseUrl, model, enabled: apiKey.length > 0 };
}

export async function deepseekComplete(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatMessage> {
  const config = deepseekConfig();
  if (!config.enabled) throw new Error("DeepSeek is not configured.");
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`DeepSeek returned HTTP ${response.status}.`);
  }
  const body = (await response.json()) as { choices?: Array<{ message?: ChatMessage }> };
  const message = body.choices?.[0]?.message;
  if (!message) throw new Error("DeepSeek returned no message.");
  return message;
}
