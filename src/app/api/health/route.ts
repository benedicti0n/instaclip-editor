import { getToolAvailability } from "@/lib/server/tooling";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET() {
  const tools = await getToolAvailability();
  const healthy = tools.ytDlp && tools.ffprobe;

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      tools,
    },
    { status: healthy ? 200 : 503 },
  );
}
