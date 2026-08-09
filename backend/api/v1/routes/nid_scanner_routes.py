# backend/api/v1/routes/nid_scanner_routes.py
"""NID Scanner plugin routes — URL parsing, HTTP method dispatch and
response shaping. Business logic lives in the controller; response
formatting lives in utils/response.py."""

import json
from backend.api.v1.controllers import nid_scanner_controller
from backend.utils import response as res

def _read_json_body(handler):
    clen = handler.headers.get("Content-Length")
    body_str = handler.rfile.read(int(clen)) if clen else b"{}"
    return json.loads(body_str) if body_str else {}

def handle_post(handler):
    """POST /api/plugins/nid-scanner → scan the base64 NID front and back images."""
    body = _read_json_body(handler)
    front_base64 = body.get("front_image")
    back_base64 = body.get("back_image")
    
    if not front_base64:
        res.error(handler, 400, "front_image (base64) is required")
        return
        
    try:
        data = nid_scanner_controller.process_nid_images(front_base64, back_base64)
        if "error" in data:
            res.error(handler, 400, data["error"])
            return
        res.ok(handler, data)
    except Exception as err:
        res.error(handler, 500, f"NID Scanning failed: {err}")

def register_nid_scanner_routes(handler, method, path):
    """Dispatch /api/plugins/nid-scanner requests to the right handler."""
    if not path.startswith("/api/plugins/nid-scanner"):
        return False
    if method == "POST":
        handle_post(handler)
    else:
        res.error(handler, 405, "Method not allowed")
    return True
