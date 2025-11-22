"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "@/lib/solana";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { gpaAllBeats, gpaBeatsByOwner, gpaTracksForBeatArtist } from "@/lib/gpa";
import bs58 from "bs58";
import { UploadToArweave } from "@/components/UploadToArweave";
import { fixedLenBytes, hexToBytes32, u16leBytes } from "@/components/utils";
import { getProgramId } from "@/lib/solana";

type BeatRow = { pubkey: PublicKey; owner: string; title: string; bpm: number; shared: boolean };
type TrackRow = { take: number };

function decodeBeat(program: any, acc: { account: { data: Buffer }, pubkey: PublicKey }): BeatRow {
  const decoded = program.coder.accounts.decode("Beat", acc.account.data);
  return {
    pubkey: acc.pubkey,
    owner: (decoded.owner as PublicKey).toBase58?.() || decoded.owner,
    title: decoded.title as string,
    bpm: Number(decoded.bpm),
    shared: Boolean(decoded.shared),
  };
}
function decodeTrack(program: any, acc: { account: { data: Buffer } }): TrackRow {
  const decoded = program.coder.accounts.decode("Track", acc.account.data);
  return { take: Number(decoded.take) };
}

function findBeatPda(owner: PublicKey, beatId: number) {
  return PublicKey.findProgramAddressSync([Buffer.from("beat"), owner.toBuffer(), u16leBytes(beatId)], getProgramId());
}
function findUserPda(authority: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], getProgramId());
}
function findTrackPda(beat: PublicKey, artist: PublicKey, take: number) {
  return PublicKey.findProgramAddressSync([Buffer.from("track"), beat.toBuffer(), artist.toBuffer(), u16leBytes(take)], getProgramId());
}

export function TrackPanel() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [beatsMine, setBeatsMine] = useState<BeatRow[]>([]);
  const [beatsShared, setBeatsShared] = useState<BeatRow[]>([]);
  const [selectedBeat, setSelectedBeat] = useState<string>("");
  const [status, setStatus] = useState("");
  const [uri, setUri] = useState(""); const [sha256, setSha256] = useState(""); const [bytes, setBytes] = useState(0);
  const [take, setTake] = useState<number | null>(null);

  const provider = useMemo(() => wallet && new AnchorProvider(connection, wallet, {}), [connection, wallet]);
  const program = useMemo(() => provider && getProgram(provider), [provider]);

  useEffect(() => {
    (async () => {
      if (!wallet || !program) return;
      // My beats
      const mineAccs = await gpaBeatsByOwner(connection, wallet.publicKey);
      const mine = mineAccs.map(a => decodeBeat(program, a));
      setBeatsMine(mine);
      // All beats → then filter shared client-side (simpler than bs58 bool filter)
      const allAccs = await gpaAllBeats(connection);
      const all = allAccs.map(a => decodeBeat(program, a));
      setBeatsShared(all.filter(b => b.shared));
    })();
  }, [wallet, program, connection]);

  async function suggestNextTake(beatPubkey: PublicKey) {
    if (!wallet || !program) return;
    const trks = await gpaTracksForBeatArtist(connection, beatPubkey, wallet.publicKey);
    const takes = trks.map(a => decodeTrack(program, a).take);
    const next = (takes.length ? Math.max(...takes) + 1 : 0);
    setTake(next);
  }

  async function createTrack() {
    if (!wallet || !program || !selectedBeat) return;
    try {
      setStatus("Preparing...");
      const beatPk = new PublicKey(selectedBeat);
      if (take === null) await suggestNextTake(beatPk);
      const finalTake = take ?? 0;
      const [userPda] = findUserPda(wallet.publicKey);
      const [trackPda] = findTrackPda(beatPk, wallet.publicKey, finalTake);

      setStatus("Creating track...");
      await program.methods.trackCreate(finalTake, uri, hexToBytes32(sha256), fixedLenBytes("audio/mpeg", 16), bytes)
        .accounts({ user: userPda, beat: beatPk, track: trackPda, authority: wallet.publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      setStatus(`Track take ${finalTake} created ✅`);
    } catch (e:any) {
      setStatus("Track create failed: " + (e.message ?? e.toString()));
    }
  }

  return (
    <section className="panel">
      <h3>Record / Upload Track</h3>
      <div className="row">
        <div className="col">
          <h4>Select Beat</h4>
          <label>My Beats</label>
          <select onChange={async e => { setSelectedBeat(e.target.value); await suggestNextTake(new PublicKey(e.target.value)); }} value={selectedBeat}>
            <option value="" disabled>-- choose --</option>
            {beatsMine.map(b => (<option key={b.pubkey.toBase58()} value={b.pubkey.toBase58()}>{b.title} (#{b.pubkey.toBase58().slice(0,4)}…)</option>))}
          </select>
          <label>Shared Beats</label>
          <select onChange={async e => { setSelectedBeat(e.target.value); await suggestNextTake(new PublicKey(e.target.value)); }} value={selectedBeat}>
            <option value="" disabled>-- choose --</option>
            {beatsShared.map(b => (<option key={b.pubkey.toBase58()} value={b.pubkey.toBase58()}>{b.title} — by {b.owner[:4]}…</option>))}
          </select>
        </div>
        <div className="col">
          <h4>Upload Vocal Take → Arweave</h4>
          <UploadToArweave onUploaded={(r)=>{ setUri(r.uri); setSha256(r.sha256); setBytes(r.bytes); }} />
          <small>URI: <code>{uri}</code></small><br/>
          <small>SHA-256: <code>{sha256}</code></small><br/>
          <small>Bytes: <code>{bytes}</code></small>
        </div>
      </div>

      <div className="row">
        <div className="col">
          <label>Take #</label>
          <input type="number" value={take ?? 0} onChange={e=>setTake(parseInt(e.target.value||"0"))} />
          <button disabled={!selectedBeat || !uri} onClick={createTrack}>Create Track</button>
        </div>
      </div>

      <div className="status">{status}</div>

      <style jsx>{`
        .panel { padding:12px; border:1px solid #ddd; border-radius:8px; display:grid; gap:12px; }
        .row { display:grid; gap:12px; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); }
        .col { border:1px dashed #eee; border-radius:6px; padding:8px; }
        select, input { width:100%; padding:6px; margin:6px 0; }
        .status { font-size:12px; color:#555; }
        code { user-select: all; }
      `}</style>
    </section>
  );
}