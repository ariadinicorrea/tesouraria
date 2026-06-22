import { NextResponse } from "next/server";
import { computeDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

// GET /api/dashboard?escopo=consolidado | <empresa_id>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const escopo = searchParams.get("escopo") ?? "consolidado";
  try {
    const data = await computeDashboard(escopo);
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: (e as Error).message }, { status: 500 });
  }
}
