import { ACTIONS_BY_TYPE, nodeIssues } from './catalog';

/*
 * The automation graph, as the engine walks it: ReactFlow-style nodes
 * ({id, type: 'trigger' | 'action', data}) and edges ({source, target,
 * sourceHandle?}). The engine starts at the trigger and follows edges, so a
 * step that nothing points at never runs. Every edit here keeps the chain
 * connected; the canvas only renders what these functions produce.
 */

export const NODE_WIDTH = 300;
const NODE_HEIGHT = 128;
const V_GAP = 64;
const H_GAP = 56;

const CONDITION = 'condition';
const isCondition = (node) => node?.type === 'action' && node.data?.actionType === CONDITION;

let seq = 0;
export const newStepId = () => `step-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const parseJson = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normaliseHandle = (handle, sourceIsCondition) => {
  if (!sourceIsCondition) return undefined;
  const h = String(handle ?? '').toLowerCase();
  return h === 'no' || h === 'false' ? 'no' : 'yes';
};

/**
 * Turn a saved automation into a clean graph: drop placeholder nodes the old
 * builder persisted, drop edges pointing at nothing, migrate old field names,
 * and re-link steps that were left dangling by the old builder's delete.
 * Returns how many links were repaired so the page can say so.
 */
export function loadGraph(rawNodes, rawEdges) {
  const inNodes = Array.isArray(parseJson(rawNodes)) ? parseJson(rawNodes) : [];
  const inEdges = Array.isArray(parseJson(rawEdges)) ? parseJson(rawEdges) : [];

  let nodes = inNodes
    .filter((n) => n && n.id && (n.type === 'trigger' || n.type === 'action'))
    .map((n) => ({ id: String(n.id), type: n.type, position: n.position || { x: 0, y: 0 }, data: migrateData(n) }));

  if (!nodes.some((n) => n.type === 'trigger')) {
    nodes = [{ id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: {} }, ...nodes];
  }
  // The engine starts at the first trigger; any others are unreachable noise.
  const triggerId = nodes.find((n) => n.type === 'trigger').id;
  nodes = nodes.filter((n) => n.type !== 'trigger' || n.id === triggerId);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set();
  let edges = [];
  for (const e of inEdges) {
    if (!e || !byId.has(String(e.source)) || !byId.has(String(e.target)) || e.source === e.target) continue;
    const source = String(e.source);
    const target = String(e.target);
    const sourceHandle = normaliseHandle(e.sourceHandle, isCondition(byId.get(source)));
    const key = `${source}|${sourceHandle || ''}|${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(makeEdge(source, target, sourceHandle));
  }

  // Re-link steps nothing points at, in the order they sat on the old canvas.
  let repaired = 0;
  const reachable = reachableIds(nodes, edges);
  const orphans = nodes
    .filter((n) => n.type === 'action' && !reachable.has(n.id) && !edges.some((e) => e.target === n.id))
    .sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0) || (a.position?.y ?? 0) - (b.position?.y ?? 0));
  if (orphans.length) {
    let tail = lastInChain(nodes, edges, triggerId);
    for (const orphan of orphans) {
      if (!tail) break;
      edges.push(makeEdge(tail.id, orphan.id, isCondition(tail) ? 'yes' : undefined));
      repaired += 1;
      tail = lastInChain(nodes, edges, orphan.id);
    }
  }

  return { nodes: layoutGraph(nodes, edges), edges, repaired };
}

function migrateData(node) {
  const data = { ...(node.data || {}) };
  if (node.type !== 'action') return data;
  // Webhook URLs were typed into `message` and shown from `config`; the engine reads `url`.
  if (data.actionType === 'webhook' && !data.url) data.url = data.config || data.message || '';
  // Tag steps stored the tag id; the engine adds or removes by name.
  if ((data.actionType === 'add_tag' || data.actionType === 'remove_tag') && !data.tag && data.tagName) {
    data.tag = data.tagName;
  }
  return data;
}

/** Walk single-child links from `id` to the last step that has no next step. */
function lastInChain(nodes, edges, id) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(id);
  const guard = new Set();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    const out = edges.filter((e) => e.source === current.id);
    if (!out.length) return current;
    if (isCondition(current)) {
      const yes = out.find((e) => e.sourceHandle !== 'no');
      if (!yes) return current;
      current = byId.get(yes.target);
    } else {
      current = byId.get(out[0].target);
    }
  }
  return null;
}

