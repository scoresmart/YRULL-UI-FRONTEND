import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../hooks/useAuth';

function renderProtected(authState, { requiredRole = 'user' } = {}) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
              <div data-testid="protected-content">Secret content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route path="/admin" element={<div data-testid="admin">Admin</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows skeleton while auth state is idle', () => {
    useAuth.mockReturnValue({ status: 'idle', session: null, profile: null });
    renderProtected({ status: 'idle' });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    useAuth.mockReturnValue({ status: 'loading', session: null, profile: null });
    renderProtected({ status: 'loading' });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to login when no session', () => {
    useAuth.mockReturnValue({ status: 'guest', session: null, profile: null });
    renderProtected({ status: 'guest', session: null });
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({
      status: 'authed',
      session: { user: { id: '1' } },
      profile: { role: 'user' },
    });
    renderProtected({ status: 'authed', session: {} });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects user to dashboard when accessing admin route', () => {
    useAuth.mockReturnValue({
      status: 'authed',
      session: { user: { id: '1' } },
      profile: { role: 'user' },
    });
    renderProtected({ status: 'authed', session: {} }, { requiredRole: 'admin' });
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
