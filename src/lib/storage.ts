import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { StoredProject } from "@/data/projects";

// Two storage backends, picked automatically:
//  • Vercel Blob   → when BLOB_READ_WRITE_TOKEN is set (production on Vercel)
//  • Local files   → otherwise (dev: writes to public/videos + data/projects.json)
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
export const storageMode: "blob" | "local" = useBlob ? "blob" : "local";

const PROJECTS_KEY = "config/projects.json";

// ───────────────────────── Local backend ─────────────────────────
const dataFile = path.join(process.cwd(), "data", "projects.json");
const videosDir = path.join(process.cwd(), "public", "videos");

async function localRead(): Promise<StoredProject[] | null> {
  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8")) as StoredProject[];
  } catch {
    return null;
  }
}
async function localWrite(list: StoredProject[]): Promise<void> {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(list, null, 2), "utf8");
}
async function localSaveUpload(bytes: Buffer, filename: string): Promise<string> {
  await fs.mkdir(videosDir, { recursive: true });
  await fs.writeFile(path.join(videosDir, filename), bytes);
  return `/videos/${filename}`;
}
async function localDeleteUpload(url: string): Promise<void> {
  if (!url.startsWith("/videos/")) return;
  try {
    await fs.unlink(path.join(process.cwd(), "public", url));
  } catch {
    /* already gone */
  }
}

// ───────────────────────── Vercel Blob backend ─────────────────────────
async function blobRead(): Promise<StoredProject[] | null> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: PROJECTS_KEY, limit: 1 });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as StoredProject[];
}
async function blobWrite(list: StoredProject[]): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(PROJECTS_KEY, JSON.stringify(list, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
async function blobDeleteUpload(url: string): Promise<void> {
  const { del } = await import("@vercel/blob");
  try {
    await del(url);
  } catch {
    /* already gone */
  }
}

// ───────────────────────── Public API ─────────────────────────
export async function readProjects(): Promise<StoredProject[] | null> {
  return useBlob ? blobRead() : localRead();
}
export async function writeProjects(list: StoredProject[]): Promise<void> {
  return useBlob ? blobWrite(list) : localWrite(list);
}
// Used by the local backend's upload route. Blob uploads happen client-side.
export async function saveUpload(bytes: Buffer, filename: string): Promise<string> {
  return localSaveUpload(bytes, filename);
}
export async function deleteUpload(url: string): Promise<void> {
  return useBlob ? blobDeleteUpload(url) : localDeleteUpload(url);
}
