"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProject, generateCaptions, removeBackground, generateTTS, stylizeVideo, renderVideo, listAudioTracks } from "../../../lib/api";
import type { Project, AudioTrack } from "../../../lib/api";

export function generateStaticParams() { return []; }

type Panel = "captions" | "tts" | "bg" | "style" | "audio" | "render" | null;

export default function EditorPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [lang, setLang] = useState("en");
  const [ttsText, setTtsText] = useState("");
  const [voice, setVoice] = useState("nova");
  const [style, setStyle] = useState<"anime" | "3d" | "neon">("anime");
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const uid = localStorage.getItem("userId") ?? "";
    if (!uid) { router.replace("/login/"); return; }
    setUserId(uid);
    if (projectId) {
      setLoading(true);
      getProject(projectId).then(r => { setLoading(false); if (r.data) setProject(r.data); });
    }
  }, [projectId, router]);

  const notify = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };
  const reload = () => getProject(projectId).then(r => { if (r.data) setProject(r.data); });

  async function openPanel(p: Panel) {
    setPanel(panel === p ? null : p);
    if (p === "audio" && tracks.length === 0) { const r = await listAudioTracks(); if (r.data) setTracks(r.data); }
  }

  async function runCaptions() { setBusy(true); const r = await generateCaptions({ projectId, userId, language: lang }); setBusy(false); if (r.error) notify(r.error, false); else { notify("Captions started — ~30s"); reload(); } }
  async function runTTS() { if (!ttsText.trim()) { notify("Enter some text", false); return; } setBusy(true); const r = await generateTTS({ projectId, userId, text: ttsText, voice }); setBusy(false); if (r.error) notify(r.error, false); else { notify("Voiceover generated!"); reload(); } }
  async function runBg() { setBusy(true); const r = await removeBackground({ projectId, userId }); setBusy(false); if (r.error) notify(r.error, false); else { notify("Background removed!"); reload(); } }
  async function runStyle() { setBusy(true); const r = await stylizeVideo({ projectId, userId, style }); setBusy(false); if (r.error) notify(r.error, false); else { notify(`Stylized as ${style}!`); reload(); } }
  async function runRender() {
    if (!project?.video_url) { notify("No source video", false); return; }
    setBusy(true);
    const r = await renderVideo({ projectId, userId, edit: { clips: [{ asset: { type: "video", src: project.video_url }, start: 0, length: 15 }], output: { format: "mp4", resolution: "hd" } } });
    setBusy(false);
    if (r.error) notify(r.error, false); else { notify("Render complete! Download ready."); reload(); }
  }

  const ft = tracks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.tags ?? "").toLowerCase().includes(search.toLowerCase()));

  const inp: React.CSSProperties = { background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%" };
  const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" };
  const btn = (bg = "var(--accent2)", disabled = false): React.CSSProperties => ({ background: bg, color: "#fff", fontSize: 14, fontWeight: 600, padding: "11px 0", borderRadius: 9, width: "100%", opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" });

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 18 }}>Loading…</div>;
  if (!project) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Project not found.</div>;

  const sc: Record<string, string> = { done: "#14532d", processing: "#451a03", error: "#450a0a", uploaded: "#1e3a5f", rendered: "#14532d" };
  const st: Record<string, string> = { done: "#4ade80", processing: "#fbbf24", error: "#f87171", uploaded: "#60a5fa", rendered: "#4ade80" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 20px", height: 56, background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 20 }}>
        <button onClick={() => router.push("/projects/")} style={{ background: "none", color: "var(--muted)", fontSize: 14, padding: "6px 10px", borderRadius: 8 }}>← Projects</button>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title || "Untitled"}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", background: sc[project.status] ?? "#333", color: st[project.status] ?? "#888" }}>{project.status}</span>
        {project.render_url && <a href={project.render_url} target="_blank" rel="noreferrer" style={{ background: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 600, padding: "7px 16px", borderRadius: 8 }}>⬇ Download</a>}
      </header>

      {msg && <div style={{ position: "fixed", top: 68, left: "50%", transform: "translateX(-50%)", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 100, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", background: msg.ok ? "#14532d" : "#450a0a", color: msg.ok ? "#86efac" : "#fca5a5", border: `1px solid ${msg.ok ? "#22c55e" : "#ef4444"}` }}>{msg.text}</div>}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <section style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {project.render_url ? <video src={project.render_url} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : project.stylized_video_url ? <video src={project.stylized_video_url} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : project.video_url ? <video src={project.video_url} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <div style={{ color: "var(--muted)", fontSize: 16 }}>No video yet</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {project.captions && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}><p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Captions</p><p style={{ fontSize: 13 }}>{project.captions.slice(0, 100)}…</p></div>}
            {project.tts_audio_url && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}><p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Voiceover</p><audio src={project.tts_audio_url} controls style={{ width: "100%", height: 36 }} /></div>}
            {project.no_bg_image_url && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}><p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Background Removed</p><img src={project.no_bg_image_url} alt="cutout" style={{ maxHeight: 120, borderRadius: 6 }} /></div>}
          </div>
        </section>

        <aside style={{ width: 300, minWidth: 260, borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 8px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            {([["captions", "CC", "Auto Captions"], ["tts", "🎙", "Text to Speech"], ["bg", "✂", "Remove Background"], ["style", "🎨", "Stylize Video"], ["audio", "♪", "Audio Library"], ["render", "⬆", "Export & Render"]] as [Panel, string, string][]).map(([id, icon, title]) => (
              <button key={id} onClick={() => openPanel(id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: panel === id ? "rgba(124,58,237,0.15)" : "none", color: panel === id ? "var(--accent2)" : "var(--muted)", fontSize: 13, fontWeight: 500, textAlign: "left" }}>
                <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{icon}</span>
                <span>{title}</span>
              </button>
            ))}
          </div>

          {panel && (
            <div style={{ flex: 1, padding: "20px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {panel === "captions" && <>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Auto Captions</h2>
                <label style={lbl}>Language</label>
                <select value={lang} onChange={e => setLang(e.target.value)} style={inp}>
                  {[["en", "English"], ["ar", "Arabic"], ["fr", "French"], ["es", "Spanish"], ["de", "German"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button style={btn("var(--accent2)", busy)} disabled={busy} onClick={runCaptions}>{busy ? "Processing…" : "Generate Captions"}</button>
                {project.captions && <pre style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--muted)", whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto" }}>{project.captions}</pre>}
              </>}

              {panel === "tts" && <>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Text to Speech</h2>
                <label style={lbl}>Script</label>
                <textarea value={ttsText} onChange={e => setTtsText(e.target.value)} placeholder="Your voiceover script…" rows={5} style={{ ...inp, resize: "vertical" }} />
                <label style={lbl}>Voice</label>
                <select value={voice} onChange={e => setVoice(e.target.value)} style={inp}>
                  {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <button style={btn("var(--accent2)", busy)} disabled={busy} onClick={runTTS}>{busy ? "Generating…" : "Generate Voiceover"}</button>
                {project.tts_audio_url && <audio src={project.tts_audio_url} controls style={{ width: "100%", height: 36 }} />}
              </>}

              {panel === "bg" && <>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Remove Background</h2>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Removes background from your source image using AI.</p>
                <button style={btn("var(--accent2)", busy)} disabled={busy} onClick={runBg}>{busy ? "Processing…" : "Remove Background"}</button>
                {project.no_bg_image_url && <img src={project.no_bg_image_url} alt="cutout" style={{ width: "100%", borderRadius: 8, marginTop: 8 }} />}
              </>}

              {panel === "style" && <>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Stylize Video</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {(["anime", "3d", "neon"] as const).map(s => (
                    <button key={s} onClick={() => setStyle(s)}
                      style={{ background: style === s ? "rgba(124,58,237,0.2)" : "var(--surface2)", border: `1px solid ${style === s ? "var(--accent2)" : "var(--border)"}`, borderRadius: 8, padding: "10px 6px", color: style === s ? "var(--text)" : "var(--muted)", fontSize: 13, fontWeight: 500 }}>
                      {s === "anime" ? "🌸 Anime" : s === "3d" ? "💠 3D" : "⚡ Neon"}
                    </button>
                  ))}
                </div>
                <button style={btn("var(--accent2)", busy)} disabled={busy} onClick={runStyle}>{busy ? "Stylizing…" : `Apply ${style} Style`}</button>
                {project.stylized_video_url && <video src={project.stylized_video_url} controls style={{ width: "100%", borderRadius: 8, marginTop: 8 }} />}
              </>}

              {panel === "audio" && <>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Audio Library</h2>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tracks…" style={inp} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 340 }}>
                  {ft.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 20 }}>No tracks yet.</p>}
                  {ft.map(t => (
                    <div key={t.track_id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</p>
                      <p style={{ fontSize: 12, color: "var(--muted)" }}>{t.artist} · {t.duration_sec}s · {t.category}</p>
                      {t.file_url && <audio src={t.file_url} controls style={{ width: "100%", height: 30 }} />}
                    </div>
                  ))}
                </div>
              </>}

              {panel === "render" && <>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Export & Render</h2>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Renders HD MP4 via Shotstack (~30–60 seconds).</p>
                <button style={btn("var(--accent2)", busy)} disabled={busy} onClick={runRender}>{busy ? "Rendering…" : "Start Render"}</button>
                {project.render_url && <>
                  <a href={project.render_url} target="_blank" rel="noreferrer" style={{ background: "#22c55e", color: "#fff", fontSize: 14, fontWeight: 600, padding: 10, borderRadius: 8, textAlign: "center", display: "block", marginTop: 8 }}>⬇ Download Video</a>
                  <video src={project.render_url} controls style={{ width: "100%", borderRadius: 8, marginTop: 8 }} />
                </>}
              </>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
