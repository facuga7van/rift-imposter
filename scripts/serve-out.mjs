/**
 * Server estatico minimo para out/, con la misma resolucion que hace nginx en
 * moraserver (`try_files $uri $uri.html $uri/`). Existe para que los tests E2E
 * corran contra el artefacto real de produccion y no contra `next dev`.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const PORT = Number(process.argv[2] ?? 4321);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  for (const candidate of [clean, `${clean}.html`, join(clean, "index.html")]) {
    const file = join(ROOT, candidate);
    if (!file.startsWith(ROOT)) continue; // fuera de out/: path traversal
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}

createServer(async (req, res) => {
  const file = await resolve(req.url ?? "/");
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
    return;
  }
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`out/ servido en http://127.0.0.1:${PORT}`));
