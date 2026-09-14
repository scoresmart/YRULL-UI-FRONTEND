import { describe, it, expect } from 'vitest';
import {
  simulateAutomation,
  evaluateTrigger,
  interpolate,
  buildTokens,
  DEFAULT_SAMPLE_INPUT,
} from '../../lib/automationSimulator';

// Small helpers so each test reads as the flow it is about, rather than as a
// wall of ReactFlow boilerplate.
const trigger = (data = {}) => ({ id: 'trigger-1', type: 'trigger', data });
const action = (id, data) => ({ id, type: 'action', data });
const edge = (source, target) => ({ id: `e-${source}-${target}`, source, target });

const chain = (triggerData, ...actions) => {
  const nodes = [trigger(triggerData), ...actions];
  const edges = [];
  let prev = 'trigger-1';
  for (const a of actions) {
    edges.push(edge(prev, a.id));
    prev = a.id;
  }
  return { nodes, edges };
};

describe('interpolate', () => {
  const tokens = buildTokens(DEFAULT_SAMPLE_INPUT);

  it('fills placeholders from the sample contact', () => {
    const { text, unresolved } = interpolate('Hi {first_name}!', tokens);
    expect(text).toBe('Hi Test!');
    expect(unresolved).toEqual([]);
  });

  it('reports tokens it has no value for instead of silently blanking them', () => {
    // A blank {course_name} in a live send is a message that reads "Book your ."
    const { text, unresolved } = interpolate('Book {course_name} now', buildTokens({ contactName: 'A' }));
    expect(unresolved).toEqual(['course_name']);
    expect(text).toContain('{course_name}');
  });

  it('lists an unknown token once, however often it appears', () => {
    const { unresolved } = interpolate('{nope} and {nope}', tokens);
    expect(unresolved).toEqual(['nope']);
  });

  it('leaves text with no placeholders alone', () => {
    expect(interpolate('plain text', tokens).text).toBe('plain text');
    expect(interpolate('', tokens).text).toBe('');
  });
});

describe('evaluateTrigger', () => {
  it('matches a keyword trigger when the sample message contains it', () => {
    const result = evaluateTrigger(trigger({ triggerType: 'new_message', keyword: 'PRICE' }), {
      message: 'what is the price?',
    });
    expect(result.matched).toBe(true);
  });

  it('does not match when the keyword is absent, and says so', () => {
    const result = evaluateTrigger(trigger({ triggerType: 'new_message', keyword: 'price' }), {
      message: 'hello there',
    });
    expect(result.matched).toBe(false);
    expect(result.reason).toContain('would not run');
  });

  it('matches any message when no keyword is set', () => {
    const result = evaluateTrigger(trigger({ triggerType: 'new_message', keyword: null }), {
      message: 'anything at all',
    });
    expect(result.matched).toBe(true);
  });

  it('treats a missing trigger type as an error, not a non-match', () => {
    const result = evaluateTrigger(trigger({ triggerType: null }), {});
    expect(result.severity).toBe('error');
  });

  it('matches a CRM status trigger only on the configured status', () => {
    const node = trigger({ triggerType: 'airtable_status', status: 'Enrolled' });
    expect(evaluateTrigger(node, { status: 'enrolled' }).matched).toBe(true);
    expect(evaluateTrigger(node, { status: 'New' }).matched).toBe(false);
  });

  it('fires call and lead triggers regardless of the sample message', () => {
    for (const type of ['missed_call', 'incoming_call', 'lead_created']) {
      expect(evaluateTrigger(trigger({ triggerType: type }), { message: '' }).matched).toBe(true);
    }
  });
});

