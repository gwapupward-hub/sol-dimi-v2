
#!/usr/bin/env node
import fs from "fs";
import crypto from "crypto";
const file = process.argv[2];
if (!file) { console.error("Usage: node compute-hash.js <file>"); process.exit(1); }
const hash = crypto.createHash("sha256");
const stream = fs.createReadStream(file);
stream.on("data", (d)=>hash.update(d));
stream.on("end", ()=>console.log(hash.digest("hex")));
