"""
Social Manager — Flask blueprint
=================================
Add to your existing Flask app (voip_webhook.py):

    from social_routes import social_bp
    app.register_blueprint(social_bp)

Required environment variables (already on Railway or add them):
    SUPABASE_URL            — your Supabase project URL
    SUPABASE_SERVICE_KEY    — service role key (Settings > API in Supabase)
    ANTHROPIC_API_KEY       — already set on Railway
"""

import os
import json
import logging
from functools import wraps

import anthropic
from flask import Blueprint, request, jsonify, g
from supabase import create_client

logger = logging.getLogger(__name__)

social_bp = Blueprint("social", __name__, url_prefix="/social")

# ── Clients ──────────────────────────────────────────────────────────────────
_supabase = None
_claude = None


def _get_supabase():
    global _supabase
    if _supabase is None:
        _supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )
    return _supabase


def _get_claude():
    global _claude
    if _claude is None:
        _claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _claude


# ── Auth decorator ────────────────────────────────────────────────────────────
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        workspace_id = request.headers.get("X-Workspace-Id", "").strip()
        if not token or not workspace_id:
            return jsonify({"error": "Unauthorized"}), 401
        try:
            user_resp = _get_supabase().auth.get_user(token)
            if not user_resp.user:
                return jsonify({"error": "Invalid token"}), 401
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        g.workspace_id = workspace_id
        g.user_id = str(user_resp.user.id)
        return f(*args, **kwargs)
    return decorated


# ── Business context (shared across prompts) ──────────────────────────────────
SCORE_SMART_CONTEXT = """
You are the social media manager for Score Smart, an Australian online coaching business
that helps migrants pass language certification exams:
  • NAATI CCL — Hindi, Punjabi, Nepali (site: naati.prepsmart.au)
  • PTE Academic (site: scoresmart.au)
  • IELTS / LanguageCert (site: lc.prepsmart.au)

TARGET AUDIENCE: Indian, Nepali and Punjabi migrants in Australia.
AVERAGE COURSE PRICE: ~A$370. Most students enquire via WhatsApp.
HARRY posts content manually — never schedule or auto-post.

OWN SOCIAL ACCOUNTS:
  TikTok      @scoresmartpte          9,978 followers | 107.6K likes | best video: 1.7M views
  Instagram   @score.smartpte         5,512 followers | best reel: 250K views
  YouTube     @ScoreSmart-PTE         9,910 subscribers | 84 videos | no upload in 4 months
  LinkedIn    Scoresmartpte           3 followers (huge growth opportunity)
  Facebook                            ~750 followers
  WhatsApp Channel                    ~900 followers

TOP COMPETITORS (social media):
  1. LA Language Academy   YouTube @LanguageAcademyPTE ~589K | TikTok @languageacademy ~72.6K | Instagram @languageacademyau ~35K
       Key tactic: Instagram reels use comment-keyword automation (more comments than likes)
  2. Milestone Study        TikTok @anusha.milestonestudy ~193K | YouTube @milestonestudy 100K+ — CCL Nepali specialist, biggest TikTok in this niche
  3. E2Language             YouTube @E2PTE ~475K | Instagram @e2language ~58K — PTE specialist
  4. A One Australia        YouTube ~39.9K | Instagram @a_one_australia_education ~9.3K
  5. PTE Magic              YouTube Moni PTE MAGIC ~140K
  6. Vision Language Experts, PTE Tutorials, Englishfirm, CCLHUB, NaCl Prep — all smaller

UNCLAIMED PLATFORMS (no competitor present): Quora, Reddit, Threads
These are first-mover opportunities — Score Smart should establish presence there immediately.

CONTENT RULES:
  • Never auto-post, like, follow or comment — research and idea generation only
  • Harry posts manually; ideas should be ready-to-copy
  • Always include a UTM-tracked link so we can measure traffic
  • Write in a warm, helpful, expert tone — not salesy
"""

UTM_BASE = {
    "tiktok":    "utm_source=tiktok&utm_medium=organic",
    "instagram": "utm_source=instagram&utm_medium=organic",
    "youtube":   "utm_source=youtube&utm_medium=organic",
    "linkedin":  "utm_source=linkedin&utm_medium=organic",
    "reddit":    "utm_source=reddit&utm_medium=organic",
    "quora":     "utm_source=quora&utm_medium=organic",
    "facebook":  "utm_source=facebook&utm_medium=organic",
    "threads":   "utm_source=threads&utm_medium=organic",
    "whatsapp":  "utm_source=whatsapp&utm_medium=organic",
}

