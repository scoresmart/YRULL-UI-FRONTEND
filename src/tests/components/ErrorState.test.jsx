import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../../components/ErrorState';

describe('ErrorState', () => {
  it('renders default title and description', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState title="Network error" description="Check your connection." />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Check your connection.')).toBeInTheDocument();
  });

  it('renders retry button when callback provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('calls retry on button click', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await user.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render button without callback', () => {
    render(<ErrorState />);
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });
});
