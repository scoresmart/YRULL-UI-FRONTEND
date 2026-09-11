import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsDesktop } from '../../hooks/useMediaQuery';

describe('useMediaQuery', () => {
  it('returns false when media query does not match', () => {
    window.matchMedia.mockImplementation((q) => ({
      matches: false,
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'));
    expect(result.current).toBe(false);
  });

  it('returns true when media query matches', () => {
    window.matchMedia.mockImplementation((q) => ({
      matches: true,
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'));
    expect(result.current).toBe(true);
  });
});

describe('useIsMobile', () => {
  it('returns a boolean', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe('boolean');
  });
});

describe('useIsDesktop', () => {
  it('returns a boolean', () => {
    const { result } = renderHook(() => useIsDesktop());
    expect(typeof result.current).toBe('boolean');
  });
});
