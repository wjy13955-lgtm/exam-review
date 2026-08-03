import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json; charset=utf-8"],
  "/sw.js": ["sw.js", "text/javascript; charset=utf-8"],
  "/assets/app-icon.svg": ["assets/app-icon.svg", "image/svg+xml"],
  "/wechat-miniprogram-personal/assets/tabbar/plan-active.png": ["wechat-miniprogram-personal/assets/tabbar/plan-active.png", "image/png"]
};

const assets = {};
for (const [url, [file, type]] of Object.entries(files)) {
  const data = await readFile(resolve(file));
  assets[url] = { type, body: data.toString("base64") };
}

const worker = `const ASSETS = ${JSON.stringify(assets)};
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = ASSETS[url.pathname] || (request.mode === "navigate" ? ASSETS["/index.html"] : null);
    if (!asset) return new Response("Not found", { status: 404 });
    return new Response(decode(asset.body), {
      headers: {
        "content-type": asset.type,
        "cache-control": url.pathname === "/sw.js" ? "no-cache" : "public, max-age=300",
        "x-content-type-options": "nosniff"
      }
    });
  }
};
`;

await rm(resolve("dist"), { recursive: true, force: true });
await mkdir(dirname(resolve("dist/server/index.js")), { recursive: true });
await writeFile(resolve("dist/server/index.js"), worker, "utf8");
console.log(`Built ${Object.keys(assets).length} app assets.`);
