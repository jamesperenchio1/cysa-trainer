import { NextResponse } from "next/server";
import { listMaterials } from "@/lib/materials";

export const dynamic = "force-dynamic";

export async function GET() {
  const materials = await listMaterials();
  return NextResponse.json({ materials });
}
