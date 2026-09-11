import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('registers keydown handler', () => {
    const spy = vi.spyOn(window, 'addEventListener');
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'j', handler }]));
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    spy.mockRestore();
  });

  it('calls handler on matching key press', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'k', handler }]));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('ignores events from input elements', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'j', handler }]));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('removes handler on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts([{ key: 'x', handler }]));
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    spy.mockRestore();
  });
});
