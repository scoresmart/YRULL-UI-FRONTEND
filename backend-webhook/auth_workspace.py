"""@require_workspace -- the auth gate every browser-facing WhatsApp route uses.

The frontend sends `Authorization: Bearer <supabase_jwt>` plus `X-Workspace-Id`
on every call (see apiJSON/authFetch in src/lib/api.js). This decorator turns
that pair into a trusted `g.workspace_id`.

The header is NOT trusted. A JWT is easy to come by (any signed-up user has
one) and X-Workspace-Id is just a string the browser chose, so accepting it
verbatim would let any logged-in user read any tenant's inbox. The workspace is
therefore always re-derived from the token's own user id, and the header is only
allowed to *agree* with the answer.

If the Flask app already has its own @require_workspace, delete this module and
import that one instead -- calls_route.py and conversations_route.py are the
only consumers. Whatever you swap in must set `g.workspace_id`.
"""

from __future__ import annotations

import logging
import os
import time
from functools import wraps
from typing import Any

import requests
from flask import g, jsonify, request

log = logging.getLogger(__name__)

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or SUPABASE_SERVICE_ROLE_KEY

_TIMEOUT = 10

# jwt -> (user_id, workspace_id, cached_at). IncomingCallNotification.jsx polls
# /whatsapp/calls/pending every 10s and /whatsapp/calls every 2s while a call is
# up; without this cache each poll would cost two extra Supabase round-trips.
_token_cache: dict[str, tuple[str, str | None, float]] = {}
_TOKEN_CACHE_TTL = int(os.environ.get("WA_TOKEN_CACHE_TTL", "60"))


class AuthError(Exception):
    def __init__(self, message: str, status: int = 401) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


def _bearer() -> str:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise AuthError("Missing bearer token")
    token = header[7:].strip()
    if not token:
        raise AuthError("Missing bearer token")
    return token


def _verify_token(token: str) -> str:
    """Return the Supabase user id for a JWT, or raise AuthError.

    Verification is delegated to Supabase's own /auth/v1/user rather than
    decoding the JWT here, so no signing secret has to live in this process and
    a revoked session stops working immediately instead of at token expiry.
    """
    resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
        timeout=_TIMEOUT,
    )
    if resp.status_code == 401:
        raise AuthError("Session expired or invalid")
    if resp.status_code >= 400:
        log.warning("Supabase token check failed [%s]: %s", resp.status_code, resp.text[:200])
        raise AuthError("Could not verify session", 502)

    user_id = (resp.json() or {}).get("id")
    if not user_id:
        raise AuthError("Token carries no user id")
    return user_id


def _workspace_for_user(user_id: str) -> str | None:
    """profiles.workspace_id is the single source of truth for membership --
    see public.get_user_workspace_id() in supabase/schema.sql, which every RLS
    policy in the project is built on."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        },
        params={"select": "workspace_id", "id": f"eq.{user_id}", "limit": "1"},
        timeout=_TIMEOUT,
    )
    if resp.status_code >= 400:
        log.warning("Profile lookup failed [%s]: %s", resp.status_code, resp.text[:200])
        raise AuthError("Could not resolve workspace", 502)

    rows = resp.json() or []
    return rows[0].get("workspace_id") if rows else None


def resolve_request_workspace() -> str:
    """Verify the request and return its workspace id. Raises AuthError."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise AuthError("Server is missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", 500)

    token = _bearer()

    now = time.time()
    hit = _token_cache.get(token)
    if hit and (now - hit[2]) < _TOKEN_CACHE_TTL:
        user_id, workspace_id = hit[0], hit[1]
    else:
        user_id = _verify_token(token)
        workspace_id = _workspace_for_user(user_id)
        _token_cache[token] = (user_id, workspace_id, now)

    if not workspace_id:
        raise AuthError("This account is not attached to a workspace", 403)

    # The header may only confirm what the token already proved.
    claimed = request.headers.get("X-Workspace-Id")
    if claimed and claimed != workspace_id:
        log.warning("User %s asked for workspace %s but belongs to %s", user_id, claimed, workspace_id)
        raise AuthError("Not a member of that workspace", 403)

    g.user_id = user_id
    return workspace_id


def require_workspace(fn: Any) -> Any:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            g.workspace_id = resolve_request_workspace()
        except AuthError as exc:
            return jsonify({"error": exc.message}), exc.status
        return fn(*args, **kwargs)

    return wrapper
