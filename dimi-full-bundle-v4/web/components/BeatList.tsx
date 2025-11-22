
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram, getProgramId } from "@/lib/solana";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { gpaBeatsByOwner } from "@/lib/gpa";
import { u16leBytes } from "@/components/utils";

type BeatRow = { pubkey: PublicKey; title: string; bpm: number; shared: boolean; beatId: number; updatedAt: number };

function findUserPda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], getProgramId());
}
function findBeatPda(owner: PublicKey, beatId: number) {
  return PublicKey.findProgramAddressSync([Buffer.from("beat"), owner.toBuffer(), u16leBytes(beatId)], getProgramId());
}

function decodeBeat(program: any, acc: { account: { data: Buffer }, pubkey: PublicKey }): BeatRow {
  const d = program.coder.accounts.decode("Beat", acc.account.data);
  return {
    pubkey: acc.pubkey,
    title: d.title as string,
    bpm: Number(d.bpm),
    shared: Boolean(d.shared),
    beatId: Number(d.beatId),
    updatedAt: Number(d.updatedAt),
  };
}

function decodeTrack(program: any, buf: Buffer) {
  const t = program.coder.accounts.decode("Track", buf);
  return {
    artist: (t.artist as PublicKey).toBase58?.() || t.artist,
    take: Number(t.take),
    uri: t.uri as string,
    createdAt: Number(t.createdAt),
  };
}

export function BeatList() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [rows, setRows] = useState<BeatRow[]>([]);
  const [tracks, setTracks] = useState<Record<string, Array<{artist: string, take: number, uri: string, createdAt: number}>>>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const provider = useMemo(() => wallet && new AnchorProvider(connection, wallet, {}), [connection, wallet]);
  const program = useMemo(() => provider && getProgram(provider), [provider]);

  async function load() {
    if (!wallet || !program) return;
    setLoading(true);
    try {
      const accs = await gpaBeatsByOwner(connection, wallet.publicKey);
      const list = accs.map(a => decodeBeat(program, a)).sort((a,b)=>b.updatedAt - a.updatedAt);
      setRows(list);
      // fetch tracks for each beat
      const all = await Promise.all(list.map(async (b) => {
        const accounts = await connection.getProgramAccounts(program.programId, {
          filters: [{ memcmp: { offset: 8, bytes: b.pubkey.toBase58() } }], // Track.beat at offset 8
        });
        return [b.pubkey.toBase58(), accounts.map(a => decodeTrack(program, a.account.data))];
      }));
      const map: Record<string, any[]> = {}; all.forEach(([k, v]) => map[k as string] = v as any[]);
      setTracks(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [wallet, program]);

  async function toggleShared(row: BeatRow) {
    if (!wallet || !program) return;
    setStatus(`Toggling shared for ${row.title}...`);
    try {
      await program.methods.beatToggleShared(!row.shared)
        .accounts({ beat: row.pubkey, authority: wallet.publicKey })
        .rpc();
      setStatus("Toggled ✅");
      await load();
    } catch (e:any) {
      setStatus("Toggle failed: " + (e.message ?? e.toString()));
    }
  }

  return (
    <section className="panel">
      <div className="head">
        <h3>My Beats</h3>
        <button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>
      {rows.length === 0 && <p>No beats yet. Create one above.</p>}
      {rows.map((r) => (
        <article key={r.pubkey.toBase58()} className="beat">
          <div className="row">
            <div>
              <div className="title">{r.title}</div>
              <div className="meta">BPM {r.bpm} • Beat ID {r.beatId}</div>
            </div>
            <div className="actions">
              <span className={"badge " + (r.shared ? "on" : "off")}>{r.shared ? "Shared" : "Private"}</span>
              <button onClick={()=>toggleShared(r)}>{r.shared ? "Make Private" : "Share"}</button>
            </div>
          </div>

          <details>
            <summary>Tracks</summary>
            <table>
              <thead><tr><th>Artist</th><th>Take</th><th>URI</th><th>Created</th></tr></thead>
              <tbody>
                {(tracks[r.pubkey.toBase58()] || []).map((t, i) => (
                  <tr key={i}>
                    <td><code>{t.artist.slice(0,4)}…{t.artist.slice(-4)}</code></td>
                    <td>{t.take}</td>
                    <td className="uri"><a href={t.uri} target="_blank" rel="noreferrer">{t.uri.slice(0,40)}…</a></td>
                    <td>{new Date(t.createdAt * 1000).toLocaleString()}</td>
                  </tr>
                ))}
                {(!tracks[r.pubkey.toBase58()] || tracks[r.pubkey.toBase58()].length===0) && (
                  <tr><td colSpan={4}><em>No tracks yet.</em></td></tr>
                )}
              </tbody>
            </table>
          </details>
        </article>
      ))}
      {status && <div className="status">{status}</div>}
      <style jsx>{`
        .panel { padding:12px; border:1px solid #ddd; border-radius:8px; display:grid; gap:12px; }
        .head { display:flex; align-items:center; gap:12px; }
        .head h3 { margin: 0; }
        .beat { padding:10px; border:1px solid #eee; border-radius:6px; }
        .row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .title { font-weight:600; }
        .meta { font-size:12px; color:#666; }
        .actions { display:flex; align-items:center; gap:8px; }
        .badge { font-size:12px; padding:2px 6px; border-radius:10px; border:1px solid #ccc; }
        .on { background:#f0fff0; } .off { background:#fffaf0; }
        details { margin-top:8px; }
        table { width:100%; border-collapse: collapse; }
        th, td { border-bottom:1px solid #f0f0f0; text-align:left; padding:6px; font-size:12px; }
        .uri { max-width: 360px; overflow: hidden; text-overflow: ellipsis; }
        .status { font-size:12px; color:#555; }
      `}</style>
    </section>
  );
}
