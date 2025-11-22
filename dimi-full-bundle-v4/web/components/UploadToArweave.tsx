
"use client";
import React, { useState } from "react";
import { sha256 } from "./utils";

export function UploadToArweave({ onUploaded }: { onUploaded: (r: { uri: string, sha256: string, bytes: number, contentType: string }) => void }) {
  const [status, setStatus] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  async function doUpload() {
    if (!file) return;
    setStatus("Hashing...");
    const hash = await sha256(file);
    setStatus("Uploading to Arweave via server...");
    const form = new FormData();
    form.append("file", file);
    form.append("sha256", hash);
    const res = await fetch((process.env.NEXT_PUBLIC_UPLOAD_API || "http://localhost:8787") + "/upload", {
      method: "POST",
      body: form
    });
    if (!res.ok) { setStatus("Upload failed: " + (await res.text())); return; }
    const json = await res.json();
    setStatus("Uploaded ✅");
    onUploaded(json);
  }

  return (
    <div className="uploader">
      <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
      <button onClick={doUpload} disabled={!file}>Upload</button>
      <div className="status">{status}</div>
      <style jsx>{`
        .uploader { display:flex; gap:8px; align-items:center; }
        .status { font-size:12px; color:#555; }
      `}</style>
    </div>
  );
}
