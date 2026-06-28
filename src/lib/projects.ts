import "server-only";
import { readProjects, writeProjects, storageMode } from "./storage";
import {
  seedProjects,
  resolveProject,
  type StoredProject,
  type Project,
} from "@/data/projects";

// Raw list (for the admin). Seeds storage on first run.
// In dev (local files) we seed the demo clips; in production (Blob) we start
// empty, since the demo files aren't deployed — the cousin uploads from /admin.
export async function getStoredProjects(): Promise<StoredProject[]> {
  const existing = await readProjects();
  if (existing) return existing;
  const seed = storageMode === "blob" ? [] : seedProjects;
  await writeProjects(seed);
  return seed;
}

// Resolved list (for the public site — title always present).
export async function getProjects(): Promise<Project[]> {
  return (await getStoredProjects()).map(resolveProject);
}

export async function saveProjects(list: StoredProject[]): Promise<void> {
  await writeProjects(list);
}
