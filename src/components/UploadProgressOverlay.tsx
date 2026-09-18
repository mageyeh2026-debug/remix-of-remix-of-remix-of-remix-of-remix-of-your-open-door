import { useCallback, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, AlertTriangle, X } from "lucide-react";

import { uploadToR2 } from "@/lib/r2-upload";
import { normalizeImage } from "@/lib/heic";

export type UploadTask = {
  id: string;
  name: string;
  size: number;
  loaded: number;
  percent: number;
  speed: number; // bytes / second
  status: "uploading" | "done" | "error";
  error?: string;
};

const fmtBytes = (n: number) => {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const fmtTime = (s: number) => {
  if (!isFinite(s) || s <= 0) return "—";
  if (s < 60) return `${Math.ceil(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.ceil(s % 60)}s`;
};

export function useUploader() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const started = useRef<Record<string, number>>({});

  const patch = (id: string, next: Partial<UploadTask>) =>
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, ...next } : t)));

  const upload = useCallback(async (folder: string, input: File[]): Promise<string[]> => {
    const files = await Promise.all(input.map(normalizeImage));
    const items: UploadTask[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      size: f.size,
      loaded: 0,
      percent: 0,
      speed: 0,
      status: "uploading",
    }));
    setTasks(items);
    items.forEach((t) => (started.current[t.id] = Date.now()));

    const urls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const task = items[i]!;
        const url = await uploadToR2(folder, files[i]!, (p) => {
          const elapsed = (Date.now() - (started.current[task.id] ?? Date.now())) / 1000;
          patch(task.id, {
            loaded: p.loaded,
            percent: p.percent,
            speed: elapsed > 0 ? p.loaded / elapsed : 0,
          });
        });
        patch(task.id, { status: "done", percent: 100, loaded: task.size });
        urls.push(url);
      }
      setTimeout(() => setTasks([]), 1200);
      return urls;
    } catch (err: any) {
      const active = items.find((t) => t.status !== "done");
      if (active) patch(active.id, { status: "error", error: err?.message ?? "Upload failed" });
      throw err;
    }
  }, []);

  const overlay = tasks.length ? (
    <UploadOverlay tasks={tasks} onClose={() => setTasks([])} />
  ) : null;

  return { upload, overlay, busy: tasks.some((t) => t.status === "uploading") };
}

function UploadOverlay({ tasks, onClose }: { tasks: UploadTask[]; onClose: () => void }) {
  const total = tasks.reduce((a, t) => a + t.size, 0);
  const loaded = tasks.reduce((a, t) => a + t.loaded, 0);
  const overall = Math.round((loaded / Math.max(1, total)) * 100);
  const failed = tasks.find((t) => t.status === "error");
  const allDone = tasks.every((t) => t.status === "done");
  const current = tasks.find((t) => t.status === "uploading") ?? tasks[tasks.length - 1]!;
  const eta = current.speed > 0 ? (current.size - current.loaded) / current.speed : Infinity;

  const ring = 2 * Math.PI * 54;

  return (
    <div className="uploader-overlay">
      <div className="uploader-card">
        {(allDone || failed) && (
          <button type="button" className="uploader-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        )}

        <div className="uploader-ring">
          <svg viewBox="0 0 120 120">
            <circle className="uploader-ring-bg" cx="60" cy="60" r="54" />
            <circle
              className={`uploader-ring-fg ${failed ? "error" : allDone ? "done" : ""}`}
              cx="60"
              cy="60"
              r="54"
              strokeDasharray={ring}
              strokeDashoffset={ring - (ring * (failed ? 100 : overall)) / 100}
            />
          </svg>
          <div className="uploader-ring-center">
            {failed ? (
              <AlertTriangle size={28} />
            ) : allDone ? (
              <CheckCircle2 size={28} />
            ) : (
              <>
                <strong>{overall}%</strong>
                <span>uploading</span>
              </>
            )}
          </div>
        </div>

        <h3 className="uploader-title">
          {failed ? "Upload failed" : allDone ? "Upload complete" : "Uploading to secure storage"}
        </h3>
        <p className="uploader-sub">
          {failed
            ? failed.error
            : `${fmtBytes(loaded)} of ${fmtBytes(total)} · ${tasks.filter((t) => t.status === "done").length}/${tasks.length} files`}
        </p>

        <ul className="uploader-list">
          {tasks.map((t) => (
            <li key={t.id} className={`uploader-item ${t.status}`}>
              <div className="uploader-item-head">
                <span className="uploader-item-name">
                  <CloudUpload size={14} /> {t.name}
                </span>
                <span className="uploader-item-pct">
                  {t.status === "error" ? "failed" : `${t.percent}%`}
                </span>
              </div>
              <div className="uploader-bar">
                <span style={{ width: `${t.percent}%` }} />
              </div>
              <div className="uploader-item-meta">
                <span>
                  {fmtBytes(t.loaded)} / {fmtBytes(t.size)}
                </span>
                {t.status === "uploading" ? (
                  <span>
                    {fmtBytes(t.speed)}/s · {fmtTime((t.size - t.loaded) / Math.max(1, t.speed))} left
                  </span>
                ) : (
                  <span>{t.status === "done" ? "Saved" : "Error"}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {!allDone && !failed ? (
          <p className="uploader-note">
            Keep this tab open. Large videos upload in parallel chunks and resume automatically if
            the connection drops. {isFinite(eta) ? `About ${fmtTime(eta)} left.` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
