// Client for the PrepSmart score-report endpoints used by the Free Assessment page.
//
// Requests go to the same-origin /prepsmart-api path, which vercel.json (prod) and
// vite.config.js (dev) forward to https://backend.prepsmart.au/api/v1. This is a
// different service from the Yrull backend, so we use plain fetch on purpose: no
// Supabase token and no X-Workspace-Id header must ever be sent to it.

export const SCORE_REPORT_BASE = '/prepsmart-api/score-report';

export const MAX_FILES = 4;
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

// Same wording as the backend's 415 for HEIC (app/api/routes/score_report.py).
const HEIC_MESSAGE = "HEIC photos can't be read yet. Please send it as a JPEG or a screenshot.";

export class ScoreReportError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', missing = null, retryAfterSeconds = null } = {}) {
    super(message);
    this.name = 'ScoreReportError';
    this.status = status;
    this.code = code;
    this.missing = missing;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function isHeic(file) {
  const name = String(file?.name ?? '').toLowerCase();
  const type = String(file?.type ?? '').toLowerCase();
  return /\.(heic|heif)$/.test(name) || type === 'image/heic' || type === 'image/heif';
}

/** Throws a ScoreReportError when the files can't be sent; returns nothing otherwise. */
export function validateFiles(files) {
  const list = Array.from(files ?? []);
  if (list.length === 0) {
    throw new ScoreReportError('Add at least one score report image or PDF.', { code: 'NO_FILES' });
  }
  if (list.length > MAX_FILES) {
    throw new ScoreReportError(`Upload at most ${MAX_FILES} files at a time.`, { code: 'TOO_MANY_FILES' });
  }
  for (const f of list) {
    if (isHeic(f)) {
      throw new ScoreReportError(HEIC_MESSAGE, { status: 415, code: 'UNSUPPORTED_FILE' });
    }
    if (f.size > MAX_FILE_BYTES) {
      throw new ScoreReportError(`"${f.name}" is larger than 4 MB. Use a smaller image or a screenshot.`, {
        status: 413,
        code: 'FILE_TOO_LARGE',
      });
    }
  }
}

function parseRetryAfter(res) {
  const raw = res.headers?.get?.('Retry-After');
  if (raw == null || raw === '') return null;
  const secs = Number(raw);
  if (Number.isFinite(secs)) return Math.max(0, Math.ceil(secs));
  const when = Date.parse(raw);
  if (Number.isNaN(when)) return null;
  return Math.max(0, Math.ceil((when - Date.now()) / 1000));
}

function rateLimitMessage(retryAfterSeconds) {
  if (retryAfterSeconds == null) return 'Too many uploads. Please wait a few minutes and try again.';
  const mins = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many uploads. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
}

function validationMessage(list) {
  const first = list.find((d) => d && typeof d.msg === 'string');
  if (!first) return 'Some of the details sent were not valid.';
  const field = Array.isArray(first.loc) ? first.loc.filter((p) => p !== 'body').join('.') : '';
  return field ? `${field}: ${first.msg}` : first.msg;
}

/** Builds a ScoreReportError from any of the backend's error shapes. */
export async function errorFromResponse(res) {
  const status = res.status;
  const retryAfterSeconds = status === 429 ? parseRetryAfter(res) : null;
  let body = null;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  let code = null;
  let message = null;
  let missing = null;
  const detail = body?.detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    // Route errors: {"detail": {"code", "message", "missing"?}}
    code = detail.code ?? null;
    message = detail.message ?? null;
    missing = detail.missing ?? null;
  } else if (Array.isArray(detail)) {
    // FastAPI validation errors: {"detail": [{loc, msg, type}, ...]}
    code = 'VALIDATION_ERROR';
    message = validationMessage(detail);
  } else if (typeof detail === 'string') {
    message = detail;
  } else if (body && typeof body === 'object' && body.error) {
    // Middleware errors: {"error": true, "message", "code"}
    code = body.code ?? null;
    message = body.message ?? null;
  }

  if (status === 429) {
    code = code ?? 'RATE_LIMITED';
    message = rateLimitMessage(retryAfterSeconds);
  }
  if (!message) {
    message =
      status === 413
        ? 'The upload is too large. Each file must be 4 MB or less, 10 MB in total.'
        : `The assessment service returned an error (HTTP ${status}). Please try again.`;
  }
  return new ScoreReportError(message, { status, code: code ?? `HTTP_${status}`, missing, retryAfterSeconds });
}

async function send(path, init) {
  let res;
  try {
    res = await fetch(`${SCORE_REPORT_BASE}${path}`, init);
  } catch {
    throw new ScoreReportError('Could not reach the assessment service. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
    });
  }
  if (!res.ok) throw await errorFromResponse(res);
  return res;
}

const SCORE_OVERRIDE_KEYS = ['overall_score', 'listening_score', 'reading_score', 'speaking_score', 'writing_score'];

/**
 * POST /score-report/analyze. `files` is an array/FileList of 1–4 images or PDFs;
 * `overrides` may carry any of the five score keys (10–90) typed in by staff.
 */
export async function analyzeScorecard(files, overrides = {}) {
  validateFiles(files);
  const form = new FormData();
  for (const f of Array.from(files)) form.append('images', f, f.name);
  for (const key of SCORE_OVERRIDE_KEYS) {
    const v = overrides?.[key];
    if (v !== undefined && v !== null && v !== '') form.append(key, String(v));
  }
  const res = await send('/analyze', { method: 'POST', body: form });
  return res.json();
}

async function postPdf(path, payload) {
  const res = await send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
    body: JSON.stringify(payload),
  });
  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new ScoreReportError('The PDF came back empty. Please try again.', { status: res.status, code: 'EMPTY_PDF' });
  }
  return blob;
}

/** POST /score-report/pdf → Blob. payload: {scores, skills_profile, name?} */
export function downloadReportPdf(payload) {
  return postPdf('/pdf', payload);
}

/** POST /score-report/study-plan → Blob. See backend contract for payload fields. */
export function downloadStudyPlanPdf(payload) {
  return postPdf('/study-plan', payload);
}

/** Saves a Blob as a file via a temporary object URL. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Jane Doe" → "jane-doe"; empty → "student". */
export function fileSlug(name) {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'student';
}
