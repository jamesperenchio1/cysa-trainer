"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Material {
  key: string;
  name: string;
  kind: "pdf" | "epub";
  size_bytes: number;
}

interface ReadingState {
  material_key: string;
  percent: number;
  updated_at: string;
}

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  epub: "EPUB",
};

export default function BooksPage() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/materials")
      .then((r) => r.json())
      .then((data) => setMaterials(data.materials))
      .catch(() => {
        setError(true);
        setMaterials([]);
      });
    fetch("/api/reading")
      .then((r) => r.json())
      .then((data: { states?: ReadingState[] }) => {
        const map: Record<string, number> = {};
        for (const s of data.states ?? []) map[s.material_key] = s.percent;
        setProgress(map);
      })
      .catch(() => {});
  }, []);

  return (
    <main>
      <div className="flex items-center justify-between mb-6 pt-2">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold">Practice Tests & Books</h1>
        <div className="w-14" />
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Reference material for the CS0-004 exam. These are served privately from
        this instance — they are never part of the public source repo.
      </p>

      {error && (
        <div className="card mb-4 text-sm text-warn">
          Couldn’t list materials. Add your PDF/EPUB files to the <code className="text-gray-300">materials/</code> folder on the server.
        </div>
      )}

      {!materials && <p className="text-sm text-gray-500">Loading…</p>}

      {materials && materials.length === 0 && !error && (
        <div className="card">
          <p className="text-sm text-gray-500">
            No materials found. Place PDF/EPUB files in the{" "}
            <code className="text-gray-300">materials/</code> folder on the
            server, then refresh.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {materials?.map((m) => (
          <Link
            key={m.key}
            href={`/books/${m.key}`}
            className="card hover:border-accent transition-colors flex items-center gap-4"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-panel2 border border-border">
              <span className="text-lg">{m.kind === "pdf" ? "📄" : "📕"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{m.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {TYPE_LABEL[m.kind]} · {formatSize(m.size_bytes)}
                {progress[m.key] != null && progress[m.key] > 0 && (
                  <span className="text-accent"> · {Math.round(progress[m.key])}% read</span>
                )}
              </p>
              {progress[m.key] != null && progress[m.key] > 0 && (
                <div className="mt-2 h-1 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.min(100, Math.round(progress[m.key]))}%` }}
                  />
                </div>
              )}
            </div>
            <span className="text-gray-500 text-sm">Open →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
