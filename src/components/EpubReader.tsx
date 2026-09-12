"use client";
import { useEffect, useRef, useState } from "react";
import ePub from "epubjs";

interface TocItem {
  id?: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

interface Bookmark {
  id: number;
  cfi: string;
  label: string | null;
  chapter_href: string | null;
  created_at: string;
}

interface Props {
  src: string;
  title: string;
  bookKey?: string;
}

function stripTags(s: string): string {
  return (s || "").replace(/<[^>]*>/g, "").trim();
}

function TocList({
  items,
  depth = 0,
  onJump,
}: {
  items: TocItem[];
  depth?: number;
  onJump: (href: string) => void;
}) {
  return (
    <ul className={depth === 0 ? "" : "ml-3 border-l border-border"}>
      {items.map((it, i) => (
        <li key={`${it.href}-${i}`}>
          <button
            onClick={() => onJump(it.href)}
            className="w-full text-left text-xs text-gray-400 hover:text-gray-100 hover:bg-panel2 rounded px-2 py-1.5 leading-snug"
          >
            {stripTags(it.label)}
          </button>
          {it.subitems && it.subitems.length > 0 && (
            <TocList items={it.subitems} depth={depth + 1} onJump={onJump} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function EpubReader({ src, title, bookKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  const locationsReadyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locRef = useRef<{ cfi: string; href: string; percent: number; label: string } | null>(null);
  const fontSizeRef = useRef(100);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [percent, setPercent] = useState(0);
  const [chapterTitle, setChapterTitle] = useState("");
  const [fontSize, setFontSize] = useState(100);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let book: any = null;
    let navToc: TocItem[] = [];

    function findLabel(href: string, items: TocItem[] = navToc): string {
      const base = (href || "").split("#")[0];
      for (const it of items) {
        if (it.href && it.href.split("#")[0] === base) return stripTags(it.label);
        if (it.subitems) {
          const r = findLabel(href, it.subitems);
          if (r) return r;
        }
      }
      return "";
    }

    function scheduleSave() {
      if (!bookKey) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const loc = locRef.current;
        if (!loc) return;
        fetch("/api/reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: bookKey,
            cfi: loc.cfi,
            percent: loc.percent,
            chapter_href: loc.href,
            chapter_title: loc.label,
          }),
        })
          .then(() => {
            setSavedNote("Saved");
            setTimeout(() => setSavedNote(""), 1500);
          })
          .catch(() => {});
      }, 1200);
    }

    function handleRelocated(location: any) {
      const start = location?.start;
      if (!start?.cfi) return;
      const href: string = start.href || "";
      const label = findLabel(href);
      let pct = 0;
      if (locationsReadyRef.current && bookRef.current) {
        try {
          pct = Math.round(bookRef.current.locations.percentageFromCfi(start.cfi) * 100);
        } catch {
          /* ignore */
        }
      } else if (typeof start.percentage === "number") {
        pct = Math.round(start.percentage * 100);
      }
      pct = Math.max(0, Math.min(100, pct));
      locRef.current = { cfi: start.cfi, href, percent: pct, label };
      setPercent(pct);
      setChapterTitle(label);
      scheduleSave();
    }

    (async () => {
      try {
        let resumeCfi: string | null = null;
        if (bookKey) {
          try {
            const r = await fetch(`/api/reading?key=${encodeURIComponent(bookKey)}`);
            if (r.ok) {
              const d = await r.json();
              resumeCfi = d.state?.cfi ?? null;
              setBookmarks(d.bookmarks ?? []);
            }
          } catch {
            /* ignore */
          }
        }

        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = await res.arrayBuffer();
        book = ePub();
        bookRef.current = book;
        await book.open(bytes);
        if (cancelled) return;

        const rendition = book.renderTo(container, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "auto",
        });
        renditionRef.current = rendition;
        rendition.themes.default({
          body: { color: "#e5e7eb", background: "#111418" },
          a: { color: "#3b82f6" },
          p: { "line-height": "1.6" },
        });
        rendition.themes.fontSize(`${fontSizeRef.current}%`);
        await rendition.display(resumeCfi || undefined);
        if (cancelled) return;

        try {
          const nav = await book.loaded.navigation;
          navToc = (nav?.toc ?? []) as TocItem[];
          setToc(navToc);
        } catch {
          /* ignore */
        }

        rendition.on("relocated", handleRelocated);

        book.ready
          .then(() => book.locations.generate(1600))
          .then(() => {
            if (cancelled) return;
            locationsReadyRef.current = true;
            const loc = rendition.currentLocation();
            if (loc?.start?.cfi) handleRelocated(loc);
          })
          .catch(() => {});

        setStatus("ready");
      } catch (err) {
        console.error("epub render failed", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (book && typeof book.destroy === "function") book.destroy();
      bookRef.current = null;
      renditionRef.current = null;
      locationsReadyRef.current = false;
    };
  }, [src, bookKey]);

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}%`);
  }, [fontSize]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") renditionRef.current?.prev();
      else if (e.key === "ArrowRight") renditionRef.current?.next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function jumpToHref(href: string) {
    renditionRef.current?.display(href);
    setShowToc(false);
  }

  function jumpToCfi(cfi: string) {
    renditionRef.current?.display(cfi);
    setShowBookmarks(false);
  }

  async function addBookmark() {
    const loc = locRef.current;
    if (!loc || !bookKey) return;
    try {
      const r = await fetch("/api/reading/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: bookKey,
          cfi: loc.cfi,
          label: loc.label || `Position ${loc.percent}%`,
          chapter_href: loc.href,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setBookmarks((prev) => [d.bookmark, ...prev]);
        setShowBookmarks(true);
      }
    } catch {
      /* ignore */
    }
  }

  async function removeBookmark(id: number) {
    try {
      await fetch(`/api/reading/bookmarks?id=${id}`, { method: "DELETE" });
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap text-sm">
        <button
          onClick={() => {
            setShowToc((v) => !v);
            setShowBookmarks(false);
          }}
          className="btn-secondary !py-1.5 !px-3 text-xs"
        >
          ☰ Contents
        </button>
        <button
          onClick={() => {
            setShowBookmarks((v) => !v);
            setShowToc(false);
          }}
          className="btn-secondary !py-1.5 !px-3 text-xs"
        >
          🔖 Bookmarks ({bookmarks.length})
        </button>
        <div className="flex-1 min-w-2" />
        {savedNote && <span className="text-xs text-good">{savedNote}</span>}
        <span className="text-xs text-gray-500 truncate max-w-[40%]">{chapterTitle}</span>
        <span className="text-xs text-gray-400 font-semibold">{percent}%</span>
      </div>

      <div className="h-1 bg-panel2 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="flex gap-2">
        {showToc && (
          <aside className="w-64 shrink-0 max-h-[72vh] overflow-y-auto bg-panel border border-border rounded-xl p-2">
            {toc.length === 0 && <p className="text-xs text-gray-500 p-2">No table of contents.</p>}
            <TocList items={toc} onJump={jumpToHref} />
          </aside>
        )}
        {showBookmarks && (
          <aside className="w-64 shrink-0 max-h-[72vh] overflow-y-auto bg-panel border border-border rounded-xl p-2">
            {bookmarks.length === 0 && (
              <p className="text-xs text-gray-500 p-2">No bookmarks yet.</p>
            )}
            {bookmarks.map((b) => (
              <div key={b.id} className="flex items-start gap-1 group">
                <button
                  onClick={() => jumpToCfi(b.cfi)}
                  className="flex-1 text-left text-xs text-gray-400 hover:text-gray-100 hover:bg-panel2 rounded px-2 py-1.5 leading-snug"
                >
                  {b.label || "Bookmark"}
                </button>
                <button
                  onClick={() => removeBookmark(b.id)}
                  className="text-gray-600 hover:text-bad text-xs px-1 py-1.5 opacity-0 group-hover:opacity-100"
                  aria-label="Remove bookmark"
                >
                  ✕
                </button>
              </div>
            ))}
          </aside>
        )}

        <div className="relative flex-1 min-w-0">
          <div
            ref={containerRef}
            className="w-full border border-border rounded-xl overflow-hidden bg-[#111418]"
            style={{ height: "72vh" }}
          />

          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111418] rounded-xl">
              <p className="text-sm text-gray-400">Opening “{title}”…</p>
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-panel rounded-xl p-6">
              <p className="text-sm text-warn text-center">
                Couldn’t render this EPUB. Try downloading it instead.
              </p>
            </div>
          )}

          {status === "ready" && (
            <>
              <button
                onClick={() => renditionRef.current?.prev()}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-gray-200 text-lg"
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                onClick={() => renditionRef.current?.next()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-gray-200 text-lg"
                aria-label="Next page"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-3 text-sm flex-wrap">
        <button onClick={() => renditionRef.current?.prev()} className="btn-secondary !py-1.5 !px-3 text-xs">
          ‹ Prev
        </button>
        <button onClick={() => renditionRef.current?.next()} className="btn-secondary !py-1.5 !px-3 text-xs">
          Next ›
        </button>
        <span className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setFontSize((s) => Math.max(70, s - 10))}
            className="btn-secondary !py-1 !px-2.5 text-xs"
            aria-label="Decrease font size"
          >
            A−
          </button>
          <span className="text-xs text-gray-500 w-10 text-center">{fontSize}%</span>
          <button
            onClick={() => setFontSize((s) => Math.min(180, s + 10))}
            className="btn-secondary !py-1 !px-2.5 text-xs"
            aria-label="Increase font size"
          >
            A+
          </button>
        </span>
        {bookKey && (
          <button onClick={addBookmark} className="btn-secondary !py-1.5 !px-3 text-xs ml-2">
            🔖 Add bookmark
          </button>
        )}
      </div>
    </div>
  );
}
