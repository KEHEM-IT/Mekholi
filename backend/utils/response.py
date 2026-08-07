# backend/utils/response.py
"""HTTP response helpers — every handler sends responses through here so
the format, headers and CORS stay consistent across the API."""

import json

# CORS — allow the Vite dev server (any localhost port) and Vercel previews.
CORS_ORIGIN = "*"


def _headers(extra=None):
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    if extra:
        headers.update(extra)
    return headers


def send(handler, code, body=None):
    """Serialize `body` (or an error object) with the given status code."""
    if body is None:
        body = {"ok": True} if 200 <= code < 300 else {"error": "Unknown error"}
    if not isinstance(body, (dict, list)):
        body = {"data": body}
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    handler.send_response(code)
    for k, v in _headers().items():
        handler.send_header(k, v)
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


def ok(handler, body=None):
    send(handler, 200, body)


def created(handler, body=None):
    send(handler, 201, body)


def error(handler, code, message):
    send(handler, code, {"error": message})


def no_content(handler):
    """204 — used for preflight/OPTIONS."""
    handler.send_response(204)
    for k, v in _headers().items():
        handler.send_header(k, v)
    handler.send_header("Content-Length", "0")
    handler.end_headers()
