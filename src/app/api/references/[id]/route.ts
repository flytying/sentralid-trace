import { NextResponse, type NextRequest } from "next/server";
import { errorBody, AppError } from "@/lib/errors";
import { registryFor } from "@/lib/registry/api";
import { isServable, toView } from "@/lib/registry/load";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const reg = registryFor(req.nextUrl.searchParams);
  const b = reg.businesses.find((x) => x.id === id && isServable(x));
  if (!b) {
    const err = new AppError("REFERENCE_NOT_FOUND", "We don't have this resort on file.", 404);
    return NextResponse.json(errorBody(err, crypto.randomUUID().slice(0, 8)), { status: 404 });
  }
  return NextResponse.json({ registryVersion: reg.version, item: toView(reg, b) });
}
