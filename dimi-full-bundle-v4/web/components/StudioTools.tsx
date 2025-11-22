"use client";
import React, { useState } from "react";

const LINKS = {
  win: "/downloads/Cakewalk_Product_Center_Setup_1.0.0.096.exe",
  mac: "/downloads/Cakewalk_Product_Center_1.0.0.096.pkg",
};
const META = {
  win: { size: "27.49 MB", sha256: "d4d2534c879b1f6141f2587ec92a157b6a7b498414ef8952e3daef82a0a1f35f" },
  mac: { size: "4.60 MB",  sha256: "2f554cf81ba61e66f9fb0aea66b9efcd18ac41c5a49a7590bf4a30011d2f992b" },
};

const ROLE = { Admin: 1, Producer: 2, Artist: 4 };
const canSeeStudio = (roles: number) => (roles & (ROLE.Producer | ROLE.Artist)) !== 0;

async function sha256(file: File) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
}

export function StudioTools({ roles }: { roles: number }) {
  if (!canSeeStudio(roles)) return null;

  const [verify, setVerify] = useState<{os?: "win"|"mac", ok?: boolean, actual?: string}>({});
  const onDrop = async (os: "win"|"mac", file?: File) => {
    if (!file) return;
    const actual = await sha256(file);
    setVerify({ os, ok: actual === META[os].sha256, actual });
  };
  const os = navigator.userAgent.toLowerCase().includes("mac") ? "mac" : "win";

  return (
    <section className="studio-tools">
      <h3>Recording Studio — Tools</h3>
      <p>Install Cakewalk Product Center to manage the DAW and plugins.</p>
      <div className="download-cards">
        {(["win","mac"] as const).map((k) => (
          <article key={k} className={`card ${os === k ? "primary" : ""}`}>
            <h4>{k === "win" ? "Windows" : "macOS"}</h4>
            <a className="btn" href={LINKS[k]} download>
              {os === k ? "Download (Recommended)" : "Download"}
            </a>
            <small>Size: {META[k].size}</small><br />
            <small>SHA-256: <code>{META[k].sha256.slice(0,12)}…</code></small>
            <div className="drop" onDragOver={(e)=>e.preventDefault()}
                 onDrop={(e)=>{ e.preventDefault(); onDrop(k, e.dataTransfer.files?.[0]); }}>
              Drop downloaded file here to verify
            </div>
            {verify.os===k && (
              <div className={`badge ${verify.ok ? "ok":"bad"}`}>
                {verify.ok ? "Verified ✓" : `Hash mismatch: ${verify.actual?.slice(0,12)}…`}
              </div>
            )}
          </article>
        ))}
      </div>
      <style jsx>{`
        .download-cards { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); }
        .card { padding:12px; border:1px solid #ddd; border-radius:8px; }
        .card.primary { border-width:2px; }
        .btn { display:inline-block; margin:8px 0; padding:8px 12px; border:1px solid #ccc; border-radius:6px; text-decoration:none; }
        .drop { margin-top:8px; padding:10px; border:1px dashed #aaa; border-radius:6px; font-size:12px; text-align:center; }
        .badge { margin-top:6px; font-size:12px; }
        .ok { color:green } .bad { color:#b00 }
      `}</style>
    </section>
  );
}