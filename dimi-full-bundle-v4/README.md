
# dimi-full-bundle (Monorepo)

This bundle contains everything to run the MVP:
- **anchor/** — Anchor program (Config/User/Beat/Track + instructions)
- **web/** — Next.js app (wallet-adapter, Upload-to-Arweave, Studio downloads w/ hash verify)
- **server/** — Upload server (Express + Irys) to push files to Arweave using a devnet keypair
- **scripts/** — CLI helpers (e.g., SHA-256)

## 0) Prereqs
- Node 18+, pnpm (or npm/yarn)
- Solana CLI + Anchor (for on-chain deploy)
- Devnet SOL in **server** keypair (for Irys funding)

## 1) Deploy program (devnet)
```bash
cd anchor
anchor build
anchor deploy
# copy Program ID -> Anchor.toml [programs.devnet].dimi and web/.env.local
```

## 2) Start the upload server
```bash
cd server
cp .env.example .env
# Put your devnet keypair JSON array into SOLANA_SECRET_KEY
pnpm i
pnpm start
# server on http://localhost:8787
```

## 3) Run the web app
```bash
cd web
cp .env.example .env.local
# set NEXT_PUBLIC_PROGRAM_ID and NEXT_PUBLIC_UPLOAD_API if different
pnpm i
pnpm dev
# open http://localhost:3000
```

## 4) Use it
- Connect wallet → **Register User** (Producer/Artist)
- **Upload Audio → Arweave** (returns URI + SHA-256)
- **Create Beat** to commit metadata on-chain
- **Studio Downloads** available for Producer/Artist roles, with drag-and-drop hash verification

## Verifying installers (CLI)
```bash
node scripts/compute-hash.mjs web/public/downloads/Cakewalk_Product_Center_Setup_1.0.0.096.exe
node scripts/compute-hash.mjs web/public/downloads/Cakewalk_Product_Center_1.0.0.096.pkg
```

## New: Beat List & Toggle
- See your beats and toggle the **shared** flag
- Expand a beat to view all its tracks (with artist, take, URI)

## New: Read-only Shared Feed
- Visit `/feed` to see publicly shared beats and track counts without connecting a wallet.
