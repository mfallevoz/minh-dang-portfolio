import "server-only";
import { readProjects, writeProjects } from "@/lib/storage";
import { transcodeToWeb } from "@/lib/transcode";

/**
 * Re-encode a project's video and swap the result into the project list.
 *
 * The project stays live throughout, pointing at the original — heavy, but
 * playing. If anything here fails we leave it exactly so: a working heavy
 * video beats a broken entry, and the admin will show it as unoptimized.
 *
 * Returns whether the re-encode landed.
 */
export async function optimizeInPlace(
  projectId: string,
  originalUrl: string
): Promise<boolean> {
  const { put, del } = await import("@vercel/blob");

  let result: Awaited<ReturnType<typeof transcodeToWeb>> = null;
  try {
    result = await transcodeToWeb(originalUrl);
  } catch (error) {
    console.error("transcode failed:", error);
  }

  const base = `videos/${projectId}`;
  const patch: Record<string, unknown> = { optimizing: false };

  if (result) {
    const video = await put(`${base}.mp4`, result.video, {
      access: "public",
      contentType: "video/mp4",
      addRandomSuffix: true,
    });
    patch.src = video.url;
    patch.bytes = result.video.byteLength;
    patch.optimized = true;

    if (result.mobile) {
      const m = await put(`${base}-mobile.mp4`, result.mobile, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: true,
      });
      patch.srcMobile = m.url;
      patch.bytesMobile = result.mobile.byteLength;
    }
    if (result.poster) {
      const p = await put(`${base}.jpg`, result.poster, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      });
      patch.poster = p.url;
    }
  } else {
    patch.optimized = false;
  }

  // Read as late as possible: two uploads finishing together would otherwise
  // each write a list that predates the other. This narrows the window rather
  // than closing it — Blob has no compare-and-set — so callers run one at a
  // time rather than in parallel.
  const list = (await readProjects()) ?? [];
  const before = list.find((p) => p.id === projectId);
  const next = list.map((p) => (p.id === projectId ? { ...p, ...patch } : p));
  await writeProjects(next);

  // Only once the new entry is safely written — otherwise a failure between
  // the two would leave the project pointing at a file we just deleted.
  if (result) {
    const replaced = [
      originalUrl,
      patch.srcMobile ? before?.srcMobile : undefined,
      patch.poster ? before?.poster : undefined,
    ];
    const stale = replaced.filter(
      (u): u is string => !!u && u.startsWith("http") && u !== patch.src
    );
    await Promise.all(stale.map((u) => del(u).catch(() => {})));
  }
  return !!result;
}
