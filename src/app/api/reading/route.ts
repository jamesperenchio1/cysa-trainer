import { NextResponse } from "next/server";
import {
  getReadingState,
  saveReadingState,
  getChapterProgress,
  listBookmarks,
  listReadingStates,
} from "@/lib/reading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ states: listReadingStates() });
  return NextResponse.json({
    state: getReadingState(key),
    chapters: getChapterProgress(key),
    bookmarks: listBookmarks(key),
  });
}

export async function POST(req: Request) {
  let body: {
    key?: string;
    cfi?: string;
    percent?: number;
    chapter_href?: string | null;
    chapter_title?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.key || typeof body.cfi !== "string") {
    return NextResponse.json({ error: "key and cfi required" }, { status: 400 });
  }
  const state = saveReadingState({
    material_key: body.key,
    cfi: body.cfi,
    percent: typeof body.percent === "number" ? body.percent : 0,
    chapter_href: body.chapter_href ?? null,
    chapter_title: body.chapter_title ?? null,
  });
  return NextResponse.json({ state });
}
