import { NextResponse } from "next/server";
import { setChapterProgress } from "@/lib/reading";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    key?: string;
    chapter_href?: string;
    chapter_title?: string | null;
    domain_code?: string | null;
    percent?: number;
    completed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.key || !body.chapter_href) {
    return NextResponse.json(
      { error: "key and chapter_href required" },
      { status: 400 }
    );
  }
  const chapter = setChapterProgress({
    material_key: body.key,
    chapter_href: body.chapter_href,
    chapter_title: body.chapter_title ?? null,
    domain_code: body.domain_code ?? null,
    percent: typeof body.percent === "number" ? body.percent : 0,
    completed: !!body.completed,
  });
  return NextResponse.json({ chapter });
}
