#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════════
#  ELDEN RING BOSS TRACKER — LOCAL SERVER
#
#  Serves the static web app (the frontend/ folder) AND persists progress to a
#  JSON file on disk, so it survives clearing the browser cache and is shared
#  across browsers on the same machine.
#
#  The web app still keeps a localStorage copy as an offline cache/fallback; it
#  syncs to this server whenever it is reachable.
#
#  Endpoints (same origin as the app, so no CORS needed):
#    GET  /api/progress   → the stored progress JSON ({} if nothing saved yet)
#    POST /api/progress   → overwrite the stored progress with the request body
#
#  Usage:
#    python server.py                 # serve on http://127.0.0.1:8000
#    python server.py --port 9000
#    python server.py --data /path/to/progress.json
#  Pure standard library — no extra dependencies.
# ═══════════════════════════════════════════════════════════════════════════

import argparse
import json
import os
import tempfile
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND_SRC  = os.path.normpath(os.path.join(HERE, "..", "frontend"))
FRONTEND_DIST = os.path.join(FRONTEND_SRC, "dist")
# Prefer the Vite production build (hashed filenames -> no stale-cache issues)
# when it exists; otherwise fall back to the raw frontend/ source so the app
# still works with zero setup (no Node/npm required).
WEB_ROOT = FRONTEND_DIST if os.path.isdir(FRONTEND_DIST) else FRONTEND_SRC
DEFAULT_DATA = os.path.join(HERE, "data", "progress.json")

# Reads are lock-free, but writes go through this so two quick saves can't
# interleave and corrupt the file.
_write_lock = threading.Lock()


def read_progress(path):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("[storage] could not read %s: %s" % (path, e))
        return {}


def write_progress(path, obj):
    """Atomic write: dump to a temp file in the same dir, then replace."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with _write_lock:
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(obj, f, ensure_ascii=False, indent=2)
            os.replace(tmp, path)
        except Exception:
            if os.path.exists(tmp):
                os.remove(tmp)
            raise


def make_handler(data_path):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=WEB_ROOT, **kwargs)

        # quieter logging
        def log_message(self, fmt, *args):
            pass

        def _send_json(self, code, obj):
            body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            p = self.path.split("?")[0]
            if p == "/api/progress":
                self._send_json(200, read_progress(data_path))
                return
            super().do_GET()

        def do_POST(self):
            if self.path.split("?")[0] != "/api/progress":
                self._send_json(404, {"error": "not found"})
                return
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b""
            try:
                obj = json.loads(raw.decode("utf-8")) if raw else {}
            except Exception as e:
                self._send_json(400, {"error": "invalid JSON: %s" % e})
                return
            try:
                write_progress(data_path, obj)
            except Exception as e:
                self._send_json(500, {"error": "could not save: %s" % e})
                return
            self._send_json(200, {"ok": True})

    return Handler


def main():
    ap = argparse.ArgumentParser(description="Boss Tracker web + storage server.")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--data", default=DEFAULT_DATA,
                    help="path to the progress JSON file")
    args = ap.parse_args()

    data_path = os.path.abspath(args.data)
    httpd = HTTPServer((args.host, args.port), make_handler(data_path))
    print("[server] web root : %s" % WEB_ROOT)
    print("[server] progress : %s" % data_path)
    print("[server] serving  : http://%s:%d" % (args.host, args.port))
    print("[server] open the URL in your browser. Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[server] stopped.")


if __name__ == "__main__":
    main()