describe('simulateAutomation', () => {
  it('walks a simple WhatsApp flow and reports what would be sent', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message', keyword: 'hi' },
      action('a1', { actionType: 'send_message', message: 'Hey {first_name}!' }),
      action('a2', { actionType: 'add_tag', tagId: 't1', tagName: 'lead' }),
    );
    const result = simulateAutomation({ nodes, edges, input: { message: 'hi there' } });

    expect(result.trigger.matched).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.steps.map((s) => s.label)).toEqual(['WhatsApp', 'Add Tag']);
    expect(result.steps[0].detail).toBe('Hey Test!');
    expect(result.sent).toHaveLength(1);
  });

  it('flags a send step with no message text as an error', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'send_message', message: '   ' }),
    );
    const result = simulateAutomation({ nodes, edges });

    expect(result.steps[0].status).toBe('error');
    expect(result.errors.join(' ')).toContain('empty message');
    // An empty message must not be counted as something a live run would send.
    expect(result.sent).toHaveLength(0);
  });

  it('flags a tag step with no tag chosen', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'add_tag', tagId: null }),
    );
    const result = simulateAutomation({ nodes, edges });
    expect(result.steps[0].status).toBe('error');
  });

  it('fast-forwards a delay rather than reporting it as done', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'delay', duration: 4, unit: 'days' }),
      action('a2', { actionType: 'send_message', message: 'Still there?' }),
    );
    const result = simulateAutomation({ nodes, edges });

    expect(result.steps[0].status).toBe('skipped');
    expect(result.steps[0].detail).toBe('wait 4 days');
    // The step after a wait still has to be checked, not cut off by it.
    expect(result.steps[1].label).toBe('WhatsApp');
  });

  it('treats a delay with no duration as an error', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'delay', duration: 0 }),
    );
    expect(simulateAutomation({ nodes, edges }).steps[0].status).toBe('error');
  });

  it('warns that an unconfigured condition sends everyone down every branch', () => {
    const nodes = [
      trigger({ triggerType: 'new_message' }),
      action('c1', { actionType: 'condition' }),
      action('a1', { actionType: 'send_message', message: 'yes' }),
      action('a2', { actionType: 'send_message', message: 'no' }),
    ];
    const edges = [edge('trigger-1', 'c1'), edge('c1', 'a1'), edge('c1', 'a2')];
    const result = simulateAutomation({ nodes, edges });

    expect(result.steps[0].status).toBe('warning');
    expect(result.warnings.join(' ')).toContain('2 branches');
    // Both branches are walked, because live it would take both.
    expect(result.steps).toHaveLength(3);
  });

  it('detects a step that is wired to nothing the trigger can reach', () => {
    const nodes = [
      trigger({ triggerType: 'new_message' }),
      action('a1', { actionType: 'send_message', message: 'Hello' }),
      action('orphan', { actionType: 'send_message', message: 'Never runs' }),
    ];
    const edges = [edge('trigger-1', 'a1')];
    const result = simulateAutomation({ nodes, edges });

    expect(result.warnings.join(' ')).toContain('not connected to the trigger');
    expect(result.steps).toHaveLength(1);
  });

  it('warns when the flow still ends on a "choose a step" placeholder', () => {
    const nodes = [
      trigger({ triggerType: 'new_message' }),
      action('a1', { actionType: 'send_message', message: 'Hi' }),
      { id: 'action-selection-1', type: 'actionSelection', data: { parentId: 'a1' } },
    ];
    const edges = [edge('trigger-1', 'a1'), edge('a1', 'action-selection-1')];
    const result = simulateAutomation({ nodes, edges });
    expect(result.warnings.join(' ')).toContain('unfinished');
  });

  it('errors when there is no trigger at all', () => {
    const result = simulateAutomation({ nodes: [action('a1', { actionType: 'note' })], edges: [] });
    expect(result.errors.join(' ')).toContain('no trigger');
    expect(result.steps).toEqual([]);
  });

  it('errors when the trigger leads nowhere', () => {
    const result = simulateAutomation({ nodes: [trigger({ triggerType: 'new_message' })], edges: [] });
    expect(result.errors.join(' ')).toContain('no steps');
  });

  it('still reports the steps when the trigger does not match the sample', () => {
    // Otherwise a mistyped test message would hide every other problem.
    const { nodes, edges } = chain(
      { triggerType: 'new_message', keyword: 'price' },
      action('a1', { actionType: 'send_message', message: '' }),
    );
    const result = simulateAutomation({ nodes, edges, input: { message: 'hello' } });

    expect(result.trigger.matched).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe('error');
  });

  it('does not hang on a flow that loops back on itself', () => {
    const nodes = [
      trigger({ triggerType: 'new_message' }),
      action('a1', { actionType: 'send_message', message: 'one' }),
      action('a2', { actionType: 'send_message', message: 'two' }),
    ];
    const edges = [edge('trigger-1', 'a1'), edge('a1', 'a2'), edge('a2', 'a1')];
    const result = simulateAutomation({ nodes, edges });
    expect(result.steps).toHaveLength(2);
  });

  it('reports a webhook as not called rather than as run', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'webhook', config: 'https://example.com/hook' }),
    );
    const result = simulateAutomation({ nodes, edges });
    expect(result.steps[0].status).toBe('skipped');
    expect(result.steps[0].issues.join(' ')).toContain('Not called');
  });

  it('rejects a webhook URL that is not a URL', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'webhook', config: 'example.com/hook' }),
    );
    expect(simulateAutomation({ nodes, edges }).steps[0].status).toBe('error');
  });

  it('checks both halves of an email step', () => {
    const { nodes, edges } = chain(
      { triggerType: 'lead_created' },
      action('a1', { actionType: 'send_email', subject: '', body: '' }),
    );
    const result = simulateAutomation({ nodes, edges });
    expect(result.steps[0].status).toBe('error');
    expect(result.steps[0].issues).toHaveLength(2);
  });

  it('flags a Claude step with no prompt', () => {
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'custom_integration', integrationKey: 'anthropic', prompt: '' }),
    );
    expect(simulateAutomation({ nodes, edges }).steps[0].status).toBe('error');
  });

  it('never reports anything as actually sent', () => {
    // The whole promise of the dry run: side-effect steps are described, not run.
    const { nodes, edges } = chain(
      { triggerType: 'new_message' },
      action('a1', { actionType: 'send_message', message: 'Hi' }),
      action('a2', { actionType: 'webhook', config: 'https://example.com' }),
      action('a3', { actionType: 'custom_integration', integrationKey: 'airtable' }),
    );
    const result = simulateAutomation({ nodes, edges });
    expect(result.steps.filter((s) => s.status === 'skipped')).toHaveLength(2);
  });
});
