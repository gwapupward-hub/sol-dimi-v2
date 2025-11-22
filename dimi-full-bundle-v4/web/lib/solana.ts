
"use client";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";

export function getConnection(): Connection {
  const url = process.env.NEXT_PUBLIC_RPC || clusterApiUrl("devnet");
  return new Connection(url, "confirmed");
}

export function getProgramId(): PublicKey {
  return new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
}

export function getProgram(provider: AnchorProvider): Program {
  const idl: Idl = require("../idl/dimi.json");
  return new Program(idl as any, getProgramId(), provider);
}
