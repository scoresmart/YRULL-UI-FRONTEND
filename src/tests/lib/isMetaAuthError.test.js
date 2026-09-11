import { ApiError, isMetaAuthError } from '../../lib/api';

// The exact 400 the backend returns once Meta expires a workspace's token.
const EXPIRED_TOKEN_BODY = {
  error: 'The token has expired on Thursday, 20-Aug-26 06:07:32 PDT.',
  meta_error: {
    code: 190,
    type: 'OAuthException',
    message: 'The token has expired on Thursday, 20-Aug-26 06:07:32 PDT.',
  },
  waba_id: '920182787471489',
};

describe('ApiError', () => {
  it('carries status and body alongside the message', () => {
    const err = new ApiError('boom', {
      status: 400,
      body: EXPIRED_TOKEN_BODY,
      method: 'GET',
      path: '/api/whatsapp/templates',
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.body).toEqual(EXPIRED_TOKEN_BODY);
    expect(err.path).toBe('/api/whatsapp/templates');
  });
});

describe('isMetaAuthError', () => {
  it('detects an expired Meta token from the structured body', () => {
    const err = new ApiError(EXPIRED_TOKEN_BODY.error, { status: 400, body: EXPIRED_TOKEN_BODY });
    expect(isMetaAuthError(err)).toBe(true);
  });

  it('falls back to the message when no structured body is present', () => {
    expect(isMetaAuthError(new Error('The token has expired on Thursday'))).toBe(true);
    expect(isMetaAuthError(new Error('OAuthException'))).toBe(true);
  });

  it('ignores unrelated failures', () => {
    expect(isMetaAuthError(new ApiError('Not found', { status: 404, body: { error: 'Not found' } }))).toBe(false);
    expect(isMetaAuthError(new Error('Network request failed'))).toBe(false);
    expect(isMetaAuthError(undefined)).toBe(false);
  });
});
