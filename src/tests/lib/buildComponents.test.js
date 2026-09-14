import { describe, it, expect } from 'vitest';
import { buildComponents } from '../../lib/templates';

describe('buildComponents', () => {
  // Meta takes an ordered array of typed components. The form used to post its
  // own flat shape, so every submission was rejected before reaching Meta.
  it('always produces a BODY component', () => {
    const c = buildComponents({ body: 'Hello there' });
    expect(c).toEqual([{ type: 'BODY', text: 'Hello there' }]);
  });

  it('attaches a sample for each {{n}} in the body, which Meta requires', () => {
    const c = buildComponents({ body: 'Hi {{1}}, your {{2}} is ready' });
    expect(c[0].example).toEqual({ body_text: [['sample 1', 'sample 2']] });
  });

  it('sizes samples by the highest placeholder, not how many appear', () => {
    // "{{2}}" alone still means Meta expects two values.
    const c = buildComponents({ body: 'Only {{2}} here' });
    expect(c[0].example.body_text[0]).toHaveLength(2);
  });

  it('adds no example when the body has no variables', () => {
    expect(buildComponents({ body: 'No variables' })[0].example).toBeUndefined();
  });

  it('orders header, body, footer and buttons the way Meta expects', () => {
    const c = buildComponents({
      headerType: 'TEXT',
      header: 'Thanks for contacting us',
      body: 'Hi {{1}}',
      footer: 'Reply STOP to opt out',
      buttons: [{ type: 'QUICK_REPLY', text: 'Book a call' }],
    });
    expect(c.map((x) => x.type)).toEqual(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']);
    expect(c[0]).toMatchObject({ format: 'TEXT', text: 'Thanks for contacting us' });
  });

  it('keeps the url on a CTA button and omits it on a quick reply', () => {
    const c = buildComponents({
      body: 'x',
      buttons: [
        { type: 'URL', text: 'Visit', value: 'https://example.com' },
        { type: 'QUICK_REPLY', text: 'No thanks' },
      ],
    });
    expect(c[1].buttons).toEqual([
      { type: 'URL', text: 'Visit', url: 'https://example.com' },
      { type: 'QUICK_REPLY', text: 'No thanks' },
    ]);
  });

  it('drops buttons with no label rather than sending an empty one', () => {
    const c = buildComponents({ body: 'x', buttons: [{ type: 'QUICK_REPLY', text: '  ' }] });
    expect(c.map((x) => x.type)).toEqual(['BODY']);
  });

  it('omits an empty header and footer entirely', () => {
    const c = buildComponents({ headerType: 'TEXT', header: '   ', body: 'x', footer: '' });
    expect(c.map((x) => x.type)).toEqual(['BODY']);
  });

  it('sends format only for a media header', () => {
    const c = buildComponents({ headerType: 'IMAGE', body: 'x' });
    expect(c[0]).toEqual({ type: 'HEADER', format: 'IMAGE' });
  });
});
