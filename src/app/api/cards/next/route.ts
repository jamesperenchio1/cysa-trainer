import { NextRequest, NextResponse } from "next/server";
import { cardStats, listDueCards } from "@/lib/flashcards";
import type { DomainCode } from "@/lib/books";

export const dynamic = "force-dynamic";

const DOMAIN_CODES: DomainCode[] = ["SO", "VM", "IR", "RC"];

export async function GET(req: NextRequest) {
  const count = Math.min(100, Number(req.nextUrl.searchParams.get("count") || 20));
  const requested = req.nextUrl.searchParams.get("domain");
  const domain =
    requested && DOMAIN_CODES.includes(requested as DomainCode)
      ? (requested as DomainCode)
      : null;

  const cards = listDueCards({ domain, limit: count });
  return NextResponse.json({ cards, stats: cardStats() });
}
