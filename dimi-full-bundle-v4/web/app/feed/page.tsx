
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { BorshCoder, Idl } from "@coral-xyz/anchor";

const idl: Idl = require("../../idl/dimi.json");
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

// Offsets based on Anchor account layout
const OFFSETS = {
  Beat: { shared: 8 + 44 },  // discriminator (8) + shared at 44
  Track: { beat: 8 },        // discriminator (8) + beat pubkey at 0
};

type BeatCard = {
  pubkey: string;
  title: string;
  bpm: number;
  owner: string;
  uri: string;
  updatedAt: number;
  trackCount?: number;
};

function useCoder() {
  return useMemo(() => new BorshCoder(idl), []);
}

export default function SharedFeedPage() {
  const { connection } = useConnection();
  const coder = useCoder();
  const [items, setItems] = useState<BeatCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    setStatus("Fetching shared beats...");
    try {
      // We can memcmp the 'shared' byte == 1 using base58 encoding of [1]
      const sharedByte = bs58.encode(Uint8Array.from([1]));
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [{ memcmp: { offset: OFFSETS.Beat.shared, bytes: sharedByte } }],
      });
      const beats: BeatCard[] = [];
      for (const acc of accounts) {
        try {
          const b: any = coder.accounts.decode("Beat", acc.account.data);
          beats.push({
            pubkey: acc.pubkey.toBase58(),
            title: String(b.title),
            bpm: Number(b.bpm),
            owner: (b.owner as PublicKey).toBase58?.() || String(b.owner),
            uri: String(b.uri),
            updatedAt: Number(b.updatedAt),
          });
        } catch { /* skip non-Beat accounts, if any */ }
      }
      beats.sort((a,b)=>b.updatedAt - a.updatedAt);
      setItems(beats);

      // Track counts (in parallel)
      setStatus("Counting tracks...");
      const results = await Promise.all(beats.map(async (beat) => {
        const beatPk = new PublicKey(beat.pubkey);
        const trkAccs = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ memcmp: { offset: OFFSETS.Track.beat, bytes: beatPk.toBase58() } }],
        });
        let count = 0;
        for (const a of trkAccs) {
          try { coder.accounts.decode("Track", a.account.data); count++; } catch {}
        }
        return { pubkey: beat.pubkey, count };
      }));
      const counts = new Map(results.map(r => [r.pubkey, r.count]));
      setItems(prev => prev.map(it => ({ ...it, trackCount: counts.get(it.pubkey) || 0 })));

      setStatus("");
    } catch (e:any) {
      setStatus(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{display:'grid', gap:12, padding:20}}>
      <header style={{display:'flex', alignItems:'center', gap:12}}>
        <h2 style={{margin:0}}>Shared Feed</h2>
        <button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        <div style={{marginLeft:'auto'}}>Program: <code>{process.env.NEXT_PUBLIC_PROGRAM_ID}</code></div>
      </header>
      {status && <div style={{fontSize:12, color:"#555"}}>{status}</div>}
      <section style={{display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))'}}>
        {items.map((b) => (
          <article key={b.pubkey} style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
            <div style={{fontWeight:600}}>{b.title}</div>
            <div style={{fontSize:12, color:'#666'}}>BPM {b.bpm} • Owner <code>{b.owner.slice(0,4)}…{b.owner.slice(-4)}</code></div>
            <div style={{fontSize:12}}>Updated: {new Date(b.updatedAt*1000).toLocaleString()}</div>
            <div style={{fontSize:12}}>Tracks: {b.trackCount ?? "…"}</div>
            <a href={b.uri} target="_blank" rel="noreferrer" style={{display:'inline-block', marginTop:8, fontSize:12}}>Open audio URI ↗</a>
            <div style={{fontSize:10, color:'#999', marginTop:6}}>Beat PDA: <code>{b.pubkey.slice(0,8)}…{b.pubkey.slice(-6)}</code></div>
          </article>
        ))}
        {items.length === 0 && !loading && <p>No shared beats yet.</p>}
      </section>
    </main>
  );
}
