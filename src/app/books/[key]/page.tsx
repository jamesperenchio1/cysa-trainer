"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import EpubReader from "@/components/EpubReader";
import {
  chaptersForMaterial,
  DOMAIN_NAMES,
  normalizeChapterKey,
  type ChapterMeta,
  type DomainCode,
} from "@/lib/books";

interface Metadata {
  key: string;
  name: string;
  kind: "pdf" | "epub";
  size_bytes: number;
}

interface ChapterProgress {
  material_key: string;
  chapter_href: string;
  chapter_title: string | null;
  domain_code: string | null;
  percent: number;
  completed: number;
}

const DOMAIN_BADGE: Record<DomainCode, string> = {
  SO: "bg-accent/20 text-accent",
  VM: "bg-good/20 text-good",
  IR: "bg-warn/20 text-warn",
  RC: "bg-panel2 text-gray-300",
};

export default function MaterialReaderPage() {
  const { key } = useParams<{ key: string }>();
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [progress, setProgress] = useState<ChapterProgress[]>([]);

  useEffect(() => {
    if (!key) return;
    fetch(`/api/materials/${key}?meta=1`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setMeta(data.material);
      })
      .catch(() => setNotFound(true));
  }, [key]);

  const loadProgress = useCallback(() => {
    if (!key) return;
    fetch(`/api/reading?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((data) => setProgress(data.chapters ?? []))
      .catch(() => {});
  }, [key]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const chapters: ChapterMeta[] | null = meta
    ? chaptersForMaterial(meta.key, meta.name)
    : null;

  const progressFor = (file: string): ChapterProgress | undefined =>
    progress.find((p) => normalizeChapterKey(p.chapter_href) === file);

  const toggleChapter = async (ch: ChapterMeta) => {
    if (!key) return;
    const existing = progressFor(ch.file);
    const completed = existing?.completed ? 0 : 1;
    const res = await fetch("/api/reading/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        chapter_href: ch.file,
        chapter_title: ch.title,
        domain_code: ch.domainCode,
        percent: completed ? 100 : existing?.percent ?? 0,
        completed,
      }),
    });
    if (res.ok) loadProgress();
  };

  if (notFound || !key) {
    return (
      <main>
        <div className="flex items-center justify-between mb-6 pt-2">
          <Link href="/books" className="text-sm text-gray-400 hover:text-gray-200">
            ← Books
          </Link>
          <h1 className="text-xl font-bold">Not found</h1>
          <div className="w-14" />
        </div>
        <p className="text-sm text-gray-500">
          This material isn’t available. Check the <code className="text-gray-300">materials/</code> folder on the server.
        </p>
      </main>
    );
  }

  return (
    <main>
      <div className="flex items-center justify-between mb-6 pt-2">
        <Link href="/books" className="text-sm text-gray-400 hover:text-gray-200">
          ← Books
        </Link>
        <h1 className="text-lg font-bold truncate">{meta?.name ?? "…"}</h1>
        <div className="w-14" />
      </div>

      {!meta && <p className="text-sm text-gray-500">Loading…</p>}

      {meta && meta.kind === "pdf" && (
        <embed
          src={`/api/materials/${meta.key}`}
          type="application/pdf"
          className="w-full border border-border rounded-xl"
          style={{ height: "82vh" }}
        />
      )}

      {meta && meta.kind === "epub" && (
        <EpubReader src={`/api/materials/${meta.key}`} title={meta.name} bookKey={meta.key} />
      )}

      {meta && chapters && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Chapters</h2>
            <span className="text-xs text-gray-500">
              {progress.filter((p) => p.completed).length}/{chapters.length} read
            </span>
          </div>
          <div className="space-y-2">
            {chapters.map((ch) => {
              const p = progressFor(ch.file);
              const done = !!p?.completed;
              return (
                <div
                  key={ch.file}
                  className="card flex items-center gap-3"
                >
                  <span className="w-6 text-xs text-gray-500 text-right">{ch.index}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${DOMAIN_BADGE[ch.domainCode]}`}>
                        {DOMAIN_NAMES[ch.domainCode]}
                      </span>
                      {p && p.percent > 0 && (
                        <span className="text-xs text-gray-500">{Math.round(p.percent)}%</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 truncate mt-1">{ch.title}</p>
                  </div>
                  <button
                    onClick={() => toggleChapter(ch)}
                    className={done ? "btn btn-primary text-xs" : "btn btn-secondary text-xs"}
                  >
                    {done ? "Read ✓" : "Mark read"}
                  </button>
                  <Link
                    href={`/drill?domain=${ch.domainCode}`}
                    className="btn btn-secondary text-xs"
                  >
                    Drill →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
