// Dry-run engine for the automation builder.
//
// Walks the same node/edge graph the canvas draws and reports what *would*
// happen for a sample event, without calling WhatsApp, the CRM or any
// integration. The point is to catch the mistakes that otherwise only surface
// after "Set Live" — an empty message body, a tag step with no tag chosen, a
// keyword that the test message never matches, a step left dangling off the
// end of the chain.
//
// Deliberately free of React and of the API layer so it can be unit-tested and
// so nothing here can accidentally reach the network.

// A run that loops (or an absurdly long chain) should stop rather than hang the
// tab. No real automation is anywhere near this long.
const MAX_STEPS = 100;

export const TRIGGER_LABELS = {
  new_message: 'User sends a message',
  missed_call: 'Missed call',
  incoming_call: 'Incoming call',
  instagram_dm: 'Instagram DM received',
  instagram_comment: 'Instagram comment received',
  instagram_story_reply: 'Instagram story reply',
  airtable_status: 'Lead status changes in the CRM',
  lead_created: 'New lead added to the CRM',
};

export const ACTION_LABELS = {
  send_message: 'WhatsApp',
  send_template: 'WhatsApp Template',
  send_email: 'Email',
  send_ig_dm: 'Instagram DM',
  add_tag: 'Add Tag',
  assign: 'Assign',
  delay: 'Delay',
  condition: 'Condition',
  custom_integration: 'Custom Integration',
  randomizer: 'Randomizer',
  webhook: 'Webhook',
  code: 'Code',
  database: 'Database',
  note: 'Note',
};

// Which triggers are started by an inbound message, and so are the only ones a
// keyword can be matched against. A keyword on a missed-call trigger has
// nothing to test against, and saying so is more use than silently matching.
const MESSAGE_TRIGGERS = new Set([
  'new_message',
  'instagram_dm',
  'instagram_comment',
  'instagram_story_reply',
]);

export const DEFAULT_SAMPLE_INPUT = {
  message: 'hi',
  contactName: 'Test Contact',
  contactPhone: '+10000000000',
  contactEmail: 'test@example.com',
  courseName: 'PTE Academic',
  status: '',
};

/** The sample event as the flat token bag that {placeholders} resolve against. */
export function buildTokens(input = {}) {
  const name = input.contactName || '';
  return {
    first_name: name.split(' ')[0] || '',
    last_name: name.split(' ').slice(1).join(' ') || '',
    full_name: name,
    name,
    caller_name: name,
    phone: input.contactPhone || '',
    email: input.contactEmail || '',
    course_name: input.courseName || '',
    message: input.message || '',
    status: input.status || '',
  };
}

/**
 * Fill {first_name}-style placeholders from the sample contact.
 * Returns the filled text plus any tokens we had no value for, so the panel can
 * flag "{course_name} will be blank" before it goes out to a real contact.
 */
export function interpolate(text, tokens) {
  if (!text) return { text: text || '', unresolved: [] };
  const unresolved = [];
  const filled = String(text).replace(/\{\s*([a-z0-9_]+)\s*\}/gi, (match, key) => {
    const value = tokens[key.toLowerCase()];
    if (value === undefined) {
      unresolved.push(key);
      return match;
    }
    if (value === '') {
      unresolved.push(key);
      return match;
    }
    return value;
  });
  return { text: filled, unresolved: [...new Set(unresolved)] };
}

/** Does the sample event actually fire this trigger? */
export function evaluateTrigger(triggerNode, input = {}) {
  const data = triggerNode?.data || {};
  const type = data.triggerType;

  if (!type) {
    return {
      matched: false,
      label: 'No trigger',
      reason: 'This automation has no trigger yet, so nothing will ever start it.',
      severity: 'error',
    };
  }

  const label = TRIGGER_LABELS[type] || type;

  if (MESSAGE_TRIGGERS.has(type)) {
    const keyword = (data.keyword || '').trim();
    if (!keyword) {
      return { matched: true, label, reason: 'Any message (no keyword set)' };
    }
    const message = String(input.message || '');
    const matched = message.toLowerCase().includes(keyword.toLowerCase());
    return {
      matched,
      label,
      reason: matched
        ? `Message contains "${keyword}"`
        : `Message does not contain "${keyword}" — this automation would not run.`,
      severity: matched ? undefined : 'warning',
    };
  }

  if (type === 'airtable_status') {
    const wanted = (data.status || '').trim();
    if (!wanted) return { matched: true, label, reason: 'Any status change' };
    const actual = String(input.status || '').trim();
    const matched = actual.toLowerCase() === wanted.toLowerCase();
    return {
      matched,
      label,
      reason: matched
        ? `Status became "${wanted}"`
        : `Sample status "${actual || '(blank)'}" is not "${wanted}" — this automation would not run.`,
      severity: matched ? undefined : 'warning',
    };
  }

  // missed_call / incoming_call / lead_created carry no extra condition.
  return { matched: true, label, reason: 'Event received' };
}