export function makeEdge(source, target, sourceHandle) {
  return {
    id: `e-${source}-${sourceHandle ? `${sourceHandle}-` : ''}${target}`,
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
    type: 'step',
  };
}

export function reachableIds(nodes, edges) {
  const trigger = nodes.find((n) => n.type === 'trigger');
  const out = new Set();
  if (!trigger) return out;
  const stack = [trigger.id];
  while (stack.length) {
    const id = stack.pop();
    if (out.has(id)) continue;
    out.add(id);
    for (const e of edges) if (e.source === id) stack.push(e.target);
  }
  return out;
}

const HANDLE_ORDER = { yes: 0, undefined: 1, no: 2 };
export const childEdges = (edges, id) =>
  edges.filter((e) => e.source === id).sort((a, b) => HANDLE_ORDER[a.sourceHandle] - HANDLE_ORDER[b.sourceHandle]);

/**
 * Top-down tree layout: each step centred over its subtree, Yes branch left of
 * No. Steps not reachable from the trigger are stacked in a column to the right
 * so they stay visible (and flagged) instead of disappearing.
 */
export function layoutGraph(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const trigger = nodes.find((n) => n.type === 'trigger');
  const positions = new Map();
  const width = new Map();
  const visiting = new Set();

  const measure = (id) => {
    if (width.has(id)) return width.get(id);
    if (visiting.has(id)) return NODE_WIDTH;
    visiting.add(id);
    const kids = childEdges(edges, id).filter((e) => byId.has(e.target));
    const w = kids.length
      ? Math.max(NODE_WIDTH, kids.reduce((sum, e) => sum + measure(e.target), 0) + H_GAP * (kids.length - 1))
      : NODE_WIDTH;
    visiting.delete(id);
    width.set(id, w);
    return w;
  };

  const place = (id, left, depth) => {
    if (positions.has(id)) return;
    const w = measure(id);
    positions.set(id, { x: left + (w - NODE_WIDTH) / 2, y: depth * (NODE_HEIGHT + V_GAP) });
    let cursor = left;
    const kids = childEdges(edges, id).filter((e) => byId.has(e.target));
    const total = kids.reduce((sum, e) => sum + measure(e.target), 0) + H_GAP * Math.max(kids.length - 1, 0);
    cursor = left + (w - total) / 2;
    for (const e of kids) {
      place(e.target, cursor, depth + 1);
      cursor += measure(e.target) + H_GAP;
    }
  };

  let right = 0;
  if (trigger) {
    place(trigger.id, 0, 0);
    right = measure(trigger.id);
  }
  let strayRow = 0;
  for (const n of nodes) {
    if (positions.has(n.id)) continue;
    place(n.id, right + H_GAP * 2, strayRow);
    strayRow += 1;
  }

  return nodes.map((n) => ({ ...n, position: positions.get(n.id) || { x: 0, y: 0 } }));
}

/** Insert a new step after `parentId` (on a condition's `handle`), keeping what followed. */
export function insertStep(nodes, edges, { parentId, handle, actionType }) {
  const parent = nodes.find((n) => n.id === parentId);
  if (!parent) return { nodes, edges, id: null };
  const def = ACTIONS_BY_TYPE[actionType];
  const id = newStepId();
  const node = { id, type: 'action', position: { x: 0, y: 0 }, data: { actionType, ...(def?.defaults || {}) } };
  const branch = isCondition(parent) ? (handle === 'no' ? 'no' : 'yes') : undefined;
  const moving = edges.filter((e) => e.source === parentId && e.sourceHandle === branch);
  const kept = edges.filter((e) => !(e.source === parentId && e.sourceHandle === branch));
  const nextEdges = [
    ...kept,
    makeEdge(parentId, id, branch),
    // What used to follow the parent now follows the new step (its Yes path, if it branches).
    ...moving.map((e) => makeEdge(id, e.target, actionType === CONDITION ? 'yes' : undefined)),
  ];
  const nextNodes = [...nodes, node];
  return { nodes: layoutGraph(nextNodes, nextEdges), edges: nextEdges, id };
}

