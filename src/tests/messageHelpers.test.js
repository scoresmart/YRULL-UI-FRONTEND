import { describe, expect, it } from 'vitest';
import { documentTypeLabel, groupAlbums, isAlbumStub } from '../components/whatsapp/messageHelpers';

const at = (s) => `2026-11-10T03:05:${String(s).padStart(2, '0')}.000Z`;
const stub = (id, body = '[unsupported]', t = 50) => ({ id, message_type: 'unsupported', direction: 'inbound', body, created_at: at(t) });
const img = (id, t) => ({ id, message_type: 'image', direction: 'inbound', body: '[image]', created_at: at(t) });

describe('documentTypeLabel', () => {
  it('maps the long Office MIME types to short labels', () => {
    expect(documentTypeLabel('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('DOCX');
    expect(documentTypeLabel('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('XLSX');
    expect(documentTypeLabel('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('PPTX');
    expect(documentTypeLabel('application/msword')).toBe('DOC');
  });

  it('maps common simple types', () => {
    expect(documentTypeLabel('application/pdf')).toBe('PDF');
    expect(documentTypeLabel('text/csv')).toBe('CSV');
    expect(documentTypeLabel('application/zip')).toBe('ZIP');
  });

  it('ignores a charset / parameter suffix', () => {
    expect(documentTypeLabel('text/plain; charset=utf-8')).toBe('TXT');
  });

  it('cleans a short unknown subtype but never shows a long ugly one', () => {
    expect(documentTypeLabel('image/heic')).toBe('HEIC');
    // The exact bug from the screenshot: a long vendor subtype must not leak through.
    expect(documentTypeLabel('application/vnd.some.brand.new.unknownlongformat')).toBe('File');
  });

  it('falls back to File for empty or missing MIME', () => {
    expect(documentTypeLabel('')).toBe('File');
    expect(documentTypeLabel(null)).toBe('File');
    expect(documentTypeLabel(undefined)).toBe('File');
  });
});

describe('isAlbumStub', () => {
  it('matches the album stub bodies only', () => {
    expect(isAlbumStub(stub('a', '[unsupported]'))).toBe(true);
    expect(isAlbumStub(stub('a', '[unsupported_album]'))).toBe(true);
    expect(isAlbumStub(stub('a', '[unsupported_view_once]'))).toBe(false);
    expect(isAlbumStub(img('i', 51))).toBe(false);
  });
});

describe('groupAlbums', () => {
  it('groups the screenshot case: a legacy [unsupported] stub + two photos', () => {
    const msgs = [stub('s', '[unsupported]', 50), img('i1', 53), img('i2', 54)];
    const { stubItems, memberIds } = groupAlbums(msgs);
    expect(stubItems.get('s').map((m) => m.id)).toEqual(['i1', 'i2']);
    expect([...memberIds]).toEqual(['i1', 'i2']);
  });

  it('does NOT group a lone photo after a plain [unsupported] stub (could be a view-once notice)', () => {
    const { stubItems, memberIds } = groupAlbums([stub('s', '[unsupported]', 50), img('i1', 53)]);
    expect(stubItems.size).toBe(0);
    expect(memberIds.size).toBe(0);
  });

  it('groups a single photo when the stub is explicitly tagged [unsupported_album]', () => {
    const { stubItems } = groupAlbums([stub('s', '[unsupported_album]', 50), img('i1', 53)]);
    expect(stubItems.get('s').map((m) => m.id)).toEqual(['i1']);
  });

  it('leaves a withheld message (no media after it) alone', () => {
    const msgs = [stub('s', '[unsupported]', 50), { id: 't', message_type: 'text', direction: 'inbound', body: 'hi', created_at: at(55) }];
    const { stubItems, memberIds } = groupAlbums(msgs);
    expect(stubItems.size).toBe(0);
    expect(memberIds.size).toBe(0);
  });

  it('stops the run at an outbound reply', () => {
    const msgs = [stub('s', '[unsupported_album]', 50), img('i1', 51), { id: 'o', message_type: 'image', direction: 'outbound', body: '[image]', created_at: at(52) }];
    const { stubItems } = groupAlbums(msgs);
    expect(stubItems.get('s').map((m) => m.id)).toEqual(['i1']);
  });

  it('does not fold a photo that arrives long after the stub', () => {
    const far = { id: 'i2', message_type: 'image', direction: 'inbound', body: '[image]', created_at: '2026-11-10T03:10:00.000Z' };
    const { stubItems } = groupAlbums([stub('s', '[unsupported_album]', 50), img('i1', 51), far]);
    expect(stubItems.get('s').map((m) => m.id)).toEqual(['i1']);
  });

  it('returns empty structures when there is no album', () => {
    const { stubItems, memberIds } = groupAlbums([img('i1', 51), img('i2', 52)]);
    expect(stubItems.size).toBe(0);
    expect(memberIds.size).toBe(0);
  });
});
