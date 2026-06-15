import https from "https";
import fs from "fs";
import path from "path";
import { readFileSync } from "fs";

function loadEnv() {
  const env = { NODE_ENV: "production", PORT: "3001" };
  try {
    const lines = readFileSync(".env", "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  } catch {}
  return env;
}

const TOKEN = "FlyV1 fm2_lJPECAAAAAAAFGWbxBBK5ZTJbE+Pn2KEWFIQp5uuwrVodHRwczovL2FwaS5mbHkuaW8vdjGWAJLOABliYx8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDzkVVAQu7BK6Ll1pG/8IUGY1cq3VuaYgKd/n1J1hqnjR1ha60OapNf2EbK6IeKUrNiU6Vlq4AwiUC4hWbLETu0B7JAIwi5SkhXZdovh4eWtoRYIJHWIrI+Bjlka5X2J06IDcUEWHo4Rj2HIzo8JsTGkSp4CeZp5QZXXRpeVe9GR8qbX63MV5oNwLtISuA2SlAORgc4BHdUcHwWRgqdidWlsZGVyH6J3Zx8BxCCB7I/NQhO+DCW6TcAEUEb1ihwiP/a9RscMcz0ysLSFWw==,fm2_lJPETu0B7JAIwi5SkhXZdovh4eWtoRYIJHWIrI+Bjlka5X2J06IDcUEWHo4Rj2HIzo8JsTGkSp4CeZp5QZXXRpeVe9GR8qbX63MV5oNwLtISuMQQbM/6h5h2+dDnQtBNjuo95cO5aHR0cHM6Ly9hcGkuZmx5LmlvL2FhYS92MZgEks5qHRILzwAAAAEmFTApF84AGFFjCpHOABhRYwzEEOXrX8eIibs1KSLTsdWKZ8/EIAQLa4d8Dd73Mq7MTl8qYj80+Cg+XlxOnQvRHX5pMFk3";

function apiMachines(method, p, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: "api.machines.dev", path: p, method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const APP = "app-cifra";
const REGION = "gru";

function api(method, p, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: "api.machines.dev", path: p, method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function listFiles(dir) {
  const files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isFile()) files.push(full);
    else if (e.isDirectory()) files.push(...listFiles(full));
  }
  return files;
}

async function destroyAllMachines() {
  const res = await apiMachines("GET", `/v1/apps/${APP}/machines`);
  const list = res.status === 200 && Array.isArray(res.data) ? res.data : [];
  for (const m of list) {
    const id = m.id;
    if (!id) continue;
    console.log(`   Parando ${id}...`);
    await apiMachines("POST", `/v1/apps/${APP}/machines/${id}/stop`);
    await new Promise(r => setTimeout(r, 2000));
    console.log(`   Destruindo ${id}...`);
    await apiMachines("DELETE", `/v1/apps/${APP}/machines/${id}`);
    console.log(`   ${id} destruída`);
  }
}

async function main() {
  console.log("=== Deploy App-Violao no Fly.io ===\n");

  console.log("1. Destruindo machines antigas...");
  await destroyAllMachines();

  console.log("2. Preparando arquivos...");
  const files = [];

  // Server files (/app/backend/src/*)
  for (const f of listFiles("backend/src")) {
    const rel = path.relative("backend/src", f);
    files.push({
      guest_path: `/app/backend/src/${rel}`,
      raw_value: fs.readFileSync(f).toString("base64"),
      mode: 0o644,
    });
  }

  // Data folder (users.json) - se existir
  if (fs.existsSync("data")) {
    for (const f of listFiles("data")) {
      const rel = path.relative("data", f);
      files.push({
        guest_path: `/app/data/${rel}`,
        raw_value: fs.readFileSync(f).toString("base64"),
        mode: 0o644,
      });
    }
  }

  // package.json
  const pkg = {
    name: "cifras-api",
    version: "1.0.0",
    type: "module",
    dependencies: {
      express: "^4.21.0",
      cors: "^2.8.5",
      "cookie-parser": "^1.4.7",
      bcryptjs: "^2.4.3",
      jsonwebtoken: "^9.0.2",
    },
  };
  files.push({
    guest_path: "/app/backend/package.json",
    raw_value: Buffer.from(JSON.stringify(pkg)).toString("base64"),
    mode: 0o644,
  });

  // Frontend dist files (frontend/dist/ -> /app/frontend/dist/)
  const distDir = "frontend/dist";
  for (const f of listFiles(distDir)) {
    const rel = path.relative(distDir, f);
    files.push({
      guest_path: `/app/frontend/dist/${rel}`,
      raw_value: fs.readFileSync(f).toString("base64"),
      mode: 0o644,
    });
  }

  const totalSize = files.reduce((s, f) => s + f.raw_value.length, 0);
  console.log(`   ${files.length} arquivos (~${(totalSize / 1024).toFixed(0)}KB base64)`);

  console.log("3. Criando machine...");
  const result = await apiMachines("POST", `/v1/apps/${APP}/machines`, {
    region: REGION,
    config: {
      image: "node:20-slim",
      env: loadEnv(),
      init: {
        entrypoint: ["sh", "-c", "cd /app/backend && npm install --production && exec node src/index.js"],
      },
      files,
      services: [{
        protocol: "tcp",
        internal_port: 3001,
        ports: [
          { port: 443, handlers: ["tls", "http"] },
          { port: 80, handlers: ["http"] },
        ],
      }],
      guest: { cpu_kind: "shared", cpus: 1, memory_mb: 256 },
      auto_destroy: true,
    },
  });

  console.log(`   Status: ${result.status}`);
  if (result.status === 201 || result.status === 200) {
    const id = result.data?.id || "unknown";
    console.log(`\n✅ Deploy realizado! Machine: ${id}`);
    console.log(`   🌐 https://${APP}.fly.dev`);
  } else {
    console.log(`   Erro: ${JSON.stringify(result.data).slice(0, 400)}`);
  }
}

main().catch(console.error);
