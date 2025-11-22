
import express from "express";
import multer from "multer";
import cors from "cors";
import crypto from "crypto";
import { Keypair, Connection } from "@solana/web3.js";
import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";

const app = express();
app.use(cors({ origin: true }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: parseInt(process.env.MAX_BYTES || "60000000") } });

function parseSecretKey() {
  const raw = process.env.SOLANA_SECRET_KEY;
  if (!raw) throw new Error("Missing SOLANA_SECRET_KEY");
  try {
    const arr = JSON.parse(raw);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    // try base58
    const bs58 = (await import("bs58")).default;
    return Keypair.fromSecretKey(Uint8Array.from(bs58.decode(raw)));
  }
}

async function getUploader() {
  const kp = parseSecretKey();
  const rpc = process.env.RPC_URL || "https://api.devnet.solana.com";
  return await Uploader(Solana).withWallet(kp.secretKey).withRpc(rpc).devnet();
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send("missing file");
    const expectedHash = (req.body.sha256 || "").toLowerCase();
    const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
    if (expectedHash && expectedHash !== hash) return res.status(400).send("sha256 mismatch");
    const uploader = await getUploader();
    const receipt = await uploader.uploadData(file.buffer, {
      tags: [{ name: "Content-Type", value: file.mimetype || "application/octet-stream" }]
    });
    const uri = `https://arweave.net/${receipt.id}`;
    res.json({ uri, sha256: hash, bytes: file.size, contentType: file.mimetype });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || "upload error");
  }
});

const port = parseInt(process.env.PORT || "8787");
app.listen(port, () => console.log(`Upload server listening on ${port}`));
