"use client";

import { useEffect, useRef, useState } from "react";
import { titleFromSrc, type StoredProject } from "@/data/projects";
import {
  cropMobile,
  posterFromVideo,
  probeVideo,
  resetFFmpeg,
  type VideoSpec,
} from "@/lib/compress";

type Mode = "local" | "blob";

// ── What a web-ready export looks like ──
// The browser is no longer asked to transcode masters: ffmpeg.wasm is an order
// of magnitude slower than a real encoder, and on anything large it timed out
// and uploaded the untouched master — so the heaviest files were precisely the
// ones that escaped compression. Exports come from the edit instead, where the
// encode is hardware-accelerated and the grade is under control. The admin's
// job is to say plainly when a file misses the target.
const TARGET_HEIGHT = 1080;
const TARGET_MBPS = 6;
const HARD_MBPS = 10; // beyond this, the file is a master, not an export

// Max time to build the lighter mobile (cropped) version before skipping it.
const MOBILE_TIMEOUT_MS = 30000;

/** Anything heavier than this makes a visitor wait — flagged in the list. */
const HEAVY_MB = 8;

/**
 * What is wrong with this export, in the words the person exporting needs.
 * Returns null when the file is fine. Never blocks the upload — the file may
 * be deliberate, and a refused upload with no way through is worse than a
 * heavy one.
 */
function auditExport(spec: VideoSpec | null, file: File): string | null {
  if (!spec) return null; // couldn't read it — say nothing rather than guess
  const problems: string[] = [];
  if (spec.height > TARGET_HEIGHT)
    problems.push(
      `${spec.width}×${spec.height} — export at ${TARGET_HEIGHT}p`
    );
  if (spec.mbps > HARD_MBPS)
    problems.push(
      `${spec.mbps.toFixed(0)} Mbps — this is a master, target ${TARGET_MBPS} Mbps`
    );
  else if (spec.mbps > TARGET_MBPS)
    problems.push(
      `${spec.mbps.toFixed(1)} Mbps — a little rich, target ${TARGET_MBPS}`
    );
  if (file.type && file.type !== "video/mp4")
    problems.push(`${file.type.replace("video/", "")} — export MP4 / H.264`);
  return problems.length ? problems.join(" · ") : null;
}

function fmtBytes(n: number | undefined): string {
  if (!n && n !== 0) return "—";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * Weight of a file we did not upload ourselves (added before sizes were
 * recorded). A HEAD request is enough — `content-length` without the body.
 */
async function headSize(url: string): Promise<number | undefined> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const len = res.headers.get("content-length");
    return len ? Number(len) : undefined;
  } catch {
    return undefined; // cross-origin or offline — just show nothing
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("compress-timeout")), ms)
    ),
  ]);
}

type Phase = "queued" | "compressing" | "uploading" | "done" | "error";

type UploadJob = {
  id: string;
  name: string;
  size: number; // bytes
  phase: Phase;
  startedAt: number;
  note?: string;
};

function slugify(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot >= 0 ? name.slice(0, dot) : name;
  return (
    base
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "video"
  );
}

async function uploadFile(blob: Blob, filename: string, mode: Mode): Promise<string> {
  if (mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const res = await upload(filename, blob, {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      contentType: blob.type,
    });
    return res.url;
  }
  const fd = new FormData();
  fd.append("file", blob, filename);
  fd.append("name", filename);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()).url as string;
}

