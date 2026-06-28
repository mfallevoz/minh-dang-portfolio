import { isAuthed } from "@/lib/auth";
import { getStoredProjects } from "@/lib/projects";
import { storageMode } from "@/lib/storage";
import LoginForm from "@/components/admin/LoginForm";
import AdminApp from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — Minh Dang", robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAuthed())) {
    return <LoginForm />;
  }
  const projects = await getStoredProjects();
  return <AdminApp initial={projects} mode={storageMode} />;
}