/** Remove a step and connect whatever pointed at it to whatever followed it. */
export function deleteStep(nodes, edges, id) {
  const node = nodes.find((n) => n.id === id);
  if (!node || node.type === 'trigger') return { nodes, edges };
  const outgoing = edges.filter((e) => e.source === id);
  if (isCondition(node)) {
    const yes = outgoing.filter((e) => e.sourceHandle !== 'no');
    const no = outgoing.filter((e) => e.sourceHandle === 'no');
    if (yes.length && no.length) {
      return { nodes, edges, error: 'Both paths of this condition have steps. Delete the steps on one path first.' };
    }
  }
  const incoming = edges.filter((e) => e.target === id);
  const rest = edges.filter((e) => e.source !== id && e.target !== id);
  const bridged = [];
  for (const inc of incoming) {
    for (const out of outgoing) {
      if (!rest.some((e) => e.source === inc.source && e.target === out.target && e.sourceHandle === inc.sourceHandle)) {
        bridged.push(makeEdge(inc.source, out.target, inc.sourceHandle));
      }
    }
  }
  const nextEdges = [...rest, ...bridged];
  const nextNodes = nodes.filter((n) => n.id !== id);
  return { nodes: layoutGraph(nextNodes, nextEdges), edges: nextEdges };
}

/** Change what a step does, keeping its place in the chain. */
export function changeStepType(nodes, edges, id, actionType) {
  const node = nodes.find((n) => n.id === id);
  if (!node || node.type !== 'action') return { nodes, edges };
  const outgoing = edges.filter((e) => e.source === id);
  let nextEdges = edges;
  if (isCondition(node) && actionType !== CONDITION) {
    const yes = outgoing.filter((e) => e.sourceHandle !== 'no');
    const no = outgoing.filter((e) => e.sourceHandle === 'no');
    if (yes.length && no.length) {
      return { nodes, edges, error: 'Both paths of this condition have steps. Delete the steps on one path first.' };
    }
    nextEdges = [...edges.filter((e) => e.source !== id), ...outgoing.map((e) => makeEdge(id, e.target))];
  } else if (!isCondition(node) && actionType === CONDITION) {
    nextEdges = [...edges.filter((e) => e.source !== id), ...outgoing.map((e) => makeEdge(id, e.target, 'yes'))];
  }
  const def = ACTIONS_BY_TYPE[actionType];
  const nextNodes = nodes.map((n) =>
    n.id === id ? { ...n, data: { actionType, ...(def?.defaults || {}) } } : n,
  );
  return { nodes: layoutGraph(nextNodes, nextEdges), edges: nextEdges };
}

export function updateNodeData(nodes, id, patch) {
  return nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
}

// Triggers started by the contact messaging you, so a plain WhatsApp text can
// reach them. Everyone else (a CRM lead, a caller) needs an approved template.
const OPENS_WINDOW = new Set(['new_message', 'contact_created', 'instagram_dm', 'instagram_comment', 'instagram_story_reply']);

/** Everything that would stop this automation from doing what it shows. */
export function validateGraph(nodes, edges) {
  const issues = [];
  const reachable = reachableIds(nodes, edges);
  const triggerType = nodes.find((n) => n.type === 'trigger')?.data?.triggerType;
  for (const n of nodes) {
    for (const message of nodeIssues(n)) issues.push({ nodeId: n.id, message });
    if (
      n.type === 'action' &&
      n.data?.actionType === 'send_message' &&
      triggerType &&
      !OPENS_WINDOW.has(triggerType) &&
      !n.data.fallbackTemplate
    ) {
      issues.push({
        nodeId: n.id,
        message: "Choose a fallback template — this contact may not have messaged you, so plain text won't be delivered",
      });
    }
    if (n.type === 'action' && !reachable.has(n.id)) {
      issues.push({ nodeId: n.id, message: 'Not connected to the trigger, so it never runs' });
    }
  }
  if (!nodes.some((n) => n.type === 'action')) issues.push({ nodeId: null, message: 'Add at least one step' });
  return issues;
}

/** What gets saved: plain data the engine reads, no UI-only fields. */
export function toPayload(nodes, edges) {
  return {
    nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: edges.map(({ id, source, target, sourceHandle }) => ({
      id,
      source,
      target,
      ...(sourceHandle ? { sourceHandle } : {}),
      type: 'smoothstep',
    })),
  };
}

export function blankGraph() {
  const nodes = [{ id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: {} }];
  return { nodes: layoutGraph(nodes, []), edges: [] };
}
