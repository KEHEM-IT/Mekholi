# backend/api/v1/routes/admission_lottery_routes.py
"""Admission Lottery Draw routes.

Endpoints:
  GET    /api/admission-lotteries              → { admission_lotteries: [...] }
  POST   /api/admission-lotteries              → create → { ok, id }
  POST   /api/admission-lotteries?id=N         → update → { ok, id }
  DELETE /api/admission-lotteries?id=N         → delete → { ok }
"""

import json
import urllib.parse

from backend.api.v1.controllers import admission_lottery_controller
from backend.utils import response as res


def _read_json_body(handler):
    clen = handler.headers.get("Content-Length")
    body_str = handler.rfile.read(int(clen)) if clen else b"{}"
    return json.loads(body_str) if body_str else {}


def _get_id(handler):
    parts = urllib.parse.urlparse(handler.path)
    query = urllib.parse.parse_qs(parts.query)
    try:
        return int(query.get("id", ["0"])[0]) or None
    except ValueError:
        return None


def handle_get(handler):
    res.ok(handler, {"admission_lotteries": admission_lottery_controller.list_lotteries()})


def handle_post(handler):
    body = _read_json_body(handler)
    item_id = _get_id(handler)
    try:
        if item_id:
            updated = admission_lottery_controller.update_lottery(item_id, body)
            if not updated:
                res.error(handler, 404, "Admission lottery not found")
                return
            res.ok(handler, {"ok": True, "id": item_id})
        else:
            new_id = admission_lottery_controller.create_lottery(body)
            res.created(handler, {"ok": True, "id": new_id})
    except Exception as err:
        res.error(handler, 500, f"Save failed: {err}")


def handle_delete(handler):
    item_id = _get_id(handler)
    if not item_id:
        res.error(handler, 400, "id is required")
        return
    deleted = admission_lottery_controller.delete_lottery(item_id)
    if not deleted:
        res.error(handler, 404, "Admission lottery not found")
        return
    res.ok(handler, {"ok": True})


def register_admission_lottery_routes(handler, method, path):
    """Dispatch /api/admission-lotteries requests to the right handler."""
    if not path.startswith("/api/admission-lotteries"):
        return False
    if method == "GET":
        handle_get(handler)
    elif method == "POST":
        handle_post(handler)
    elif method == "DELETE":
        handle_delete(handler)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
