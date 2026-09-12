import { promises as fs } from "fs";
import path from "path";

// Books/materials live ONLY on the self-hosted instance, never in the public
// repo. They are served from a gitignored directory (see .gitignore /
// .dockerignore) and read at request time, so a rebuild never ships them.
export const MATERIALS_DIR =
  process.env.MATERIALS_DIR || path.join(process.cwd(), "materials");

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

export async function listMaterials(): Promise<Material[]> {
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

  return materials.sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveMaterial(key: string): Promise<Material | null> {
  const materials = await listMaterials();
  return materials.find((m) => m.key === key) ?? null;
}

export function materialPath(material: Material): string {
  return path.join(MATERIALS_DIR, material.name);
}