// WhatsApp's 24-hour customer service window opens on an inbound message from
// the contact. Outside it, Meta rejects freeform text and accepts only
// pre-approved templates. An automation started by anything other than an
// inbound WhatsApp message is therefore reaching someone with no open window,
// and its Send Message step will be refused however well it is configured.
const OPENS_WHATSAPP_WINDOW = new Set(['new_message']);

/** Describe one action node: what it would do, and what is missing. */
function describeAction(node, tokens, outgoingCount, triggerType) {
  const data = node.data || {};
  const type = data.actionType;
  const label = ACTION_LABELS[type] || 'Action';
  const issues = [];
  let detail = '';
  let status = 'ok';

  const fill = (value, field) => {
    const { text, unresolved } = interpolate(value, tokens);
    if (unresolved.length) {
      issues.push(
        `${field} has no value for ${unresolved.map((t) => `{${t}}`).join(', ')} — it will go out blank.`,
      );
    }
    return text;
  };

  switch (type) {
    case 'send_message':
    case 'send_ig_dm': {
      const body = (data.message || '').trim();
      if (!body) {
        issues.push('No message text — this step would send an empty message.');
        detail = '(empty message)';
        status = 'error';
      } else {
        detail = fill(body, 'Message');
      }
      // The most expensive failure to discover live: everything is configured
      // correctly and Meta still refuses the send.
      if (type === 'send_message' && triggerType && !OPENS_WHATSAPP_WINDOW.has(triggerType)) {
        if (data.fallbackTemplate) {
          issues.push(
            `No 24-hour window will be open, so this sends the "${data.fallbackTemplate}" template instead.`,
          );
          status = 'warning';
        } else {
          issues.push(
            `This runs on "${TRIGGER_LABELS[triggerType] || triggerType}", so the contact has not messaged you ` +
              'and no 24-hour window is open. WhatsApp will reject this freeform message — ' +
              'pick a fallback template on this step.',
          );
          status = 'error';
        }
      }
      break;
    }

    case 'send_template': {
      const name = (data.templateName || '').trim();
      if (!name) {
        issues.push('No template selected — this step would do nothing.');
        detail = '(no template)';
        status = 'error';
      } else {
        detail = `${name} (${data.templateLang || 'en_US'})`;
        if (data.templateParams) {
          detail += ` — ${fill(data.templateParams, 'Template values')}`;
        }
      }
      break;
    }
    case 'send_email': {
      const subject = (data.subject || '').trim();
      const body = (data.body || '').trim();
      if (!subject) issues.push('No subject line.');
      if (!body) issues.push('No email body.');
      if (!subject && !body) status = 'error';
      detail = subject ? fill(subject, 'Subject') : '(no subject)';
      if (body) fill(body, 'Body');
      break;
    }
    case 'add_tag': {
      if (!data.tagId) {
        issues.push('No tag selected — this step would do nothing.');
        detail = '(no tag)';
        status = 'error';
      } else {
        detail = data.tagName || data.tagId;
      }
      break;
    }
    case 'assign': {
      const assignee = data.assignee || data.assigneeName || data.userId;
      if (!assignee) {
        issues.push('No one selected to assign to.');
        detail = '(nobody selected)';
        status = 'error';
      } else {
        detail = String(assignee);
      }
      break;
    }
    case 'delay': {
      const amount = Number(data.duration);
      const unit = data.unit || 'seconds';
      if (!amount || amount <= 0) {
        issues.push('No wait time set — this step would not pause at all.');
        detail = '(no duration)';
        status = 'error';
      } else {
        detail = `wait ${amount} ${unit}`;
        // A dry run fast-forwards rather than actually sleeping, and saying so
        // avoids anyone reading the instant result as "the delay is broken".
        status = 'skipped';
      }
      break;
    }
    case 'condition': {
      // The canvas has no UI for a condition's test or its branches yet, so a
      // condition step in a saved flow always passes everything straight
      // through. Better to say that here than to have it discovered live.
      issues.push('This condition has no test configured, so every contact takes the same path.');
      if (outgoingCount > 1) {
        issues.push(`${outgoingCount} branches follow it — all of them would run.`);
      }
      detail = '(no condition set)';
      status = 'warning';
      break;
    }
    case 'randomizer': {
      const options = Number(data.options);
      if (!options || options < 2) {
        issues.push('Needs at least 2 options to split between.');
        detail = '(not configured)';
        status = 'error';
      } else {
        detail = `splits between ${options} options`;
        status = 'warning';
        issues.push('A dry run always takes the first branch; a live run picks at random.');
      }
      break;
    }
    case 'webhook': {
      const url = (data.config || '').trim();
      if (!url) {
        issues.push('No webhook URL.');
        detail = '(no URL)';
        status = 'error';
      } else if (!/^https?:\/\//i.test(url)) {
        issues.push('URL should start with http:// or https://.');
        detail = url;
        status = 'error';
      } else {
        detail = `POST ${url}`;
        status = 'skipped';
        issues.push('Not called during a test run.');
      }
      break;
    }
    case 'code': {
      const snippet = (data.config || '').trim();
      if (!snippet) {
        issues.push('No code to run.');
        detail = '(empty)';
        status = 'error';
      } else {
        detail = snippet.length > 60 ? `${snippet.slice(0, 60)}…` : snippet;
        status = 'skipped';
        issues.push('Not executed during a test run.');
      }
      break;
    }
    case 'custom_integration': {
      if (!data.integrationKey) {
        issues.push('No integration selected.');
        detail = '(none selected)';
        status = 'error';
      } else {
        detail = data.integrationName || data.integrationKey;
        if (data.integrationKey === 'anthropic' && !(data.prompt || '').trim()) {
          issues.push('Claude step has no prompt.');
          status = 'error';
        } else {
          status = 'skipped';
          issues.push('Not called during a test run.');
        }
      }
      break;
    }
    case 'database': {
      detail = data.config || data.operation || '(not configured)';
      status = 'skipped';
      issues.push('Not run during a test run.');
      break;
    }
    case 'note': {
      const note = (data.note || '').trim();
      if (!note) {
        issues.push('Empty note.');
        status = 'warning';
      }
      detail = note || '(empty note)';
      break;
    }
    default: {
      issues.push('Unrecognised step type — it may not run on the server.');
      detail = type || '(no type)';
      status = 'warning';
    }
  }

  if (status === 'ok' && issues.length) status = 'warning';
  return { label, detail, status, issues };
}

