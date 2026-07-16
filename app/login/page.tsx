"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const result = mode === "login"
      ? await loginUser({ email: form.email, password: form.password })
      : await registerUser({ email: form.email, password: form.password, name: form.name });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    localStorage.setItem("userId", result.data?.userId ?? "");
    localStorage.setItem("userName", result.data?.name ?? form.email);
    router.replace("/projects/");
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "12px 14px", color: "var(--text)", fontSize: 15, width: "100%",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 60% 0%, #1a0a2e 0%, #0a0a0a 60%)", padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16 }}>▶</div>
          <span style={{ fontSize: 20, fontWeight: 700 }}>CoreCut</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Name</label>
              <input type="text" placeholder="Your name" value={form.name} onChange={set("name")} required style={inputStyle} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Email</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required minLength={6} style={inputStyle} />
          </div>
          {error && <p style={{ background: "rgba(255,59,92,0.12)", border: "1px solid rgba(255,59,92,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--accent)" }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 600, padding: 13, borderRadius: 10, marginTop: 4, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--muted)" }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            style={{ background: "none", color: "var(--accent2)", fontSize: 14, fontWeight: 600, textDecoration: "underline" }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
