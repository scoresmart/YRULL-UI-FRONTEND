import {
  clearMetaAuthError,
  isMetaTokenExpired,
  markMetaAuthError,
  subscribeMetaAuthStatus,
} from '../../lib/metaAuthStatus';

describe('metaAuthStatus', () => {
  afterEach(() => clearMetaAuthError());

  it('starts clean', () => {
    expect(isMetaTokenExpired()).toBe(false);
  });

  it('latches once a Meta auth failure is seen', () => {
    markMetaAuthError();
    expect(isMetaTokenExpired()).toBe(true);
  });

  it('clears on reconnect', () => {
    markMetaAuthError();
    clearMetaAuthError();
    expect(isMetaTokenExpired()).toBe(false);
  });

  it('notifies subscribers on change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMetaAuthStatus(listener);

    markMetaAuthError();
    expect(listener).toHaveBeenCalledTimes(1);

    // Already latched — no redundant notification.
    markMetaAuthError();
    expect(listener).toHaveBeenCalledTimes(1);

    clearMetaAuthError();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    markMetaAuthError();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
