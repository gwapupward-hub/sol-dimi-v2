# dimi — Solana/Anchor scaffold (MVP)

This is a minimal, opinionated starting point to migrate your ICP canister to Solana with Anchor.

## What’s inside
- **Anchor program** at `programs/dimi/src/lib.rs` implementing:
  - `Config`, `User`, `Beat`, `Track` accounts (PDAs)
  - Instructions: `init_config`, `register_user`, `set_roles`, `beat_create`, `beat_update`, `beat_toggle_shared`, `beat_archive`, `track_create`, `track_delete`
- **TypeScript PDA helpers** at `ts-client/pda.ts`
- **Studio downloads (role-gated) UI** at `frontend/components/StudioTools.tsx`
- Placeholder Program ID: `Dimi111...` — replace after deploying to devnet.

## Quick start
```bash
# 1) Install toolchains (Solana CLI + Anchor 0.32.x)
# Visit: https://solana.com/cli and https://book.anchor-lang.com/ for install

# 2) Build
anchor build

# 3) Deploy (devnet)
solana address -k target/deploy/dimi-keypair.json   # copy address
# Edit Anchor.toml -> [programs.devnet].dimi = "<PROGRAM_ID>"
anchor deploy

# 4) Client PDAs
# Use ts-client/pda.ts helpers to derive addresses in your frontend.
```

## PDA seeds
- `Config`: `["config"]`
- `User`: `["user", authority]`
- `Beat`: `["beat", owner, beat_id_u16]`
- `Track`: `["track", beat, artist, take_u16]`

## Feed queries (no custom index)
- **Shared beats**: memcmp at offset `8 + 44` equals `1`
- **Beats by owner**: memcmp at offset `8` equals `owner pubkey`
- **Tracks for beat**: memcmp at offset `8` equals `beat pubkey`

## Studio downloads (hash verify)
Use `frontend/components/StudioTools.tsx`. It shows Windows/macOS installers and allows drag-and-drop hash verification.

## Next steps
- Wire wallet-adapter + Anchor client in your React app.
- Add Bundlr/Irys upload for audio -> store `uri + sha256 + content-type + size` on-chain.
- Replace `Dimi111...` with your real PROGRAM_ID post-deploy.