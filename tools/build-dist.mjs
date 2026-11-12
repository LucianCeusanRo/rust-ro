// Builds dist/: a single self-contained index.html (CSS + all JS inlined) + sw.js + manifest + icons.
// Used for deployment uploads (fewer files). The source tree itself also works as-is on any static host.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, f) => "<style>\n" + fs.readFileSync(path.join(root, f), "utf8") + "\n</style>");
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => "<script>\n" + fs.readFileSync(path.join(root, f), "utf8").replace(/<\/script/gi, "<\\/script") + "\n</script>");
fs.writeFileSync(path.join(dist, "index.html"), html);
fs.writeFileSync(path.join(dist, "sw.js"), fs.readFileSync(path.join(root, "sw.js"), "utf8").replace(/const FILES = \[[\s\S]*?\];/, 'const FILES = ["./", "index.html", "manifest.webmanifest", "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png"];'));
for (const f of ["manifest.webmanifest", "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "assets/icon-maskable.png"]) fs.copyFileSync(path.join(root, f), path.join(dist, f));
console.log("dist/index.html", (fs.statSync(path.join(dist, "index.html")).size / 1024).toFixed(0) + " KiB");
