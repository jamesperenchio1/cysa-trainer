import { promises as fs } from "fs";
import path from "path";

// Books/materials live ONLY on the self-hosted instance, never in the public
// repo. They are served from either:
//   (a) Supabase Storage (self-hosted) when SUPABASE_URL +
//       SUPABASE_SERVICE_ROLE_KEY are configured -- the production path, so the
//       books are not baked into the image; or
//   (b) a gitignored local directory (see .gitignore / .dockerignore) -- the
//       default for local development.
//
// The Storage REST API is called directly with fetch rather than pulling in
// @supabase/supabase-js, whose realtime client requires native WebSocket
// (Node 22+) and would otherwise crash the Node 20 image on startup.
export const MATERIALS_DIR =
  process.env.MATERIALS_DIR || path.join(process.cwd(), "materials");

const BUCKET = process.env.SUPABASE_MATERIALS_BUCKET || "cysa-materials";
const BOOKS_PREFIX = (process.env.SUPABASE_BOOKS_PREFIX || "books").replace(
  /^\/+|\/+$/g,
  ""
);

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
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

function storageUrl(suffix: string): string {
  return `${SUPABASE_URL}/storage/v1${suffix}`;
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${SUPABASE_KEY}`,
    apikey: SUPABASE_KEY,
    ...extra,
  };
}

// Encode each path segment but keep the slashes between them.
function encodeObjectPath(objectPath: string): string {
  return objectPath
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
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

interface StorageListItem {
  name: string;
  metadata: { size?: number } | null;
}

async function listRemote(): Promise<StorageListItem[]> {
  try {
    const res = await fetch(storageUrl(`/object/list/${BUCKET}`), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        prefix: BOOKS_PREFIX,
        limit: 200,
        sortBy: { column: "name", order: "asc" },
      }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as StorageListItem[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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

export async function listMaterials(): Promise<Material[]> {
  let materials: Material[];
  if (usingSupabase()) {
    const items = await listRemote();
    materials = [];
    for (const item of items) {
      const ext = path.extname(item.name).toLowerCase();
      const meta = EXT_MIME[ext];
      if (!meta) continue;
      materials.push({
        key: slugify(item.name),
        name: item.name,
        kind: meta.kind,
        size_bytes: item.metadata?.size ?? 0,
      });
    }
  } else {
    materials = await listLocal();
  }
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
    return downloadStorageBytes(`${BOOKS_PREFIX}/${material.name}`);
  }
  try {
    return await fs.readFile(materialPath(material));
  } catch {
    return null;
  }
}

// Downloads any object from the bucket as bytes (null when missing).
export async function downloadStorageBytes(
  objectPath: string
): Promise<Buffer | null> {
  if (!usingSupabase()) return null;
  try {
    const res = await fetch(
      storageUrl(`/object/${BUCKET}/${encodeObjectPath(objectPath)}`),
      { headers: authHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
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
  const bytes = await downloadStorageBytes(objectPath);
  return bytes ? bytes.toString("utf8") : null;
}
