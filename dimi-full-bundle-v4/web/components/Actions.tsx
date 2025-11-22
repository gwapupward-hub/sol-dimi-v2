
"use client";
import React, { useMemo, useState } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getProgram, getProgramId } from "@/lib/solana";
import { fixedLenBytes, hexToBytes32, u16leBytes } from "@/components/utils";
import { UploadToArweave } from "@/components/UploadToArweave";

function findUserPda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], getProgramId());
}
function findBeatPda(owner: PublicKey, beatId: number) {
  return PublicKey.findProgramAddressSync([Buffer.from("beat"), owner.toBuffer(), u16leBytes(beatId)], getProgramId());
}

export function Actions() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [roles, setRoles] = useState<number | null>(null);
  const [userDisplayName, setUserDisplayName] = useState("dimi-user");
  const [producer, setProducer] = useState(true);
  const [artist, setArtist] = useState(true);
  const [status, setStatus] = useState("");

  const provider = useMemo(() => wallet && new AnchorProvider(connection, wallet, {}), [connection, wallet]);
  const program = useMemo(() => provider && getProgram(provider), [provider]);

  async function refreshRoles() {
    if (!publicKey || !program) return;
    try {
      const [userPda] = findUserPda(publicKey);
      const user = await program.account.user.fetchNullable(userPda);
      setRoles(user ? Number(user.roles) : null);
    } catch {
      setRoles(null);
    }
  }

  async function registerUser() {
    if (!publicKey || !program) return;
    const [userPda] = findUserPda(publicKey);
    const mask = (producer ? 2 : 0) | (artist ? 4 : 0);
    try {
      setStatus("Registering user...");
      await program.methods.registerUser(userDisplayName, mask)
        .accounts({ user: userPda, authority: publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      setStatus("User registered ✅");
      await refreshRoles();
    } catch (e:any) {
      setStatus("Register failed: " + (e.message ?? e.toString()));
    }
  }

  // Create Beat (supports UploadToArweave)
  const [beatTitle, setBeatTitle] = useState("My Beat");
  const [bpm, setBpm] = useState(90);
  const [musicalKey, setMusicalKey] = useState("Cmaj"); // store as 8 bytes
  const [uri, setUri] = useState("");
  const [hashHex, setHashHex] = useState("");
  const [byteLen, setByteLen] = useState(0);
  const [beatIdPreview, setBeatIdPreview] = useState<number | null>(null);

  async function createBeat() {
    if (!publicKey || !program) return;
    try {
      setStatus("Fetching user to get next_beat_id...");
      const [userPda] = findUserPda(publicKey);
      const user = await program.account.user.fetch(userPda);
      const next = Number(user.nextBeatId);
      setBeatIdPreview(next);
      const [beatPda] = findBeatPda(publicKey, next);

      setStatus("Creating beat...");
      await program.methods.beatCreate(
        beatTitle,
        bpm,
        fixedLenBytes(musicalKey, 8),
        [], // tags
        uri,
        hexToBytes32(hashHex),
        fixedLenBytes("audio/mpeg", 16),
        byteLen
      ).accounts({ user: userPda, beat: beatPda, authority: publicKey, systemProgram: SystemProgram.programId }).rpc();
      setStatus(`Beat #${next} created ✅`);
    } catch (e:any) {
      setStatus("Create beat failed: " + (e.message ?? e.toString()));
    }
  }

  return (
    <div className="actions">
      <div className="card">
        <h3>1) User</h3>
        <button onClick={refreshRoles}>Check my User</button>
        <div>Current roles: {roles === null ? "(none)" : roles}</div>
        <div style={{marginTop:8}}>
          <input value={userDisplayName} onChange={e=>setUserDisplayName(e.target.value)} placeholder="Display name" />
          <label><input type="checkbox" checked={producer} onChange={e=>setProducer(e.target.checked)} /> Producer</label>
          <label><input type="checkbox" checked={artist} onChange={e=>setArtist(e.target.checked)} /> Artist</label>
          <button onClick={registerUser}>Register</button>
        </div>
      </div>

      <div className="card">
        <h3>2) Upload Audio → Arweave</h3>
        <UploadToArweave onUploaded={(r)=>{ setUri(r.uri); setHashHex(r.sha256); setByteLen(r.bytes); }} />
        <div className="hint">Server returns a permanent Arweave URI + hash + size.</div>
      </div>

      <div className="card">
        <h3>3) Create Beat</h3>
        <input value={beatTitle} onChange={e=>setBeatTitle(e.target.value)} placeholder="Title" />
        <input type="number" value={bpm} onChange={e=>setBpm(parseInt(e.target.value||"0"))} placeholder="BPM" />
        <input value={musicalKey} onChange={e=>setMusicalKey(e.target.value)} placeholder="Key (e.g., Cmaj)" />
        <input value={uri} onChange={e=>setUri(e.target.value)} placeholder="Arweave URI" />
        <input value={hashHex} onChange={e=>setHashHex(e.target.value)} placeholder="SHA-256 hex (64 chars)" />
        <input type="number" value={byteLen} onChange={e=>setByteLen(parseInt(e.target.value||"0"))} placeholder="Byte length" />
        <button onClick={createBeat}>Create Beat</button>
        {beatIdPreview !== null && <div>New beat id will be: {beatIdPreview}</div>}
      </div>

      <style jsx>{`
        .actions { display:grid; gap:16px; }
        .card { padding:12px; border:1px solid #ddd; border-radius:8px; }
        input { display:block; margin:6px 0; padding:6px; width: 100%; max-width: 420px; }
        label { margin-right: 12px; }
        .hint { font-size:12px; color:#555; }
      `}</style>
    </div>
  );
}
