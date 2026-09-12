import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Books/materials live ONLY on the self-hosted instance, never in the public
// repo. They are served from either:
//   (a) Supabase Storage (self-hosted) when SUPABASE_URL +
//       SUPABASE_SERVICE_ROLE_KEY are configured -- the production path, so the
//       books are not baked into the image; or
//   (b) a gitignored local directory (see .gitignore / .dockerignore) -- the
//       default for local development.
export const MATERIALS_DIR =
  process.env.MATERIALS_DIR || path.join(process.cwd(), "materials");

const BUCKET = process.env.SUPABASE_MATERIALS_BUCKET || "cysa-materials";
const BOOKS_PREFIX = (process.env.SUPABASE_BOOKS_PREFIX || "books").replace(
  /^\/+|\/+$/g,
  ""
);

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

const EXT_MIME: Record<string, { mime: string; kind: "pdf" | "epub" }> = {
  ".pdf": { mime: "application/pdf", kind: "pdf" },
  ".epub": { mime: "application/epub+zip", kind: "epub" },
};

export interface Material {
  key: string;
  name: string;
  kind: "pdf" | "epub";
  size_bytes: number;
}

export function usingSupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function slugify(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const slug = base
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Include the extension so e.g. practice-tests.pdf and practice-tests.epub
  // get distinct keys instead of colliding on "practice-tests".
  return `${slug}-${ext}`;
}

async function listLocal(): Promise<Material[]> {
  let entries;
  try {
    entries = await fs.readdir(MATERIALS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const materials: Material[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const meta = EXT_MIME[ext];
    if (!meta) continue;
    const stat = await fs.stat(path.join(MATERIALS_DIR, entry.name));
    materials.push({
      key: slugify(entry.name),
      name: entry.name,
      kind: meta.kind,
      size_bytes: stat.size,
    });
  }
  return materials;
}

async function listRemote(): Promise<Material[]> {
  const { data, error } = await supabase()
    .storage.from(BUCKET)
    .list(BOOKS_PREFIX, { limit: 200, sortBy: { column: "name", order: "asc" } });
  if (error || !data) return [];

  const materials: Material[] = [];
  for (const item of data) {
    const name = item.name;
    const ext = path.extname(name).toLowerCase();
    const meta = EXT_MIME[ext];
    if (!meta) continue;
    const size = (item.metadata as { size?: number } | null)?.size ?? 0;
    materials.push({
      key: slugify(name),
      name,
      kind: meta.kind,
      size_bytes: size,
    });
  }
  return materials;
}

export async function listMaterials(): Promise<Material[]> {
  const materials = usingSupabase() ? await listRemote() : await listLocal();
  return materials.sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveMaterial(key: string): Promise<Material | null> {
  const materials = await listMaterials();
  return materials.find((m) => m.key === key) ?? null;
}

export function materialPath(material: Material): string {
  return path.join(MATERIALS_DIR, material.name);
}

// Returns the raw bytes for a material, or null if it can't be read.
export async function getMaterialBytes(
  material: Material
): Promise<Buffer | null> {
  if (usingSupabase()) {
    const { data, error } = await supabase()
      .storage.from(BUCKET)
      .download(`${BOOKS_PREFIX}/${material.name}`);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  try {
    return await fs.readFile(materialPath(material));
  } catch {
    return null;
  }
}

// Fetches a text object (e.g. the derived flashcards JSON) from Supabase
// Storage. Returns null when Supabase is not configured or the object is
// missing, so callers can fall back to a local file.
export async function downloadStorageText(
  objectPath: string
): Promise<string | null> {
  if (!usingSupabase()) return null;
  const { data, error } = await supabase()
    .storage.from(BUCKET)
    .download(objectPath.replace(/^\/+/, ""));
  if (error || !data) return null;
  return await data.text();
}
