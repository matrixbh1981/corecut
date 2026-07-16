"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { listProjects, uploadFile, getPlanStatus } from "../../lib/api";
import type { Project } from "../../lib/api";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<{ plan: string; remaining: number | null; canExport: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const uid = localStorage.getItem("userId") ?? "";
    const uname = localStorage.getItem("userName") ?? "User";
    if (!uid) { router.replace("/login/"); return; }
    setUserId(uid); setUserName(uname);
    Promise.all([
      listProjects(uid).then(r => { if (r.data) setProjects(r.data); }),
      getPlanStatus(uid).then(r => { if (r.data) setPlan(r.data); }),
    ]).finally(() => setLoading(false));
  }, [router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const result = await uploadFile({ file, userId });
    setUploading(false);
    if (result.error) { setError(result.error); return; }
    router.push(`/editor/${result.data?.projectId}/`);
  }

  const sc: Record<string, string> = { uploaded: "#3b82f6", processing: "#f59e0b", done: "#22c55e", rendered: "#22c55e", error: "#ef4444" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 60, background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700 }}>
          <div style={{ width: 30, height: 30, background: "var(--accent)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff" }}>▶</div>
          CoreCut
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {plan && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: plan.plan === "pro" ? "rgba(124,58,237,0.2)" : "var(--surface2)", color: plan.plan === "pro" ? "#a78bfa" : "var(--muted)", border: plan.plan === "pro" ? "1px solid var(--accent2)" : "1px solid var(--border)", textTransform: "uppercase" }}>
              {plan.plan === "pro" ? "⭐ Pro" : `Free · ${plan.remaining ?? 0} exports left`}
            </span>
          )}
          <span style={{ fontSize: 14, color: "var(--muted)" }}>{userName}</span>
          <button onClick={() => { localStorage.clear(); router.replace("/login/"); }}
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 13, padding: "6px 14px", borderRadius: 8 }}>
            Log out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, flex: 1 }}>My Projects</h1>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, padding: "10px 20px", borderRadius: 10, opacity: uploading ? 0.6 : 1 }}>
            {uploading ? "Uploading…" : "+ New Project"}
          </button>
          <input ref={fileRef} type="file" accept="video/*,image/*" style={{ display: "none" }} onChange={handleUpload} />
        </div>

        {error && <p style={{ background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--accent)", marginBottom: 20 }}>{error}</p>}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: 60 }}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎬</div>
            <p style={{ color: "var(--muted)" }}>No projects yet — upload a video to start</p>
            <button onClick={() => fileRef.current?.click()}
              style={{ marginTop: 20, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, padding: "10px 20px", borderRadius: 10 }}>
              + Upload your first video
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {projects.map(p => (
              <div key={p.project_id} onClick={() => router.push(`/editor/${p.project_id}/`)}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
                <div style={{ position: "relative", aspectRatio: "16/9", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.video_url
                    ? <video src={p.video_url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 36 }}>🎬</span>}
                  <span style={{ position: "absolute", bottom: 8, right: 8, fontSize: 11, fontWeight: 700, color: "#fff", padding: "3px 8px", borderRadius: 20, background: sc[p.status] ?? "#555", textTransform: "uppercase" }}>
                    {p.status}
                  </span>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "Untitled"}</p>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
