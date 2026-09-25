import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { optimizeInPlace } from "@/lib/optimize";
import { saveUpload, storageMode } from "@/lib/storage";

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
