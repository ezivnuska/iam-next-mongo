// app/lib/actions/upload.ts

"use client";

export async function uploadFile(file: File): Promise<string | undefined> {
  console.log("actions/upload");
  try {
    if (!file) return undefined;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return (data as any).error || "Failed to upload file";
    }

    // Return url
    return (data as any).url;
  } catch (err) {
    console.error("Upload error:", err);
    return undefined;
  }
}
