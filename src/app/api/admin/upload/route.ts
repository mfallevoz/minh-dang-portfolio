import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { saveUpload, storageMode } from "@/lib/storage";

function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "upload";
  return `${base}-${Date.now().toString(36)}${ext}`;
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // ── Mode Production (Vercel Blob) ──
  if (storageMode === "blob") {
    try {
      const body = await req.json();
      const { handleUpload } = await import("@vercel/blob/client");
      
      const json = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          addRandomSuffix: true,
          allowedContentTypes: [
            "video/mp4", 
            "video/quicktime", 
            "video/webm",
            "image/jpeg", 
            "image/png"
          ],
          maximumSizeInMB: 500,
        }),
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(json);
    } catch (error) {
      console.error("Erreur Blob:", error);
      // Si on est en local et que Blob échoue, on ne veut pas bloquer, 
      // mais en prod, on doit renvoyer l'erreur.
      return NextResponse.json({ error: "Upload failed" }, { status: 400 });
    }
  }

  // ── Mode Développement Local ──
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const name = safeName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // CORRECTION ICI : on envoie le buffer en premier, puis le nom
  await saveUpload(buffer, name); 

  return NextResponse.json({ url: `/videos/${name}` });
}