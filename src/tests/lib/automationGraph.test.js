import { describe, it, expect } from 'vitest';
import {
  changeStepType,
  deleteStep,
  insertStep,
  loadGraph,
  reachableIds,
  toPayload,
  validateGraph,
} from '../../components/automations/builder/graph';

const trigger = { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: { triggerType: 'lead_created' } };
const step = (id, actionType, data = {}, x = 400) => ({ id, type: 'action', position: { x, y: 0 }, data: { actionType, ...data } });
const targetsOf = (edges, id) => edges.filter((e) => e.source === id).map((e) => e.target);

describe('loadGraph', () => {
  it('re-links a step left dangling by the old builder (trigger and template with no edge)', () => {
    const { nodes, edges, repaired } = loadGraph(
      [trigger, step('tpl', 'send_template', { templateName: 'new_lead_thank_you' }, 1300)],
      // The old builder kept a default edge to nodes that no longer exist.
      [{ id: 'e1-2', source: 'trigger-1', target: 'action-selection-1' }],
    );
    expect(repaired).toBe(1);
    expect(targetsOf(edges, 'trigger')).toEqual(['tpl']);
    expect(reachableIds(nodes, edges).has('tpl')).toBe(true);
  });

  it('chains several orphans in their old left-to-right order', () => {
    const { edges } = loadGraph([trigger, step('b', 'delay', { duration: 1 }, 800), step('a', 'add_tag', { tag: 'x' }, 400)], []);
    expect(targetsOf(edges, 'trigger')).toEqual(['a']);
    expect(targetsOf(edges, 'a')).toEqual(['b']);
  });

  it('drops placeholder nodes and migrates old field names', () => {
    const { nodes } = loadGraph(
      [trigger, { id: 'p', type: 'actionSelection', data: {} }, step('w', 'webhook', { config: 'https://x.io/h' }), step('t', 'add_tag', { tagName: 'Hot' })],
      JSON.stringify([]),
    );
    expect(nodes.find((n) => n.id === 'p')).toBeUndefined();
    expect(nodes.find((n) => n.id === 'w').data.url).toBe('https://x.io/h');
    expect(nodes.find((n) => n.id === 't').data.tag).toBe('Hot');
  });

  it('adds a trigger when a saved flow has none', () => {
    const { nodes } = loadGraph([], []);
    expect(nodes.filter((n) => n.type === 'trigger')).toHaveLength(1);
  });
});

describe('editing keeps the chain connected', () => {
  const base = () => {
    const { nodes, edges } = loadGraph(
      [trigger, step('email', 'send_email'), step('tpl', 'send_template')],
      [
        { source: 'trigger', target: 'email' },
        { source: 'email', target: 'tpl' },
      ],
    );
    return { nodes, edges };
  };

  it('deleting a middle step links its neighbours', () => {
    const { nodes, edges } = base();
    const next = deleteStep(nodes, edges, 'email');
    expect(targetsOf(next.edges, 'trigger')).toEqual(['tpl']);
    expect(next.nodes.find((n) => n.id === 'email')).toBeUndefined();
  });

  it('inserting after a step moves what followed it', () => {
    const { nodes, edges } = base();
    const next = insertStep(nodes, edges, { parentId: 'trigger', actionType: 'delay' });
    expect(targetsOf(next.edges, 'trigger')).toEqual([next.id]);
    expect(targetsOf(next.edges, next.id)).toEqual(['email']);
  });

  it('a condition inserted mid-chain keeps the rest on its Yes path', () => {
    const { nodes, edges } = base();
    const next = insertStep(nodes, edges, { parentId: 'trigger', actionType: 'condition' });
    const out = next.edges.filter((e) => e.source === next.id);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ target: 'email', sourceHandle: 'yes' });
  });

  it('refuses to delete or change a condition with steps on both paths', () => {
    let { nodes, edges } = loadGraph([trigger, step('c', 'condition', { field: 'tags', operator: 'contains', value: 'a' })], [{ source: 'trigger', target: 'c' }]);
    ({ nodes, edges } = insertStep(nodes, edges, { parentId: 'c', handle: 'yes', actionType: 'add_tag' }));
    ({ nodes, edges } = insertStep(nodes, edges, { parentId: 'c', handle: 'no', actionType: 'remove_tag' }));
    expect(deleteStep(nodes, edges, 'c').error).toMatch(/Both paths/);
    expect(changeStepType(nodes, edges, 'c', 'delay').error).toMatch(/Both paths/);
  });

  it('saves condition handles and nothing UI-only', () => {
    const { nodes, edges } = loadGraph([trigger, step('c', 'condition', { field: 'tags' })], [{ source: 'trigger', target: 'c' }]);
    const next = insertStep(nodes, edges, { parentId: 'c', handle: 'no', actionType: 'add_tag' });
    const payload = toPayload(next.nodes, next.edges);
    expect(payload.edges.find((e) => e.source === 'c')).toMatchObject({ sourceHandle: 'no', type: 'smoothstep' });
    expect(Object.keys(payload.nodes[0]).sort()).toEqual(['data', 'id', 'position', 'type']);
  });
});

describe('validateGraph', () => {
  it('needs a fallback template for a WhatsApp text to a CRM lead', () => {
    const graph = (fallbackTemplate) =>
      loadGraph([trigger, step('m', 'send_message', { message: 'Hi', fallbackTemplate })], [{ source: 'trigger', target: 'm' }]);
    const noFallback = graph('');
    expect(validateGraph(noFallback.nodes, noFallback.edges).some((i) => i.message.includes('fallback template'))).toBe(true);
    const withFallback = graph('new_lead_thank_you');
    expect(validateGraph(withFallback.nodes, withFallback.edges)).toEqual([]);
  });

  it('flags unconfigured and unsupported steps', () => {
    const { nodes, edges } = loadGraph(
      [trigger, step('m', 'send_message'), step('r', 'randomizer')],
      [
        { source: 'trigger', target: 'm' },
        { source: 'm', target: 'r' },
      ],
    );
    const messages = validateGraph(nodes, edges).map((i) => i.message);
    expect(messages).toContain('Write the message');
    expect(messages.some((m) => m.includes('Randomizer'))).toBe(true);
  });
});