export default function AdminApp({
  initial,
  mode,
}: {
  initial: StoredProject[];
  mode: Mode;
}) {
  const [list, setList] = useState<StoredProject[]>(initial);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Weights measured on the fly for projects uploaded before sizes were
  // recorded. Display only — never written back, so opening the admin has no
  // side effect on stored data.
  const [probed, setProbed] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    const missing = list.filter((p) => p.bytes === undefined && p.src);
    if (!missing.length) return;
    (async () => {
      for (const p of missing) {
        const n = await headSize(p.src);
        if (!alive) return;
        if (n !== undefined) setProbed((prev) => ({ ...prev, [p.id]: n }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [list]);

  const sizeOf = (p: StoredProject) => p.bytes ?? probed[p.id];
  const totalBytes = list.reduce((sum, p) => sum + (sizeOf(p) ?? 0), 0);
  const anyUnknown = list.some((p) => sizeOf(p) === undefined);

  // Tick once per second while uploads run, to refresh the elapsed timers.
  const [, setTick] = useState(0);
  const activeJobs = jobs.some((j) => j.phase === "compressing" || j.phase === "uploading");
  useEffect(() => {
    if (!activeJobs) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeJobs]);

  // Persist a given list to the server.
  const persist = async (next: StoredProject[]) => {
    setSaving(true);
    const res = await fetch("/api/admin/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects: next }),
    });
    setSaving(false);
    if (res.ok) setDirty(false);
    return res.ok;
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    persist(next);
  };

  const update = (id: string, patch: Partial<StoredProject>) => {
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const remove = async (proj: StoredProject) => {
    if (!confirm(`Delete "${proj.title || titleFromSrc(proj.src)}"?`)) return;
    const next = list.filter((p) => p.id !== proj.id);
    setList(next);
    await persist(next);
    // best-effort delete of the stored files
    fetch("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [proj.src, proj.srcMobile, proj.poster].filter(Boolean),
      }),
    }).catch(() => {});
  };

  const setJob = (id: string, patch: Partial<UploadJob>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const handleFiles = async (files: File[]) => {
    const videos = files.filter((f) => f.type.startsWith("video/"));
    if (videos.length === 0) return;

    // Queue them all up front so progress is visible (sequential processing).
    const queued: UploadJob[] = videos.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      phase: "queued",
      startedAt: 0,
    }));
    setJobs((prev) => [...prev, ...queued]);

    // Accumulate locally so several files in one drop don't clobber each other.
    let working = [...list];

    for (let k = 0; k < videos.length; k++) {
      const file = videos[k];
      const jobId = queued[k].id;
      setJob(jobId, { phase: "compressing", startedAt: Date.now() });

      const videoBlob: Blob = file;
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();

      // Check the export rather than try to rescue it.
      const spec = await probeVideo(file).catch(() => null);
      const audit = auditExport(spec, file);
      const optimized = !audit;
      setJob(jobId, {
        note: audit ? `⚠ ${audit}` : `web-ready · ${fmtBytes(file.size)}`,
      });

      const posterBlob = await posterFromVideo(file).catch(() => null);

      // Lighter, side-cropped (9:16) mobile version — best-effort, and the one
      // place ffmpeg.wasm still runs. It works on the web-ready export rather
      // than a master, so it usually finishes; if it doesn't, say so instead
      // of letting phones silently pull the full-width file.
      let mobileBlob: Blob | null = null;
      try {
        setJob(jobId, { note: "building mobile version…" });
        mobileBlob = await withTimeout(cropMobile(videoBlob), MOBILE_TIMEOUT_MS);
      } catch {
        resetFFmpeg();
        mobileBlob = null;
        setJob(jobId, { note: "⚠ no mobile version — phones get the full file" });
      }

      try {
        setJob(jobId, { phase: "uploading" });
        const slug = slugify(file.name);
        const src = await uploadFile(videoBlob, `${slug}.${ext}`, mode);
        let srcMobile: string | undefined;
        if (mobileBlob)
          srcMobile = await uploadFile(mobileBlob, `${slug}-mobile.mp4`, mode);
        let poster: string | undefined;
        if (posterBlob) poster = await uploadFile(posterBlob, `${slug}.jpg`, mode);

        const proj: StoredProject = {
          id: crypto.randomUUID(),
          title: titleFromSrc(file.name), // pre-filled, editable/clearable later
          src,
          srcMobile,
          poster,
          bytes: videoBlob.size,
          bytesMobile: mobileBlob?.size,
          optimized,
        };
        working = [...working, proj];
        setList(working);
        await persist(working);
        setJob(jobId, { phase: "done" });
        setTimeout(() => setJobs((prev) => prev.filter((j) => j.id !== jobId)), 2500);
      } catch (err) {
        const message = err instanceof Error ? err.message : "upload failed";
        setJob(jobId, { phase: "error", note: message });
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  };

  const doneCount = jobs.filter((j) => j.phase === "done").length;

  return (
    <main className="admin">
      <header className="admin-bar">
        <div className="admin-bar-title">
          LUCID <span className="admin-bar-sub">— Admin</span>
        </div>
        <div className="admin-bar-actions">
          {/* What the carousel actually costs a visitor — the number that
              decides how long the site takes to feel ready. */}
          {list.length > 0 && (
            <span
              className={
                "admin-total" +
                (totalBytes > HEAVY_MB * 1024 * 1024 * list.length
                  ? " is-heavy"
                  : "")
              }
            >
              {fmtBytes(totalBytes)}
              {anyUnknown && "+"} total · {list.length} video
              {list.length > 1 ? "s" : ""}
            </span>
          )}
          <span className="admin-mode">storage: {mode}</span>
          <a className="admin-btn" href="/" target="_blank" rel="noreferrer">
            View site ↗
          </a>
          <button
            className={"admin-btn" + (dirty ? " admin-btn-primary" : "")}
            disabled={!dirty || saving}
            onClick={() => persist(list)}
          >
            {saving ? "Saving…" : dirty ? "Save" : "Saved ✓"}
          </button>
          <button className="admin-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {/* Upload dropzone */}
      <div
        className={"admin-drop" + (dragOver ? " is-over" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
      >
        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
        <strong>Drop your videos here</strong>
        <span>
          or click to choose — MP4 / H.264, {TARGET_HEIGHT}p, ≤ {TARGET_MBPS}{" "}
          Mbps, no audio
        </span>
      </div>

      {/* Upload jobs */}
      {jobs.length > 0 && (
        <>
          {jobs.length > 1 && (
            <div className="admin-jobs-head">
              {doneCount} / {jobs.length} done — videos are processed one at a time
            </div>
          )}
          <ul className="admin-jobs">
            {jobs.map((j) => {
              const elapsed = j.startedAt ? Math.round((Date.now() - j.startedAt) / 1000) : 0;
              return (
                <li
                  key={j.id}
                  className={
                    "admin-job" +
                    (j.phase === "error" ? " is-error" : "") +
                    (j.phase === "done" ? " is-done" : "")
                  }
                >
                  <span className="admin-job-name">
                    {j.name}{" "}
                    <span className="admin-job-size">
                      ({(j.size / 1024 / 1024).toFixed(0)} MB)
                    </span>
                  </span>
                  <span className="admin-job-phase">
                    {j.phase === "queued" && "Queued…"}
                    {j.phase === "compressing" && `Compressing… ${elapsed}s`}
                    {j.phase === "uploading" && "Uploading…"}
                    {j.phase === "done" && "Done ✓"}
                    {j.phase === "error" && (j.note || "Error")}
                  </span>
                  {j.note && j.phase !== "error" && (
                    <span className="admin-job-note">{j.note}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Project list */}
      <ol className="admin-list">
        {list.map((p, i) => (
          <li key={p.id} className="admin-row">
            <div className="admin-order">
              <button
                className="admin-arrow"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Move up"
              >
                ↑
              </button>
              <span className="admin-index">{String(i + 1).padStart(2, "0")}</span>
              <button
                className="admin-arrow"
                disabled={i === list.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move down"
              >
                ↓
              </button>
            </div>

            <div className="admin-media">
              <div className="admin-thumb">
                {p.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.poster} alt="" />
                ) : (
                  <div className="admin-thumb-none">video</div>
                )}
              </div>
              <div
                className={
                  "admin-size" +
                  ((sizeOf(p) ?? 0) > HEAVY_MB * 1024 * 1024
                    ? " is-heavy"
                    : "")
                }
                title={
                  p.optimized === false
                    ? "Uploaded without re-encoding — the browser gave up compressing it"
                    : undefined
                }
              >
                {fmtBytes(sizeOf(p))}
                {p.optimized === false && <span title="not optimized"> ⚠</span>}
              </div>
              {p.bytesMobile !== undefined && (
                <div className="admin-size admin-size-dim">
                  {fmtBytes(p.bytesMobile)} mob.
                </div>
              )}
            </div>

            <div className="admin-fields">
              <label className="admin-field admin-field-wide">
                <span>Title</span>
                <input
                  value={p.title ?? ""}
                  placeholder="Leave empty to hide"
                  onChange={(e) => update(p.id, { title: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span>Category</span>
                <input
                  value={p.category ?? ""}
                  placeholder="Music Video…"
                  onChange={(e) => update(p.id, { category: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span>Client</span>
                <input
                  value={p.client ?? ""}
                  placeholder="Dir. / Client"
                  onChange={(e) => update(p.id, { client: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field-year">
                <span>Year</span>
                <input
                  type="number"
                  value={p.year ?? ""}
                  placeholder="—"
                  onChange={(e) =>
                    update(p.id, {
                      year: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>

            <button className="admin-delete" onClick={() => remove(p)} aria-label="Delete">
              ✕
            </button>
          </li>
        ))}
      </ol>
    </main>
  );
}