/**
 * Walk the flow for one sample event.
 *
 * @param {object} args
 * @param {Array}  args.nodes  ReactFlow nodes, exactly as the canvas holds them
 * @param {Array}  args.edges  ReactFlow edges
 * @param {object} args.input  the sample event (see DEFAULT_SAMPLE_INPUT)
 * @returns {{trigger, steps, errors, warnings, reachedEnd, sent}}
 */
export function simulateAutomation({ nodes = [], edges = [], input = {} } = {}) {
  const tokens = buildTokens({ ...DEFAULT_SAMPLE_INPUT, ...input });
  const errors = [];
  const warnings = [];
  const steps = [];

  const triggerNode = nodes.find((n) => n.type === 'trigger');
  if (!triggerNode) {
    return {
      trigger: {
        matched: false,
        label: 'No trigger',
        reason: 'This automation has no trigger yet, so nothing will ever start it.',
        severity: 'error',
      },
      steps: [],
      errors: ['This automation has no trigger.'],
      warnings: [],
      reachedEnd: false,
      sent: [],
    };
  }

  const trigger = evaluateTrigger(triggerNode, { ...DEFAULT_SAMPLE_INPUT, ...input });
  if (trigger.severity === 'error') errors.push(trigger.reason);
  else if (!trigger.matched) warnings.push(trigger.reason);

  const outgoing = (id) => edges.filter((e) => e.source === id);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Breadth-first so a branch does not starve the one beside it, and so the
  // order roughly follows the left-to-right reading of the canvas.
  const visited = new Set([triggerNode.id]);
  const reached = new Set([triggerNode.id]);
  const queue = outgoing(triggerNode.id).map((e) => e.target);
  let truncated = false;

  while (queue.length) {
    if (steps.length >= MAX_STEPS) {
      truncated = true;
      break;
    }
    const nodeId = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    reached.add(nodeId);

    const node = byId.get(nodeId);
    if (!node) continue;

    if (node.type === 'actionSelection') {
      warnings.push('The flow ends on an unfinished "Choose a step" placeholder.');
      continue;
    }
    if (node.type !== 'action') {
      // sendReply / claudeAI / saveNode belong to the system automation, which
      // is a fixed flow rather than something built here. Nothing to check.
      continue;
    }

    const next = outgoing(nodeId);
    const described = describeAction(node, tokens, next.length, triggerNode.data?.triggerType);
    steps.push({ nodeId, actionType: node.data?.actionType, ...described });

    // Every issue on a failing step is reported, not just the first: a step can
    // fail for one reason and still carry others worth fixing at the same time.
    const bucket = described.status === 'error' ? errors : warnings;
    described.issues.forEach((issue) => bucket.push(`${described.label}: ${issue}`));

    next.forEach((e) => queue.push(e.target));
  }

  if (truncated) {
    warnings.push(`Stopped after ${MAX_STEPS} steps — check the flow for a loop.`);
  }

  // Steps sitting off on their own, wired to nothing the trigger can reach.
  // They look finished on the canvas but would never run.
  for (const node of nodes) {
    if (node.type === 'action' && !reached.has(node.id)) {
      const label = ACTION_LABELS[node.data?.actionType] || 'A step';
      warnings.push(`${label} is not connected to the trigger, so it would never run.`);
    }
  }

  if (steps.length === 0 && errors.length === 0) {
    errors.push('This automation has no steps, so it would do nothing.');
  }

  // What a live run would actually have put in front of a person. Shown as the
  // "nothing was sent" summary so the dry run's safety is explicit.
  const sent = steps
    .filter((s) => ['send_message', 'send_ig_dm', 'send_email', 'send_template'].includes(s.actionType))
    .filter((s) => s.status !== 'error');

  return {
    trigger,
    steps,
    errors,
    warnings: [...new Set(warnings)],
    reachedEnd: !truncated,
    sent,
  };
}
