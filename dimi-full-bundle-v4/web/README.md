
# dimi-web
Next.js app for the dimi Solana MVP.

## Setup
```bash
cp .env.example .env.local
# set NEXT_PUBLIC_PROGRAM_ID to your devnet program id
pnpm i && pnpm dev
```

Open http://localhost:3000. Use **Upload Audio → Arweave** to send a file via the server,
then **Create Beat** to commit the URI + hash on-chain.
