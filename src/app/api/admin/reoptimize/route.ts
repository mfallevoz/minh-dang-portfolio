import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { optimizeInPlace } from "@/lib/optimize";
import { readProjects, storageMode } from "@/lib/storage";

// TEMPORARY — catch-up for the videos uploaded before the server re-encoded
// anything, which went up as untouched masters. Remove this route, the button
// in the admin and its entry in next.config.mjs once they are all done.

export const maxDuration = 800;
export const runtime = "nodejs";

/**
 * Re-encode one existing project through the same pipeline as a new upload.
 * One project per request, and the admin sends them one after another: each
 * rewrites projects.json, and two at once would each write over the other.
 */
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (storageMode !== "blob") {
    // The encoder fetches the source by URL; local files have none.
    return NextResponse.json(
      { ok: false, error: "Only available in production" },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const project = (await readProjects())?.find((p) => p.id === id);
  if (!project) {
    return NextResponse.json({ ok: false, error: "Unknown project" }, { status: 404 });
  }

  const ok = await optimizeInPlace(project.id, project.src);
  const updated = (await readProjects())?.find((p) => p.id === id);
  return NextResponse.json(
    { ok, project: updated },
    { status: ok ? 200 : 500 }
  );
}
