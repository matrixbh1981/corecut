const BASE_URL = "https://matrixbh.app.n8n.cloud/webhook";

export interface ApiResponse<T> { data: T | null; error: string | null; status: number; }
export interface AuthResponse { message: string; userId?: string; email?: string; name?: string; }
export interface Project {
  project_id: string; user_id: string; title: string; status: string;
  video_url?: string; processed_video_url?: string; captions?: string;
  tts_audio_url?: string; stylized_video_url?: string; no_bg_image_url?: string;
  render_url?: string; created_at?: string; updated_at?: string;
}
export interface AiJob {
  job_id: string; project_id: string; user_id: string; job_type: string;
  status: string; result_url?: string; error?: string; created_at?: string; updated_at?: string;
}
export interface AudioTrack {
  track_id: string; title: string; artist?: string; category?: string;
  duration_sec?: number; file_url?: string; tags?: string;
}
export interface UploadResponse { message: string; projectId: string; fileUrl: string; fileName: string; }
export interface ShotStackEdit { clips?: object[]; soundtrack?: object; tracks?: object[]; output?: object; }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
      ...options,
    });
    let data: T | null = null; let error: string | null = null;
    try {
      const json = await res.json();
      if (res.ok) data = json as T;
      else error = json?.error ?? json?.message ?? `HTTP ${res.status}`;
    } catch { error = `HTTP ${res.status}`; }
    return { data, error, status: res.status };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Network error", status: 0 };
  }
}

export const registerUser = (p: { email: string; password: string; name: string }) =>
  apiFetch<AuthResponse>("/app-register", { method: "POST", body: JSON.stringify(p) });

export const loginUser = (p: { email: string; password: string }) =>
  apiFetch<AuthResponse>("/app-login", { method: "POST", body: JSON.stringify(p) });

export async function uploadFile(p: { file: File; userId: string; projectId?: string }): Promise<ApiResponse<UploadResponse>> {
  const form = new FormData();
  form.append("file", p.file); form.append("userId", p.userId);
  if (p.projectId) form.append("projectId", p.projectId);
  try {
    const res = await fetch(`${BASE_URL}/app-upload`, { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    if (res.ok) return { data: json as UploadResponse, error: null, status: res.status };
    return { data: null, error: json?.error ?? `HTTP ${res.status}`, status: res.status };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : "Upload failed", status: 0 };
  }
}

export const generateCaptions = (p: { projectId: string; userId: string; language?: string }) =>
  apiFetch<{ message: string; projectId: string; status: string }>("/app-ai-captions", { method: "POST", body: JSON.stringify({ language: "en", ...p }) });

export const removeBackground = (p: { projectId: string; userId: string }) =>
  apiFetch<{ message: string; projectId: string; imageUrl: string }>("/app-ai-remove-bg", { method: "POST", body: JSON.stringify(p) });

export const generateTTS = (p: { projectId: string; userId: string; text: string; voice?: string }) =>
  apiFetch<{ message: string; projectId: string; audioUrl: string }>("/app-ai-tts", { method: "POST", body: JSON.stringify({ voice: "nova", ...p }) });

export const stylizeVideo = (p: { projectId: string; userId: string; style: "anime" | "3d" | "neon" }) =>
  apiFetch<{ message: string; projectId: string; style: string; videoUrl: string }>("/app-ai-stylize", { method: "POST", body: JSON.stringify(p) });

export const renderVideo = (p: { projectId: string; userId: string; edit: ShotStackEdit }) =>
  apiFetch<{ message: string; projectId: string; renderUrl: string }>("/app-render-video", { method: "POST", body: JSON.stringify(p) });

export const listAudioTracks = (p?: { category?: string; search?: string }) => {
  const qs = new URLSearchParams();
  if (p?.category) qs.set("category", p.category);
  if (p?.search) qs.set("search", p.search);
  const q = qs.toString() ? `?${qs}` : "";
  return apiFetch<AudioTrack[]>(`/app-audio-library${q}`, { method: "GET" });
};

export const addAudioTrack = (p: { title: string; artist?: string; category?: string; duration_sec?: number; file_url: string; tags?: string }) =>
  apiFetch<{ message: string; trackId: string }>("/app-audio-library-add", { method: "POST", body: JSON.stringify(p) });

export const listProjects = (userId: string) =>
  apiFetch<Project[]>(`/app-projects?userId=${encodeURIComponent(userId)}`, { method: "GET" });

export const getProject = (projectId: string) =>
  apiFetch<Project>(`/app-project-detail?projectId=${encodeURIComponent(projectId)}`, { method: "GET" });

export const getJobStatus = (jobId: string) =>
  apiFetch<AiJob>(`/app-job-status?jobId=${encodeURIComponent(jobId)}`, { method: "GET" });

export const sendNotification = (p: { userId: string; title: string; message: string }) =>
  apiFetch<{ message: string; logId: string }>("/app-send-notification", { method: "POST", body: JSON.stringify(p) });

export const getPlanStatus = (userId: string) =>
  apiFetch<{ userId: string; plan: string; exportsCount: number; limit: number | null; remaining: number | null; canExport: boolean }>(`/app-plan-status?userId=${encodeURIComponent(userId)}`, { method: "GET" });

export const upgradePlan = (p: { userId: string; plan: "free" | "pro" }) =>
  apiFetch<{ success: boolean; message: string; plan: string }>("/app-plan-upgrade", { method: "POST", body: JSON.stringify(p) });
