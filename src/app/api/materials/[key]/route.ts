import { NextResponse } from "next/server";
import { getMaterialBytes, resolveMaterial } from "@/lib/materials";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
};

export async function GET(
  req: Request,
  { params }: { params: { key: string } }
) {
  const material = await resolveMaterial(params.key);
  if (!material) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (new URL(req.url).searchParams.has("meta")) {
    return NextResponse.json({ material });
  }

  const data = await getMaterialBytes(material);
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = new Uint8Array(data.byteLength);
  body.set(data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME[material.kind] || "application/octet-stream",
      "Content-Length": String(data.byteLength),
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(material.name)}`,
    },
  });
}
