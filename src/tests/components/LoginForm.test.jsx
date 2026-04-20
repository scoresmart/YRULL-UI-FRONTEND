import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { LoginForm } from '../../components/auth/LoginForm';

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renders a sign-in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign.in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty email', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /sign.in/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), '123');
    await user.click(screen.getByRole('button', { name: /sign.in/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 6/i)).toBeInTheDocument();
    });
  });

  it('has a link to forgot password', () => {
    renderLogin();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('has a password visibility toggle', () => {
    renderLogin();
    expect(screen.getByLabelText(/show password/i)).toBeInTheDocument();
  });
});
