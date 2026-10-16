import { describe, it, expect, vi, beforeEach } from 'vitest';

const { analyzeScorecard, downloadReportPdf, downloadStudyPlanPdf, ScoreReportError } = await import(
  '../../lib/scoreReportApi'
);

const file = (name, size = 1000, type = 'image/png') => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

const jsonResponse = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k] ?? headers[k.toLowerCase()] ?? null },
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
  json: async () => body,
  blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
});

const caught = async (p) => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error('expected a rejection');
};

describe('analyzeScorecard request', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { scores: {} }));
  });

  it('posts every file as an "images" field to the same-origin proxy with no auth headers', async () => {
    const a = file('a.png');
    const b = file('b.pdf', 1000, 'application/pdf');
    await analyzeScorecard([a, b], { overall_score: 65, reading_score: '' });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/prepsmart-api/score-report/analyze');
    expect(init.method).toBe('POST');
    const form = init.body;
    expect(form).toBeInstanceOf(FormData);
    expect(form.getAll('images').map((f) => f.name)).toEqual(['a.png', 'b.pdf']);
    expect(form.get('overall_score')).toBe('65');
    expect(form.has('reading_score')).toBe(false);

    // This is a different service from the Yrull backend: no Yrull token or
    // workspace id may leak to it.
    const headers = init.headers ?? {};
    const names = Object.keys(headers).map((k) => k.toLowerCase());
    expect(names).not.toContain('authorization');
    expect(names).not.toContain('x-workspace-id');
  });
});

describe('analyzeScorecard client-side checks', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('rejects HEIC with the backend wording and sends nothing', async () => {
    const err = await caught(analyzeScorecard([file('IMG_0001.HEIC', 1000, '')]));
    expect(err).toBeInstanceOf(ScoreReportError);
    expect(err.code).toBe('UNSUPPORTED_FILE');
    expect(err.message).toMatch(/HEIC photos can't be read yet/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects more than 4 files', async () => {
    const err = await caught(analyzeScorecard([1, 2, 3, 4, 5].map((i) => file(`${i}.png`))));
    expect(err.code).toBe('TOO_MANY_FILES');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects a file over 4 MB', async () => {
    const err = await caught(analyzeScorecard([file('big.jpg', 4 * 1024 * 1024 + 1, 'image/jpeg')]));
    expect(err.code).toBe('FILE_TOO_LARGE');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects an empty selection', async () => {
    const err = await caught(analyzeScorecard([]));
    expect(err.code).toBe('NO_FILES');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('error shapes', () => {
  const run = async (res) => {
    globalThis.fetch = vi.fn().mockResolvedValue(res);
    return caught(analyzeScorecard([file('a.png')]));
  };

  it('route errors: {"detail": {code, message, missing}}', async () => {
    const err = await run(
      jsonResponse(422, {
        detail: { code: 'MISSING_ITEMS', message: 'Missing: Speaking. Please upload a screenshot that shows it.', missing: ['speaking_score'] },
      }),
    );
    expect(err.status).toBe(422);
    expect(err.code).toBe('MISSING_ITEMS');
    expect(err.message).toBe('Missing: Speaking. Please upload a screenshot that shows it.');
    expect(err.missing).toEqual(['speaking_score']);
  });

  it('middleware 413: {"error": true, message, code}', async () => {
    const err = await run(jsonResponse(413, { error: true, message: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' }));
    expect(err.status).toBe(413);
    expect(err.code).toBe('PAYLOAD_TOO_LARGE');
    expect(err.message).toBe('Request body too large');
  });

  it('FastAPI validation 422: {"detail": [...]}', async () => {
    const err = await run(
      jsonResponse(422, { detail: [{ loc: ['body', 'overall_score'], msg: 'Input should be less than or equal to 90', type: 'x' }] }),
    );
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('overall_score: Input should be less than or equal to 90');
  });

  it('429 reads Retry-After and says when to try again', async () => {
    const err = await run(
      jsonResponse(429, { detail: { code: 'RATE_LIMITED', message: 'Too many requests' } }, { 'Retry-After': '240' }),
    );
    expect(err.status).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryAfterSeconds).toBe(240);
    expect(err.message).toBe('Too many uploads. Please try again in 4 minutes.');
  });

  it('a non-JSON error body still gives a readable error', async () => {
    const res = jsonResponse(502);
    res.text = async () => '<html>Bad gateway</html>';
    const err = await run(res);
    expect(err.status).toBe(502);
    expect(err.message).toMatch(/HTTP 502/);
  });

  it('a network failure is reported, not swallowed', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await caught(analyzeScorecard([file('a.png')]));
    expect(err.code).toBe('NETWORK_ERROR');
  });
});

describe('PDF downloads', () => {
  const payload = { scores: { overall_score: 60 }, skills_profile: {}, name: 'Jane' };

  it.each([
    ['report', downloadReportPdf, '/prepsmart-api/score-report/pdf'],
    ['study plan', downloadStudyPlanPdf, '/prepsmart-api/score-report/study-plan'],
  ])('%s posts JSON without auth headers and returns a Blob', async (_label, fn, url) => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(200));
    const blob = await fn(payload);
    expect(blob).toBeInstanceOf(Blob);
    const [calledUrl, init] = globalThis.fetch.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(init.body)).toEqual(payload);
    const names = Object.keys(init.headers).map((k) => k.toLowerCase());
    expect(names).not.toContain('authorization');
    expect(names).not.toContain('x-workspace-id');
  });

  it('surfaces a backend 422 on the study plan', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(422, { detail: { code: 'INVALID_TARGET', message: 'Target must be above the current score.' } }));
    const err = await caught(downloadStudyPlanPdf(payload));
    expect(err.code).toBe('INVALID_TARGET');
    expect(err.message).toBe('Target must be above the current score.');
  });
});
