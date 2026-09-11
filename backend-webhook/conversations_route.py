"""GET /whatsapp/conversations - the chat sidebar's data source.

Needed for receiving to work end to end. The webhook writes contacts into
Supabase, but `useContacts()` in src/lib/dataHooks.js:48 does NOT read
whatsapp_contacts directly -- it calls this endpoint, so a brand-new sender
never appears in the sidebar until this returns them.

The flow after an inbound message:
    webhook inserts whatsapp_contacts row
      -> Supabase Realtime INSERT fires
      -> useRealtime.js calls onContactUpdate
      -> WhatsApp.jsx invalidates the ['whatsapp_contacts'] query
      -> react-query re-fetches THIS endpoint

If your backend already has this route, skip this file -- just confirm it
returns rows straight from whatsapp_contacts (including ones the webhook
created, not only ones created through the UI).
"""

from __future__ import annotations

import logging
import os

import requests
from flask import Blueprint, g, jsonify

log = logging.getLogger(__name__)

conversations_bp = Blueprint("whatsapp_conversations", __name__)

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""

# Shared with calls_route.py. If the Flask app already has its own
# @require_workspace, import that instead and delete auth_workspace.py -- these
# two blueprints are its only consumers.
try:
    from auth_workspace import require_workspace
except ImportError:  # when dropped into a package, e.g. src/routes/
    from .auth_workspace import require_workspace  # type: ignore[no-redef]


# ---------------------------------------------------------------------------


@conversations_bp.route("/whatsapp/conversations", methods=["GET"])
@require_workspace
def list_conversations():
    """One row per WhatsApp contact, newest activity first.

    ConversationList.jsx treats each contact as a conversation (there is no
    conversations table) and sorts by `last_seen`, so that ordering is applied
    here to keep the first paint correct.
    """
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/whatsapp_contacts",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            },
            params={
                "select": "*",
                # Scoped server-side: the service role key bypasses RLS, so
                # this filter is the only thing preventing cross-tenant reads.
                "workspace_id": f"eq.{g.workspace_id}",
                "order": "last_seen.desc.nullslast",
                "limit": "500",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return jsonify(resp.json()), 200
    except Exception:  # noqa: BLE001
        log.exception("Failed to list conversations for workspace=%s", g.workspace_id)
        return jsonify({"error": "Failed to load conversations"}), 500
