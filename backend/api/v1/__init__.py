# backend/api/v1/__init__.py
"""API v1 — route registrations for version 1 endpoints."""
from .routes.profile_routes import register_profile_routes

__all__ = ["register_profile_routes"]
