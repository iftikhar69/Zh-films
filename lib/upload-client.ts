"use client";

export const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp";

export function imageExt(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/jpeg") return "jpg";
  return null;
}

/** PUTs a file to a signed storage URL, reporting progress (0–1). */
export function putWithProgress(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export async function postJson<T = Record<string, unknown>>(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const json = (res ? await res.json().catch(() => ({})) : { error: "Network error" }) as T & { ok?: boolean; error?: string };
  if (!res?.ok || !json.ok) throw new Error(json.error ?? "Request failed");
  return json;
}
