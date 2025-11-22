
# dimi-upload-server
Tiny Express server that uploads files to Arweave via Irys (Bundlr) using a devnet Solana keypair.

## Setup
```bash
cp .env.example .env
# Edit SOLANA_SECRET_KEY to your JSON array keypair (devnet) and ensure it has some SOL for funding.
pnpm i
pnpm start
```
**Endpoints**
- `POST /upload` (multipart `file` field, optional `sha256` body) -> `{ uri, sha256, bytes, contentType }`
- `GET /health`
