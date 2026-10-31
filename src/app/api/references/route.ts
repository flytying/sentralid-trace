import { NextResponse, type NextRequest } from "next/server";
import { registryFor } from "@/lib/registry/api";
import { lookupFacebookLink, searchByName } from "@/lib/registry/search";

export const runtime = "nodejs";

// GET /api/references?q=name            — name search over admitted records
// GET /api/references?url=facebook-link — exact link lookup (never fetches the link)
// Add samples=1 to use the synthetic sample set instead of the real registry.
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const reg = registryFor(params);
  const url = params.get("url");
  if (url !== null) {
    return NextResponse.json({ registryVersion: reg.version, lookup: lookupFacebookLink(reg, url.slice(0, 500)) });
  }
  const q = (params.get("q") ?? "").slice(0, 80);
  return NextResponse.json({ registryVersion: reg.version, items: searchByName(reg, q, 12) });
}
