import fs from "fs";
import path from "path";

// Uploads the local (gitignored) books and derived content to the self-hosted
// Supabase Storage bucket, so the deployed app can serve them without baking
// them into the Docker image.
//
// Usage (from the repo root, with the storage creds in the environment):
//   SUPABASE_URL=http://127.0.0.1:8000 \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   npx tsx scripts/upload-materials.ts
//
// Optional: SUPABASE_MATERIALS_BUCKET (default cysa-materials),
//           SUPABASE_BOOKS_PREFIX (default books).
//
// Uses the Storage REST API directly (no @supabase/supabase-js dependency).

const BUCKET = process.env.SUPABASE_MATERIALS_BUCKET || "cysa-materials";
const BOOKS_PREFIX = (process.env.SUPABASE_BOOKS_PREFIX || "books").replace(
  /^\/+|\/+$/g,
  ""
);
const MATERIALS_DIR =
  process.env.MATERIALS_DIR || path.join(process.cwd(), "materials");
const DERIVED_FILE = path.join(
  process.cwd(),
  "data",
  "derived",
  "study-guide",
  "flashcards.json"
);
const DERIVED_OBJECT = "derived/study-guide/flashcards.json";

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".json": "application/json",
};

const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) {
  console.error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment."
  );
  process.exit(1);
}

function encodeObjectPath(objectPath: string): string {
  return objectPath
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

async function uploadFile(objectPath: string, filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = EXT_MIME[ext] || "application/octet-stream";
  const body = fs.readFileSync(filePath);
  const res = await fetch(
    `${url}/storage/v1/object/${BUCKET}/${encodeObjectPath(objectPath)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body,
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to upload ${objectPath}: ${res.status} ${detail}`);
  }
  console.log(`uploaded ${objectPath} (${(body.length / 1048576).toFixed(1)} MB)`);
}

async function main() {
  console.log(`Uploading to bucket "${BUCKET}" at ${url}`);

  if (fs.existsSync(MATERIALS_DIR)) {
    const files = fs
      .readdirSync(MATERIALS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && EXT_MIME[path.extname(e.name).toLowerCase()]);
    for (const f of files) {
      await uploadFile(`${BOOKS_PREFIX}/${f.name}`, path.join(MATERIALS_DIR, f.name));
    }
  } else {
    console.log(`No local materials dir at ${MATERIALS_DIR} -- skipping books.`);
  }

  if (fs.existsSync(DERIVED_FILE)) {
    await uploadFile(DERIVED_OBJECT, DERIVED_FILE);
  } else {
    console.log(
      `No derived flashcards at ${DERIVED_FILE} -- skipping (run scripts/extract_study_guide.py first).`
    );
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
