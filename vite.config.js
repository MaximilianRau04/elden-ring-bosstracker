import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { cpSync, mkdirSync, readFileSync } from "fs";
import { createHash } from "crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Frontend is plain static HTML/CSS/JS (no framework, no ES modules - lots of
// inline onclick="..." handlers rely on global functions), so these scripts
// are loaded as classic <script src> tags rather than type="module". Rollup's
// HTML plugin can't bundle classic scripts and - unlike files referenced from
// <link>/<img>/module scripts - doesn't copy them into dist/ either, so the
// build would otherwise ship an index.html that 404s on script.js etc.
//
// [srcAsWrittenInHtml, pathRelativeToFrontend] - srcAsWrittenInHtml must match
// the literal src="..." value so both index.html's and overlay/index.html's
// (differently-relative) references to the same file are covered.
const SCRIPT_REFS = [
  ["js/state.js", "js/state.js"],
  ["js/panels.js", "js/panels.js"],
  ["js/actions.js", "js/actions.js"],
  ["js/render.js", "js/render.js"],
  ["js/init.js", "js/init.js"],
  ["data/bosses.js", "data/bosses.js"],
  ["data/i18n.js", "data/i18n.js"],
  ["assets/chart.umd.min.js", "assets/chart.umd.min.js"],
  ["../data/bosses.js", "data/bosses.js"],
  ["../data/i18n.js", "data/i18n.js"],
  ["overlay.js", "overlay/overlay.js"],
];

function fileHash(relPath) {
  const data = readFileSync(resolve(__dirname, "frontend", relPath));
  return createHash("sha1").update(data).digest("hex").slice(0, 8);
}

// Copies the classic scripts verbatim into dist/ (same relative path) and
// appends a content-hash query string to their <script src> so a rebuild
// always busts the browser cache, even though the filename itself doesn't
// change. Dev mode needs nothing extra - Vite's dev server already serves
// these straight from frontend/ as static files.
function classicScripts() {
  return {
    name: "classic-scripts",
    apply: "build",
    transformIndexHtml(html) {
      let out = html;
      for (const [literal, relPath] of SCRIPT_REFS) {
        out = out.split('src="' + literal + '"')
                  .join('src="' + literal + '?v=' + fileHash(relPath) + '"');
      }
      return out;
    },
    closeBundle() {
      const uniquePaths = [...new Set(SCRIPT_REFS.map((r) => r[1]))];
      for (const relPath of uniquePaths) {
        const src  = resolve(__dirname, "frontend", relPath);
        const dest = resolve(__dirname, "frontend/dist", relPath);
        mkdirSync(dirname(dest), { recursive: true });
        cpSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  root: "frontend",
  publicDir: false,
  plugins: [classicScripts()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "frontend/index.html"),
        overlay: resolve(__dirname, "frontend/overlay/index.html"),
      },
    },
  },
});
