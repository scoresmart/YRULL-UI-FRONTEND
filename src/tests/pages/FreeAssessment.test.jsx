import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../lib/api', () => ({ whatsappApi: { sendMedia: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const { FreeAssessmentPage } = await import('../../pages/user/FreeAssessment');
const { whatsappApi } = await import('../../lib/api');

const PROFILE = {
  open_response_speaking_writing_score: 62,
  reproducing_spoken_written_score: 55,
  extended_writing_score: 70,
  short_writing_score: 48,
  extended_speaking_score: 51,
  short_speaking_score: 66,
  multiple_skills_comprehension_score: 59,
  single_skill_comprehension_score: 73,
};

const analysis = (overrides = {}) => ({
  skills_profile: PROFILE,
  profile_status: 'measured',
  profile_sources: {},
  layout: 'desktop',
  scores: { overall_score: 61, listening_score: 58, reading_score: 63, speaking_score: 57, writing_score: 66 },
  scores_source: {},
  needs_input: [],
  bar_width_px: 300,
  warnings: [],
  task_estimates: [
    { key: 'RA', name: 'Read Aloud', percent: 71, counts_toward: ['Speaking', 'Reading'] },
    { key: 'WFD', name: 'Write From Dictation', percent: 42, counts_toward: ['Listening', 'Writing'] },
    { key: 'DI', name: 'Describe Image', percent: 55, counts_toward: ['Speaking'] },
  ],
  estimate_version: 'v1',
  ...overrides,
});

const respond = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: async () => JSON.stringify(body),
  json: async () => body,
});

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FreeAssessmentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const uploadAndAnalyze = async () => {
  const user = userEvent.setup();
  renderPage();
  await user.upload(screen.getByTestId('fa-file-input'), new File(['x'], 'report.png', { type: 'image/png' }));
  expect(screen.getByText('report.png')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /analyze/i }));
};

describe('FreeAssessmentPage', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('renders scores, the skills profile and tasks weakest first', async () => {
    globalThis.fetch.mockResolvedValue(respond(200, analysis()));
    await uploadAndAnalyze();

    expect(await screen.findByText('Skills Profile')).toBeInTheDocument();
    expect(screen.getByText('61')).toBeInTheDocument();
    for (const v of ['58', '63', '57', '66']) expect(screen.getAllByText(v).length).toBeGreaterThan(0);

    const rows = screen.getAllByTestId('fa-profile-row');
    expect(rows).toHaveLength(8);
    expect(within(rows[0]).getByText('Open Response Speaking and Writing')).toBeInTheDocument();
    expect(within(rows[0]).getByText('62')).toBeInTheDocument();
    expect(within(rows[7]).getByText('Single-skill Comprehension')).toBeInTheDocument();

    const tasks = screen.getAllByTestId('fa-task-row');
    expect(tasks.map((r) => within(r).getByText(/%$/).textContent)).toEqual(['42%', '55%', '71%']);
    expect(within(tasks[0]).getByText('Write From Dictation')).toBeInTheDocument();
    expect(within(tasks[0]).getAllByText('Listening, Writing').length).toBeGreaterThan(0);

    expect(screen.queryByText('Estimated')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download study plan/i })).toBeInTheDocument();
  });

  it('shows the backend message and renders no scores when analysis fails', async () => {
    globalThis.fetch.mockResolvedValue(
      respond(422, {
        detail: { code: 'IMAGE_TOO_BLURRY', message: 'The photo is too blurry to read. Please send a sharper picture.' },
      }),
    );
    await uploadAndAnalyze();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The photo is too blurry to read. Please send a sharper picture.',
    );
    expect(screen.queryByText('Skills Profile')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('fa-task-row')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /download pdf report/i })).not.toBeInTheDocument();
  });

  it('marks an estimated profile and shows its warnings', async () => {
    globalThis.fetch.mockResolvedValue(
      respond(200, analysis({ profile_status: 'estimated', warnings: ['Measured from a photo; values may be off by a point.'] })),
    );
    await uploadAndAnalyze();

    expect(await screen.findByText('Estimated')).toBeInTheDocument();
    expect(screen.getByText('Measured from a photo; values may be off by a point.')).toBeInTheDocument();
  });

  it('does not call the backend for a HEIC file', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderPage();
    await user.upload(screen.getByTestId('fa-file-input'), new File(['x'], 'IMG_1.heic', { type: 'image/heic' }));
    expect(screen.queryByText('IMG_1.heic')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze/i })).toBeDisabled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sends the assessment PDF to the student on WhatsApp', async () => {
    whatsappApi.sendMedia.mockResolvedValue({ ok: true });
    globalThis.fetch.mockResolvedValueOnce(respond(200, analysis())).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    });
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/student name/i), 'Priya Sharma');
    await user.upload(screen.getByTestId('fa-file-input'), new File(['x'], 'report.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    await screen.findByText('Skills Profile');

    const send = screen.getByRole('button', { name: /send assessment pdf/i });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText(/whatsapp number/i), '+61 412-345-678');
    expect(send).toBeEnabled();
    await user.click(send);

    expect(await screen.findByText('Sent to 61412345678.')).toBeInTheDocument();
    const args = whatsappApi.sendMedia.mock.calls[0][0];
    expect(args.to).toBe('61412345678');
    expect(args.caption).toBe('Your free PTE assessment, Priya Sharma');
    expect(args.file.name).toBe('priya-sharma-assessment.pdf');
    expect(args.file.type).toBe('application/pdf');
  });

  it('shows the send error and keeps the form usable', async () => {
    whatsappApi.sendMedia.mockRejectedValue(new Error('Outside the 24-hour window'));
    globalThis.fetch.mockResolvedValueOnce(respond(200, analysis())).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    });
    const user = userEvent.setup();
    renderPage();
    await user.upload(screen.getByTestId('fa-file-input'), new File(['x'], 'report.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /analyze/i }));
    await screen.findByText('Skills Profile');
    await user.type(screen.getByLabelText(/whatsapp number/i), '61412345678');
    await user.click(screen.getByRole('button', { name: /send assessment pdf/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Outside the 24-hour window');
    expect(screen.getByRole('button', { name: /send assessment pdf/i })).toBeEnabled();
  });
});
