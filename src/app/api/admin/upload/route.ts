import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { readProjects, saveUpload, storageMode, writeProjects } from "@/lib/storage";
import { transcodeToWeb } from "@/lib/transcode";

// The re-encode happens inside onUploadCompleted, so this route has to outlive
// the browser that started it. Pro allows 800s; a fifteen-second film takes
// well under a minute, the headroom is for longer pieces.
export const maxDuration = 800;
export const runtime = "nodejs";

// Sanitize a filename to a safe slug, keeping the extension.
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const base =
    (dot >= 0 ? name.slice(0, dot) : name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "upload";
  return `${base}-${Date.now().toString(36)}${ext}`;
}

/**
 * Re-encode a freshly uploaded master and swap it into the project list.
 *
 * The project is already live at this point, pointing at the original — heavy,
 * but playing. If anything here fails we leave it exactly so: a working heavy
 * video beats a broken entry, and the admin will show it as unoptimized.
 */
async function optimizeInPlace(projectId: string, originalUrl: string) {
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
  // than closing it — Blob has no compare-and-set — but uploads are sequential
  // in the admin, so in practice they do not overlap.
  const list = (await readProjects()) ?? [];
  const next = list.map((p) => (p.id === projectId ? { ...p, ...patch } : p));
  await writeProjects(next);

  // Only once the new entry is safely written — otherwise a failure between
  // the two would leave the project pointing at a file we just deleted.
  if (result && patch.src !== originalUrl) {
    await del(originalUrl).catch(() => {});
  }
}

export async function POST(req: Request) {
  // ── Production (Vercel Blob): client-upload token endpoint ──
  if (storageMode === "blob") {
    try {
      const body = await req.json();
      const { handleUpload } = await import("@vercel/blob/client");

      const json = await handleUpload({
        body,
        request: req,
        // Auth is enforced here (the upload-completed callback from Vercel has
        // no session cookie, so we must NOT gate the whole route with isAuthed).
        // No content-type whitelist: the admin is already password-protected,
        // and originals can be .mov / .m4v / .webm, etc.
        onBeforeGenerateToken: async (_pathname, clientPayload) => {
          if (!(await isAuthed())) throw new Error("Unauthorized");
          return {
            addRandomSuffix: true,
            // The function re-encodes through /tmp, which is small. A master
            // much larger than this has nowhere to land, and at fifteen
            // seconds a clip has no business being this big anyway.
            maximumSizeInBytes: 200 * 1024 * 1024,
            // Carries the project id so the callback — which has no session
            // and no request context — knows which entry to replace.
            tokenPayload: clientPayload ?? undefined,
          };
        },
        // Vercel calls this server-side once the browser has finished sending,
        // so everything below survives the tab being closed.
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          const projectId = tokenPayload || "";
          if (!projectId) return; // a poster or mobile file, not a master
          await optimizeInPlace(projectId, blob.url);
        },
      });
      return NextResponse.json(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("Blob upload error:", message);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // ── Dev (local files): receive the file as multipart and write it ──
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const name = safeName((form.get("name") as string) || file.name || "upload");
  const url = await saveUpload(Buffer.from(await file.arrayBuffer()), name);
  return NextResponse.json({ url });
}
