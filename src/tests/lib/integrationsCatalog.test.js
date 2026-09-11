import { describe, it, expect } from 'vitest';
import { INTEGRATIONS, isIntegrationConnected } from '../../lib/integrationsCatalog';

const byKey = (key) => INTEGRATIONS.find((i) => i.key === key);

describe('integration catalogue', () => {
  it('is the one list both the builder and settings read', () => {
    // The builder used to carry its own shorter copy, so a connected Cellcast or
    // Meta CAPI could never be chosen as an automation step.
    const keys = INTEGRATIONS.map((i) => i.key);
    expect(keys).toEqual(expect.arrayContaining(['airtable', 'meta_capi', 'cellcast', 'voipcloud']));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every entry what the picker renders', () => {
    for (const integration of INTEGRATIONS) {
      expect(integration.name).toBeTruthy();
      expect(integration.description).toBeTruthy();
      expect(integration.category).toBeTruthy();
    }
  });
});

describe('isIntegrationConnected', () => {
  const airtable = byKey('airtable');

  it('treats a missing config as not connected', () => {
    expect(isIntegrationConnected(airtable, undefined)).toBe(false);
    expect(isIntegrationConnected(airtable, {})).toBe(false);
  });

  it('counts a service with any field filled in', () => {
    expect(isIntegrationConnected(airtable, { AIRTABLE_API_KEY: 'key123' })).toBe(true);
  });

  it('ignores blank and whitespace-only values', () => {
    expect(isIntegrationConnected(airtable, { AIRTABLE_API_KEY: '' })).toBe(false);
    expect(isIntegrationConnected(airtable, { AIRTABLE_API_KEY: '   ' })).toBe(false);
  });

  it('ignores values stored under keys the service does not declare', () => {
    expect(isIntegrationConnected(airtable, { SOME_OTHER_KEY: 'value' })).toBe(false);
  });

  it('falls back to any stored value for the OAuth services, which declare no fields', () => {
    const whatsapp = byKey('whatsapp');
    expect(whatsapp.fields).toHaveLength(0);
    expect(isIntegrationConnected(whatsapp, { phone_number_id: '123' })).toBe(true);
    expect(isIntegrationConnected(whatsapp, { phone_number_id: '' })).toBe(false);
  });
});
