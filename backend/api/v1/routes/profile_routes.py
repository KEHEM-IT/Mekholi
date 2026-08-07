# backend/api/v1/routes/profile_routes.py
"""Profile resource routes — URL parsing, HTTP method dispatch and
response shaping. Business logic lives in the controller; response
formatting lives in utils/response.py."""

import json
import urllib.parse

from backend.api.v1.controllers import profile_controller
from backend.utils import response as res

# Default EIIN used when the query param is absent.
DEFAULT_EIIN = "130430"


def _read_json_body(handler):
    clen = handler.headers.get("Content-Length")
    body_str = handler.rfile.read(int(clen)) if clen else b"{}"
    return json.loads(body_str) if body_str else {}


def _get_eiin(handler):
    parts = urllib.parse.urlparse(handler.path)
    query = urllib.parse.parse_qs(parts.query)
    return query.get("eiin", [DEFAULT_EIIN])[0]


def handle_get(handler):
    """GET /api/profile?eiin=… → the profile document or 404."""
    eiin = _get_eiin(handler)
    profile = profile_controller.get_profile(eiin)
    if profile is None:
        res.error(handler, 404, "Not found")
        return
    res.ok(handler, profile)


def handle_post(handler):
    """POST /api/profile?eiin=… → upsert the profile document."""
    eiin = _get_eiin(handler)
    body = _read_json_body(handler)
    try:
        profile_controller.upsert_profile(eiin, body)
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")
        return
    res.ok(handler, {"ok": True})


def register_profile_routes(handler, method, path):
    """Dispatch /api/profile requests to the right handler."""
    if not path.startswith("/api/profile"):
        return False
    if method == "GET":
        handle_get(handler)
    elif method == "POST":
        handle_post(handler)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
