import { NextResponse } from "next/server";
import { addBookmark, removeBookmark } from "@/lib/reading";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    key?: string;
    cfi?: string;
    label?: string | null;
    chapter_href?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.key || !body.cfi) {
    return NextResponse.json({ error: "key and cfi required" }, { status: 400 });
  }
  const bookmark = addBookmark({
    material_key: body.key,
    cfi: body.cfi,
    label: body.label ?? null,
    chapter_href: body.chapter_href ?? null,
  });
  return NextResponse.json({ bookmark });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "valid id required" }, { status: 400 });
  }
  removeBookmark(id);
  return NextResponse.json({ ok: true });
}
