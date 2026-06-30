import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getStoredProjects, saveProjects } from "@/lib/projects";
import type { StoredProject } from "@/data/projects";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, projects: await getStoredProjects() });
}

export async function PUT(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.projects)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  // Keep only known fields, coerce types. Every text field is optional:
  // empty values become undefined (kept as "" only stays empty → not shown).
  const str = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? undefined : s;
  };
  const clean: StoredProject[] = body.projects.map((p: StoredProject) => ({
    id: String(p.id),
    title: str(p.title),
    client: str(p.client),
    category: str(p.category),
    year:
      p.year === undefined || p.year === null || Number.isNaN(Number(p.year))
        ? undefined
        : Number(p.year),
    src: String(p.src),
    srcMobile: p.srcMobile ? String(p.srcMobile) : undefined,
    poster: p.poster ? String(p.poster) : undefined,
  }));
  await saveProjects(clean);
  return NextResponse.json({ ok: true });
}
