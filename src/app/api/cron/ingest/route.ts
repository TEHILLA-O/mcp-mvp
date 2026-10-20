export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({
    ok: true,
    action: "noop",
    message:
      "Workbook downloads stay outside the request path. Run `npm run ingest:fetch` where the NBS files can be parsed, then publish with DATABASE_URL. The deployed app keeps serving the last verified snapshot.",
  });
}
