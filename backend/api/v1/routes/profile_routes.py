# backend/api/v1/routes/profile_routes.py
"""Profile resource routes — URL parsing, HTTP method dispatch and
response shaping. Business logic lives in the controller; response
formatting lives in utils/response.py.

API Design:
  - Uses `id` (auto-increment PK) as the primary lookup key
  - Falls back to the first institute (id=1) when no ID is provided
  - EIIN is optional — works for private schools without EIIN
"""

import json
import urllib.parse

from backend.api.v1.controllers import profile_controller
from backend.utils import response as res

# Default institute ID used when the query param is absent.
# The first institute created gets id=1 (SQLite autoincrement).
DEFAULT_INSTITUTE_ID = "1"


def _read_json_body(handler):
    clen = handler.headers.get("Content-Length")
    body_str = handler.rfile.read(int(clen)) if clen else b"{}"
    return json.loads(body_str) if body_str else {}


def _get_institute_id(handler):
    """Extract institute ID from query params, falling back to default."""
    parts = urllib.parse.urlparse(handler.path)
    query = urllib.parse.parse_qs(parts.query)
    return query.get("id", [DEFAULT_INSTITUTE_ID])[0]


def handle_get(handler):
    """GET /api/profile?id=… → the profile document or 404."""
    institute_id = _get_institute_id(handler)
    profile = profile_controller.get_profile_by_id(institute_id)
    if profile is None:
        res.error(handler, 404, "Not found")
        return
    res.ok(handler, profile)


def handle_get_card_info(handler):
    """GET /api/profile/card-info?id=… → optimized endpoint for ID cards.
    
    Returns only institute_name_en and institute_logo — used by the
    ID card generator to avoid fetching the full profile document.
    """
    institute_id = _get_institute_id(handler)
    card_info = profile_controller.get_card_info_by_id(institute_id)
    if card_info is None:
        # Return empty defaults instead of 404 — card still renders
        res.ok(handler, {"institute_name_en": "", "institute_logo": ""})
        return
    res.ok(handler, card_info)


def handle_post(handler):
    """POST /api/profile?id=… → upsert the profile document."""
    institute_id = _get_institute_id(handler)
    body = _read_json_body(handler)
    try:
        profile_controller.upsert_profile_by_id(institute_id, body)
    except Exception as err:  # pragma: no cover - defensive
        res.error(handler, 500, f"Save failed: {err}")
        return
    res.ok(handler, {"ok": True})


def register_profile_routes(handler, method, path):
    """Dispatch /api/profile requests to the right handler."""
    if path.startswith("/api/profile/card-info"):
        if method == "GET":
            handle_get_card_info(handler)
        else:
            res.error(handler, 405, "Method not allowed")
        return True
    if path.startswith("/api/profile"):
        if method == "GET":
            handle_get(handler)
        elif method == "POST":
            handle_post(handler)
        else:
            res.error(handler, 405, "Method not allowed")
        return True
    return False
