import { discoverTools, isAllowedTool, runTool } from "@/lib/mcp/client";
import { getStore } from "@/lib/data/repository";
import { interpretQuestion, isFailure } from "@/lib/nl/interpret";
import { allowRequest } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!allow(request)) return Response.json({ error: "Too many requests." }, { status: 429 });
  const tools = await discoverTools();
  return Response.json({ tools });
}

export async function POST(request: Request) {
  if (!allow(request)) return Response.json({ error: "Too many requests." }, { status: 429 });
  let body: { requestId?: string; tool?: string; arguments?: Record<string, unknown>; question?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "The request body must be JSON." }, { status: 400 });
  }
  const requestId = typeof body.requestId === "string" && body.requestId.length < 80 ? body.requestId : crypto.randomUUID();

  if (typeof body.question === "string") {
    if (body.question.length > 500) return Response.json({ error: "Question is too long." }, { status: 400 });
    const store = await getStore();
    const interpretation = interpretQuestion(store, body.question);
    if (isFailure(interpretation)) {
      return Response.json({ ok: false, interpretation, result: null, trace: null });
    }
    const run = await runTool(interpretation.tool, interpretation.arguments, requestId);
    return Response.json({ ...run, interpretation });
  }

  if (!body.tool || !isAllowedTool(body.tool)) {
    return Response.json({ error: "Choose one of the Gazette statistics tools." }, { status: 400 });
  }
  const args = body.arguments && typeof body.arguments === "object" ? body.arguments : {};
  const run = await runTool(body.tool, args, requestId);
  return Response.json(run);
}

function allow(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return allowRequest(forwarded || "local");
}
