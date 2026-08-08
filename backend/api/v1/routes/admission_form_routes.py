# backend/api/v1/routes/admission_form_routes.py
"""Admission Form Builder routes.

Endpoints:
  GET    /api/admission-form              → { admission_form: {...} }
  POST   /api/admission-form              → save/update → { ok }
"""

import json
from backend.api.v1.controllers import admission_form_controller
from backend.utils import response as res


def _read_json_body(handler):
    clen = handler.headers.get("Content-Length")
    body_str = handler.rfile.read(int(clen)) if clen else b"{}"
    return json.loads(body_str) if body_str else {}


def handle_get(handler):
    res.ok(handler, {"admission_form": admission_form_controller.get_form()})


def handle_post(handler):
    body = _read_json_body(handler)
    try:
        saved = admission_form_controller.save_form(body)
        res.ok(handler, {"ok": saved})
    except Exception as err:
        res.error(handler, 500, f"Save failed: {err}")


def register_admission_form_routes(handler, method, path):
    """Dispatch /api/admission-form requests to the right handler."""
    if not path.startswith("/api/admission-form"):
        return False
    if method == "GET":
        handle_get(handler)
    elif method == "POST":
        handle_post(handler)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
