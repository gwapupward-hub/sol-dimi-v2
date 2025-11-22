import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);

export const OFFSETS = {
  Beat: {
    owner: 8,          // discriminator (8) + owner at 0
    shared: 8 + 44,    // disc + 44
  },
  Track: {
    beat: 8,
    artist: 8 + 32,
  }
} as const;

export async function gpaBeatsByOwner(connection: Connection, owner: PublicKey) {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: OFFSETS.Beat.owner, bytes: owner.toBase58() } }],
  });
  return accounts;
}

export async function gpaAllBeats(connection: Connection) {
  return await connection.getProgramAccounts(PROGRAM_ID);
}

export async function gpaTracksForBeatArtist(connection: Connection, beat: PublicKey, artist: PublicKey) {
  return await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { memcmp: { offset: OFFSETS.Track.beat, bytes: bs58.encode(beat.toBytes()) } },
      { memcmp: { offset: OFFSETS.Track.artist, bytes: artist.toBase58() } },
    ],
  });
}