PLATFORM_URL = {
    "tiktok":    "https://naati.prepsmart.au/hindi",
    "instagram": "https://naati.prepsmart.au/hindi",
    "youtube":   "https://naati.prepsmart.au/hindi",
    "linkedin":  "https://scoresmart.au",
    "reddit":    "https://naati.prepsmart.au/hindi",
    "quora":     "https://naati.prepsmart.au",
    "facebook":  "https://naati.prepsmart.au/hindi",
    "threads":   "https://naati.prepsmart.au/hindi",
    "whatsapp":  "https://scoresmart.au",
}


def _utm(platform, campaign, content=""):
    base = PLATFORM_URL.get(platform, "https://scoresmart.au")
    params = UTM_BASE.get(platform, "utm_source=" + platform)
    return f"{base}?{params}&utm_campaign={campaign}&utm_content={content}"


# ── GET /social/ideas ─────────────────────────────────────────────────────────
@social_bp.route("/ideas", methods=["GET"])
@require_auth
def list_ideas():
    platform = request.args.get("platform")
    status = request.args.get("status")

    query = (
        _get_supabase()
        .table("social_content_ideas")
        .select("*")
        .eq("workspace_id", g.workspace_id)
        .order("created_at", desc=True)
    )
    if platform and platform != "all":
        query = query.eq("platform", platform)
    if status and status != "all":
        query = query.eq("status", status)

    result = query.execute()
    return jsonify({"ideas": result.data}), 200


# ── POST /social/ideas/generate ───────────────────────────────────────────────
@social_bp.route("/ideas/generate", methods=["POST"])
@require_auth
def generate_ideas():
    body = request.get_json(silent=True) or {}
    platform_filter = body.get("platform")  # optional: generate for one platform only

    platforms = (
        [platform_filter]
        if platform_filter and platform_filter != "all"
        else ["tiktok", "instagram", "youtube", "linkedin", "reddit", "quora", "facebook", "threads", "whatsapp"]
    )

    generate_prompt = f"""
{SCORE_SMART_CONTEXT}

Generate ONE fresh content idea for EACH of these platforms: {', '.join(platforms)}.

For each idea return a JSON object with exactly these fields:
{{
  "platform": "<platform key>",
  "category": "<2-4 word category e.g. 'CCL Tips', 'Student Story', 'Expert Answer'>",
  "hook": "<the opening line, thumbnail text, or post title — must be compelling>",
  "script": "<complete script, caption, or post body ready for Harry to copy-paste, including hashtags where relevant>",
  "why_it_works": "<1-2 sentences citing specific competitor data or platform mechanics that make this likely to perform>",
  "utm_campaign": "<snake_case campaign name for the UTM link>"
}}

Return ONLY a valid JSON array of objects, no markdown, no explanation.
Make ideas specific to Score Smart's niche: NAATI CCL (Hindi/Punjabi/Nepali), PTE, IELTS in Australia.
Vary the content angles: tips, student stories, myth-busting, competitor gaps, expert Q&A.
"""

    try:
        response = _get_claude().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": generate_prompt}],
        )
        raw = response.content[0].text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        ideas_raw = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("Claude returned invalid JSON: %s", e)
        return jsonify({"error": "AI returned invalid response, please try again"}), 500
    except Exception as e:
        logger.error("Claude API error: %s", e)
        return jsonify({"error": "AI generation failed, please try again"}), 500

    # Build rows to insert
    rows = []
    for idea in ideas_raw:
        plat = idea.get("platform", "tiktok")
        campaign = idea.get("utm_campaign", "content_ideas")
        rows.append({
            "workspace_id": g.workspace_id,
            "platform":     plat,
            "category":     idea.get("category", "Content"),
            "hook":         idea.get("hook", ""),
            "script":       idea.get("script", ""),
            "why_it_works": idea.get("why_it_works", ""),
            "utm_link":     _utm(plat, campaign),
            "status":       "pending",
        })

    result = _get_supabase().table("social_content_ideas").insert(rows).execute()
    return jsonify({"ideas": result.data, "count": len(result.data)}), 201


# ── POST /social/ideas/<id>/approve ──────────────────────────────────────────
@social_bp.route("/ideas/<idea_id>/approve", methods=["POST"])
@require_auth
def approve_idea(idea_id):
    _get_supabase().table("social_content_ideas").update({"status": "approved"}).eq(
        "id", idea_id
    ).eq("workspace_id", g.workspace_id).execute()
    return jsonify({"status": "approved"}), 200


