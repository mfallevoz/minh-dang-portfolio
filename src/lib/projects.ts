import "server-only";
import { readProjects, writeProjects, storageMode } from "./storage";
import {
  seedProjects,
  resolveProject,
  type StoredProject,
  type Project,
} from "@/data/projects";

// Raw list (for the admin). Seeds storage on first run.
//
// Resilient by design: a storage read/write failure must NEVER 500 the public
// site. On Vercel the filesystem is read-only, so if Blob isn't connected the
// local backend can't write — we just serve an empty list instead of crashing.
// Demo clips are only seeded in real local dev (not on Vercel).
export async function getStoredProjects(): Promise<StoredProject[]> {
  let existing: StoredProject[] | null = null;
  try {
    existing = await readProjects();
  } catch {
    existing = null;
  }
  if (existing) return existing;

  const onVercel = !!process.env.VERCEL;
  const seed = storageMode === "local" && !onVercel ? seedProjects : [];

  try {
    await writeProjects(seed);
  } catch {
    // Read-only filesystem or storage not configured — serve without persisting.
  }
  return seed;
}

// Resolved list (for the public site — title always present).
export async function getProjects(): Promise<Project[]> {
  return (await getStoredProjects()).map(resolveProject);
}

export async function saveProjects(list: StoredProject[]): Promise<void> {
  await writeProjects(list);
}
