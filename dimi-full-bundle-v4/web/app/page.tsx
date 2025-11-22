
"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { Actions } from "@/components/Actions";
import { StudioTools } from "@/components/StudioTools";
import { TrackPanel } from "@/components/TrackPanel";
import { BeatList } from "@/components/BeatList";
import { useEffect, useState } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "@/lib/solana";
import { PublicKey } from "@solana/web3.js";

function useRoles(): number | null {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [roles, setRoles] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      if (!wallet) { setRoles(null); return; }
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);
      try {
        const [pda] = PublicKey.findProgramAddressSync([Buffer.from("user"), wallet.publicKey.toBuffer()], program.programId);
        const u = await program.account.user.fetchNullable(pda);
        setRoles(u ? Number(u.roles) : null);
      } catch { setRoles(null); }
    })();
  }, [wallet, connection]);
  return roles;
}

export default function Page() {
  const { connected } = useWallet();
  const roles = useRoles();
  return (
    <main>
      <header>
        <WalletMultiButton />
        <div style={{marginLeft: 'auto'}}>
          Program: <code>{process.env.NEXT_PUBLIC_PROGRAM_ID}</code>
        </div>
      </header>
      {!connected ? <p>Connect your wallet on <b>devnet</b> to get started.</p> : (
        <>
          <Actions />
          <BeatList />
          <TrackPanel />
          <section>
            <h3>Studio Downloads</h3>
            <StudioTools roles={roles ?? 0} />
          </section>
        </>
      )}
    </main>
  );
}
