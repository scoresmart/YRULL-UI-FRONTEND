// Deployed on the LMS Supabase project (sepzceaicoldqhyxxzff).
// Lets LMS admins read and answer LMS support tickets from the Yrull app.
//
// Auth: the caller sends its *Yrull* Supabase access token in `x-yrull-token`
// (and the Yrull anon key in `x-yrull-apikey`). We verify it against the Yrull
// auth server, then require that the same email belongs to an LMS admin profile.
// Replies are written as that LMS admin, exactly like a reply from the portal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const YRULL_SUPABASE_URL = (
  Deno.env.get("YRULL_SUPABASE_URL") || "https://llafxbetyhxfzqcckkmy.supabase.co"
).replace(/\/$/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ATTACHMENT_BUCKET = "attachments";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-yrull-token, x-yrull-apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Admin = { id: string; name: string | null; email: string };

async function authenticate(req: Request): Promise<Admin> {
  const token = req.headers.get("x-yrull-token");
  const apikey = req.headers.get("x-yrull-apikey");
  if (!token || !apikey) throw new HttpError(401, "Missing Yrull session");

  const res = await fetch(`${YRULL_SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
  });
  if (!res.ok) throw new HttpError(401, "Yrull session is invalid or expired");
  const user = await res.json();
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email) throw new HttpError(401, "Yrull account has no email");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, role")
    .ilike("email", email)
    .eq("role", "admin")
    .maybeSingle();
  if (!profile) throw new HttpError(403, "This account is not an LMS admin");
  return { id: profile.id, name: profile.name, email };
}

/** Names for message senders: tutors first, then profiles. */
async function senderNames(ids: string[]) {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const [{ data: tutors }, { data: profiles }] = await Promise.all([
    supabase.from("tutors").select("id, full_name").in("id", ids),
    supabase.from("profiles").select("id, name").in("id", ids),
  ]);
  for (const t of tutors ?? []) if (t.full_name) names.set(t.id, t.full_name);
  for (const p of profiles ?? []) if (p.name && !names.has(p.id)) names.set(p.id, p.name);
  return names;
}

async function listTickets(params: { status?: string; search?: string; limit?: number }) {
  const limit = Math.min(Math.max(Number(params.limit) || 200, 1), 500);
  let q = supabase
    .from("support_tickets")
    .select(
      "id, ticket_number, student_id, title, description, status, priority, mentioned_tutor_id, assigned_tutor_id, last_message_at, last_student_reply_at, last_tutor_reply_at, resolved_at, created_at, updated_at",
    )
    .order("last_message_at", { ascending: false })
    .limit(limit);
  if (params.status && params.status !== "all") q = q.eq("status", params.status);
  const { data: tickets, error } = await q;
  if (error) throw error;

  const rows = tickets ?? [];
  const studentIds = [...new Set(rows.map((t) => t.student_id))];
  const tutorIds = [
    ...new Set(rows.flatMap((t) => [t.mentioned_tutor_id, t.assigned_tutor_id]).filter(Boolean)),
  ] as string[];
  const [{ data: students }, { data: tutors }] = await Promise.all([
    studentIds.length
      ? supabase.from("profiles").select("id, name, email, phone").in("id", studentIds)
      : Promise.resolve({ data: [] as any[] }),
    tutorIds.length
      ? supabase.from("tutors").select("id, full_name").in("id", tutorIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const studentById = new Map((students ?? []).map((s) => [s.id, s]));
  const tutorById = new Map((tutors ?? []).map((t) => [t.id, t.full_name]));

  let result = rows.map((t) => ({
    ...t,
    student: studentById.get(t.student_id) ?? null,
    mentioned_tutor_name: t.mentioned_tutor_id ? tutorById.get(t.mentioned_tutor_id) ?? null : null,
    assigned_tutor_name: t.assigned_tutor_id ? tutorById.get(t.assigned_tutor_id) ?? null : null,
  }));

  const search = String(params.search || "").trim().toLowerCase();
  if (search) {
    result = result.filter((t) =>
      [t.ticket_number, t.title, t.description, t.student?.name, t.student?.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(search)),
    );
  }

  const { data: all } = await supabase.from("support_tickets").select("status");
  const counts: Record<string, number> = { all: 0, open: 0, waiting_student: 0, resolved: 0 };
  for (const r of all ?? []) {
    counts.all++;
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  return { tickets: result, counts };
}

async function getTicket(ticketId: string, admin: Admin) {
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();
  if (error) throw error;
  if (!ticket) throw new HttpError(404, "Ticket not found");

  const [{ data: student }, { data: messages }, { data: attachments }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, phone").eq("id", ticket.student_id).maybeSingle(),
    supabase
      .from("support_ticket_messages")
      .select("id, sender_id, body, is_staff, source, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    supabase
      .from("support_ticket_attachments")
      .select("id, message_id, type, filename, storage_path, external_url, created_at")
      .eq("ticket_id", ticketId),
  ]);

  const names = await senderNames([...new Set((messages ?? []).map((m) => m.sender_id))]);
  const signed = await Promise.all(
    (attachments ?? []).map(async (a) => {
      let url = a.external_url;
      if (!url && a.storage_path) {
        const { data } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .createSignedUrl(a.storage_path, 60 * 60);
        url = data?.signedUrl ?? null;
      }
      return { ...a, url };
    }),
  );

  // Same "staff viewed" marker the portal records when an admin opens a ticket.
  await supabase
    .from("support_ticket_activity")
    .insert({ ticket_id: ticketId, actor_id: admin.id, event_type: "staff_viewed" })
    .then(({ error }) => error && console.warn("staff_viewed insert failed:", error.message));

  return {
    ticket,
    student,
    messages: (messages ?? []).map((m) => ({
      ...m,
      sender_name: m.is_staff
        ? names.get(m.sender_id) || "ScoreSmart Support"
        : student?.name || names.get(m.sender_id) || "Student",
    })),
    attachments: signed,
  };
}

async function reply(ticketId: string, body: string, resolve: boolean, admin: Admin) {
  const text = String(body || "").trim();
  if (!text) throw new HttpError(400, "Reply cannot be empty");

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, student_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) throw new HttpError(404, "Ticket not found");

  // The touch trigger moves the ticket to waiting_student and stamps last_tutor_reply_at.
  const { data: message, error } = await supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: ticketId, sender_id: admin.id, body: text, is_staff: true, source: "portal" })
    .select("id, sender_id, body, is_staff, source, created_at")
    .single();
  if (error) throw error;

  if (resolve) await setStatus(ticketId, "resolved");

  const { data: student } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", ticket.student_id)
    .maybeSingle();
  let emailed = false;
  if (student?.email) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/support-ticket-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({
        type: "admin_reply",
        ticket_number: ticket.ticket_number,
        student_name: student.name || "Student",
        student_email: student.email,
        message: text,
        sender_name: admin.name || "ScoreSmart Admin",
      }),
    });
    emailed = res.ok;
    if (!res.ok) console.error("support-ticket-email failed:", res.status, await res.text());
  }

  return { message: { ...message, sender_name: admin.name || "ScoreSmart Support" }, emailed };
}

async function setStatus(ticketId: string, status: string) {
  if (!["open", "waiting_student", "resolved"].includes(status)) {
    throw new HttpError(400, "Invalid status");
  }
  const { data, error } = await supabase
    .from("support_tickets")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Ticket not found");
  return { ticket: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = await authenticate(req);
    const payload = await req.json().catch(() => ({}));

    switch (payload.action) {
      case "access":
        return json({ allowed: true, admin: { name: admin.name, email: admin.email } });
      case "list":
        return json(await listTickets(payload));
      case "get":
        return json(await getTicket(payload.ticket_id, admin));
      case "reply":
        return json(await reply(payload.ticket_id, payload.body, Boolean(payload.resolve), admin));
      case "set_status":
        return json(await setStatus(payload.ticket_id, payload.status));
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error("yrull-support-bridge error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
