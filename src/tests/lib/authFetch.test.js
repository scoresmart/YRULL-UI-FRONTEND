import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: (...a) => getSession(...a) } },
}));

const fetchProfile = vi.fn();
let profile = null;
vi.mock('../../store/authStore', () => ({
  useAuthStore: { getState: () => ({ profile, fetchProfile }) },
}));

const { authFetch } = await import('../../lib/api');

const headersOf = (call) => call[1].headers;

describe('authFetch workspace header', () => {
  beforeEach(() => {
    profile = null;
    fetchProfile.mockReset();
    getSession.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  });

  it('sends the workspace header when the profile is already loaded', async () => {
    profile = { workspace_id: 'ws-1' };
    await authFetch('/x');
    expect(headersOf(global.fetch.mock.calls[0])['X-Workspace-Id']).toBe('ws-1');
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it('waits for the profile rather than sending no header at all', async () => {
    // The bug: a page firing its query on mount raced the profile load, so the
    // request went out bare and the backend answered 400 missing_workspace_header
    // — with nothing to retry against, since the query key never changed.
    fetchProfile.mockImplementation(async () => {
      profile = { workspace_id: 'ws-2' };
    });
    await authFetch('/x');
    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(headersOf(global.fetch.mock.calls[0])['X-Workspace-Id']).toBe('ws-2');
  });

  it('fetches the profile once for concurrent callers, not once each', async () => {
    let resolve;
    fetchProfile.mockImplementation(
      () => new Promise((r) => { resolve = () => { profile = { workspace_id: 'ws-3' }; r(); }; }),
    );
    const inflight = [authFetch('/a'), authFetch('/b'), authFetch('/c')];
    await new Promise((r) => setTimeout(r, 0));
    resolve();
    await Promise.all(inflight);
    // The point is one lookup for three callers, not three; the exact id is
    // covered by the tests above.
    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    for (const call of global.fetch.mock.calls) {
      expect(headersOf(call)['X-Workspace-Id']).toBeTruthy();
    }
  });

  it('does not block a signed-out request on a profile it will never have', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await authFetch('/x');
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(headersOf(global.fetch.mock.calls[0])['X-Workspace-Id']).toBeUndefined();
  });

  it('still sends the request if the profile lookup throws', async () => {
    fetchProfile.mockRejectedValue(new Error('network'));
    await authFetch('/x');
    expect(global.fetch).toHaveBeenCalled();
    expect(headersOf(global.fetch.mock.calls[0])['X-Workspace-Id']).toBeUndefined();
  });
});
