import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getCallHistory = vi.fn();

vi.mock('../../lib/api', () => ({
  whatsappApi: { getCallHistory: (...args) => getCallHistory(...args) },
  notesApi: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../lib/dataHooks', () => ({
  useContacts: () => ({ data: [], isLoading: false }),
}));

const { CallLogsPage } = await import('../../pages/user/CallLogs');

const renderPage = async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CallLogsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText('Total Calls');
  return view;
};

describe('CallLogsPage call-history shapes', () => {
  beforeEach(() => getCallHistory.mockReset());

  // The crash this guards: apiJSON turns an empty response body into {}, which
  // is truthy and so passed the `if (!callsQ.data)` guards, then blew up on
  // [...callsQ.data] with "callsQ.data is not iterable".
  it('renders when the API answers with {} for an empty body', async () => {
    getCallHistory.mockResolvedValue({});
    await renderPage();
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('renders when the API wraps the list as { calls: [...] }', async () => {
    getCallHistory.mockResolvedValue({
      calls: [
        { id: '1', direction: 'USER_INITIATED', status: 'ACCEPTED', from_number: '111' },
        { id: '2', direction: 'BUSINESS_INITIATED', status: 'ACCEPTED', to_number: '222' },
      ],
    });
    await renderPage();
    // The wrapped list must be unwrapped, not treated as a single opaque object.
    expect(within(screen.getByText('Total Calls').parentElement).getByText('2')).toBeInTheDocument();
  });

  it('renders a plain array unchanged', async () => {
    getCallHistory.mockResolvedValue([
      { id: '1', direction: 'USER_INITIATED', status: 'ACCEPTED', from_number: '111' },
    ]);
    await renderPage();
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
  });

  it('survives an unparseable body, which arrives as { raw: "..." }', async () => {
    getCallHistory.mockResolvedValue({ raw: '<html>gateway error</html>' });
    await renderPage();
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
  });
});

describe('formatRelativeTime', () => {
  it('returns a dash instead of throwing on a missing or invalid date', async () => {
    const { formatRelativeTime } = await import('../../lib/utils');
    // A call row carrying neither created_at nor timestamp used to crash the
    // whole Call Logs page here.
    expect(formatRelativeTime(undefined)).toBe('—');
    expect(formatRelativeTime(null)).toBe('—');
    expect(formatRelativeTime('')).toBe('—');
    expect(formatRelativeTime('not a date')).toBe('—');
    expect(formatRelativeTime(new Date('nope'))).toBe('—');
  });

  it('still formats a real date', async () => {
    const { formatRelativeTime } = await import('../../lib/utils');
    expect(formatRelativeTime(new Date(Date.now() - 5000))).toBe('just now');
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000))).toBe('5m ago');
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3600 * 1000))).toBe('3h ago');
  });
});
