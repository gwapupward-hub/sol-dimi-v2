import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("Dimi111111111111111111111111111111111111111");

export const findConfigPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);

export const findUserPda = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("user"), authority.toBuffer()], PROGRAM_ID);

export const u16le = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
};

export const findBeatPda = (owner: PublicKey, beatId: number) =>
  PublicKey.findProgramAddressSync([Buffer.from("beat"), owner.toBuffer(), u16le(beatId)], PROGRAM_ID);

export const findTrackPda = (beat: PublicKey, artist: PublicKey, take: number) =>
  PublicKey.findProgramAddressSync([Buffer.from("track"), beat.toBuffer(), artist.toBuffer(), u16le(take)], PROGRAM_ID);