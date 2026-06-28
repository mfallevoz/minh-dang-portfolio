import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { saveUpload, storageMode } from "@/lib/storage";

// Sanitize a filename to a safe slug, keeping the extension.
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "upload";
  return `${base}-${Date.now().toString(36)}${ext}`;
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // ── Production (Vercel Blob): act as the client-upload token endpoint ──
  if (storageMode === "blob") {
    const body = await req.json();
    const { handleUpload } = await import("@vercel/blob/client");
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        addRandomSuffix: true,
        allowedContentTypes: ["video/mp4", "image/jpeg", "image/png"],
      }),
      onUploadCompleted: async () => {
        /* nothing to do — the client saves the URL into the project list */
      },
    });
    return NextResponse.json(json);
  }

  // ── Dev (local files): receive the file as multipart and write it ──
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  }
  const name = safeName((form.get("name") as string) || file.name || "upload");
  const url = await saveUpload(Buffer.from(await file.arrayBuffer()), name);
  return NextResponse.json({ ok: true, url });
}