# ── POST /social/ideas/<id>/decline ──────────────────────────────────────────
@social_bp.route("/ideas/<idea_id>/decline", methods=["POST"])
@require_auth
def decline_idea(idea_id):
    _get_supabase().table("social_content_ideas").update({"status": "declined"}).eq(
        "id", idea_id
    ).eq("workspace_id", g.workspace_id).execute()
    return jsonify({"status": "declined"}), 200


# ── POST /social/ideas/<id>/regenerate ───────────────────────────────────────
@social_bp.route("/ideas/<idea_id>/regenerate", methods=["POST"])
@require_auth
def regenerate_idea(idea_id):
    body = request.get_json(silent=True) or {}
    note = body.get("note", "").strip()

    # Fetch existing idea
    result = (
        _get_supabase()
        .table("social_content_ideas")
        .select("*")
        .eq("id", idea_id)
        .eq("workspace_id", g.workspace_id)
        .single()
        .execute()
    )
    if not result.data:
        return jsonify({"error": "Idea not found"}), 404

    existing = result.data
    plat = existing["platform"]

    regen_prompt = f"""
{SCORE_SMART_CONTEXT}

Regenerate a content idea for Score Smart for platform: {plat}

EXISTING IDEA (replace this):
Hook: {existing['hook']}
Category: {existing['category']}

{f"FEEDBACK FROM HARRY: {note}" if note else "Generate a completely fresh angle for the same platform."}

Return ONE JSON object with these fields:
{{
  "platform": "{plat}",
  "category": "<2-4 word category>",
  "hook": "<compelling opening line or title>",
  "script": "<complete ready-to-post content>",
  "why_it_works": "<1-2 sentences citing competitor data or platform mechanics>",
  "utm_campaign": "<snake_case campaign name>"
}}

Return ONLY valid JSON, no markdown.
"""

    try:
        response = _get_claude().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": regen_prompt}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        new_idea = json.loads(raw)
    except Exception as e:
        logger.error("Regenerate failed: %s", e)
        return jsonify({"error": "Regeneration failed, please try again"}), 500

    campaign = new_idea.get("utm_campaign", "content_ideas")
    updated = (
        _get_supabase()
        .table("social_content_ideas")
        .update({
            "category":       new_idea.get("category", existing["category"]),
            "hook":           new_idea.get("hook", existing["hook"]),
            "script":         new_idea.get("script", existing["script"]),
            "why_it_works":   new_idea.get("why_it_works", existing["why_it_works"]),
            "utm_link":       _utm(plat, campaign),
            "status":         "pending",
            "regenerate_note": note or None,
        })
        .eq("id", idea_id)
        .eq("workspace_id", g.workspace_id)
        .execute()
    )
    return jsonify({"idea": updated.data[0] if updated.data else None}), 200


# ── POST /social/chat ─────────────────────────────────────────────────────────
@social_bp.route("/chat", methods=["POST"])
@require_auth
def chat():
    body = request.get_json(silent=True) or {}
    message = body.get("message", "").strip()
    history = body.get("history", [])  # [{role, text}]

    if not message:
        return jsonify({"error": "Message is required"}), 400

    system_prompt = f"""
{SCORE_SMART_CONTEXT}

You are having a conversation with Lakshay (the owner) or Harry (who posts content).
Be concise, practical, and specific. Always tie advice back to Score Smart's niche.
When asked to generate ideas, produce ready-to-use content Harry can copy.
When asked about competitors, share specific data you know (follower counts, tactics).
Never suggest logging into any social account or auto-posting.
"""

    # Build message history for Claude (last 10 turns)
    claude_messages = []
    for msg in history[-10:]:
        role = msg.get("role", "user")
        text = msg.get("text", "")
        if role in ("user", "assistant") and text:
            claude_messages.append({"role": role, "content": text})

    # Add current message
    claude_messages.append({"role": "user", "content": message})

    try:
        response = _get_claude().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=claude_messages,
        )
        reply = response.content[0].text
    except Exception as e:
        logger.error("Chat failed: %s", e)
        return jsonify({"error": "Chat unavailable, please try again"}), 500

    # Persist both messages to Supabase for history
    try:
        _get_supabase().table("social_chat_messages").insert([
            {"workspace_id": g.workspace_id, "role": "user",      "content": message},
            {"workspace_id": g.workspace_id, "role": "assistant",  "content": reply},
        ]).execute()
    except Exception:
        pass  # Non-fatal: chat works even if persistence fails

    return jsonify({"reply": reply}), 200
