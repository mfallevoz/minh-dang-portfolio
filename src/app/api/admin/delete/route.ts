import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteUpload } from "@/lib/storage";

// Deletes uploaded files (video + poster) for a removed project.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
  await Promise.all(urls.filter(Boolean).map((u) => deleteUpload(u)));
  return NextResponse.json({ ok: true });
}
