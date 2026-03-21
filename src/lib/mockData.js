const now = Date.now();
const minutesAgo = (m) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString();
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString();

export const mockWorkspaces = [
  { id: 'ws_001', name: 'Acme Sales', created_at: daysAgo(120) },
];

export const mockProfiles = [
  {
    id: 'user_admin_001',
    full_name: 'Ava Martinez',
    email: 'ava@acme.com',
    role: 'admin',
    avatar_url: null,
    workspace_id: 'ws_001',
    is_active: true,
    created_at: daysAgo(120),
  },
  {
    id: 'user_001',
    full_name: 'Jordan Lee',
    email: 'jordan@acme.com',
    role: 'user',
    avatar_url: null,
    workspace_id: 'ws_001',
    is_active: true,
    created_at: daysAgo(64),
  },
  {
    id: 'user_002',
    full_name: 'Priya Shah',
    email: 'priya@acme.com',
    role: 'user',
    avatar_url: null,
    workspace_id: 'ws_001',
    is_active: true,
    created_at: daysAgo(40),
  },
  {
    id: 'user_003',
    full_name: 'Noah Kim',
    email: 'noah@acme.com',
    role: 'user',
    avatar_url: null,
    workspace_id: 'ws_001',
    is_active: false,
    created_at: daysAgo(18),
  },
];

export const mockTags = [
  { id: 'tag_green', workspace_id: 'ws_001', name: 'VIP', color: 'green', description: 'High intent', created_at: daysAgo(90) },
  { id: 'tag_blue', workspace_id: 'ws_001', name: 'New Lead', color: 'blue', description: 'Fresh inbound', created_at: daysAgo(80) },
  { id: 'tag_purple', workspace_id: 'ws_001', name: 'Follow Up', color: 'purple', description: 'Needs follow-up', created_at: daysAgo(70) },
  { id: 'tag_orange', workspace_id: 'ws_001', name: 'Warm', color: 'orange', description: 'Warm pipeline', created_at: daysAgo(60) },
  { id: 'tag_red', workspace_id: 'ws_001', name: 'Do Not Contact', color: 'red', description: 'Opted out', created_at: daysAgo(50) },
];

export const mockContacts = [
  { id: 'ct_001', workspace_id: 'ws_001', phone: '+1 415 555 0123', first_name: 'Sophia', last_name: 'Ng', email: 'sophia.ng@example.com', status: 'active', notes: 'Asked about pricing tiers.', created_at: daysAgo(25), last_active_at: hoursAgo(2) },
  { id: 'ct_002', workspace_id: 'ws_001', phone: '+1 415 555 0188', first_name: 'Ethan', last_name: 'Brooks', email: 'ethan.brooks@example.com', status: 'active', notes: 'Wants demo next week.', created_at: daysAgo(20), last_active_at: hoursAgo(9) },
  { id: 'ct_003', workspace_id: 'ws_001', phone: '+1 212 555 0199', first_name: 'Maya', last_name: 'Patel', email: 'maya.patel@example.com', status: 'active', notes: 'Referred by partner.', created_at: daysAgo(19), last_active_at: daysAgo(1) },
  { id: 'ct_004', workspace_id: 'ws_001', phone: '+44 20 7946 0958', first_name: 'Oliver', last_name: 'Reed', email: 'oliver.reed@example.com', status: 'active', notes: 'Interested in automations.', created_at: daysAgo(16), last_active_at: hoursAgo(4) },
  { id: 'ct_005', workspace_id: 'ws_001', phone: '+61 2 5550 1234', first_name: 'Amelia', last_name: 'Chen', email: 'amelia.chen@example.com', status: 'active', notes: '', created_at: daysAgo(15), last_active_at: hoursAgo(1) },
  { id: 'ct_006', workspace_id: 'ws_001', phone: '+1 650 555 0111', first_name: 'Liam', last_name: 'Johnson', email: 'liam.j@example.com', status: 'active', notes: 'Comparing tools.', created_at: daysAgo(14), last_active_at: daysAgo(2) },
  { id: 'ct_007', workspace_id: 'ws_001', phone: '+1 310 555 0147', first_name: 'Isabella', last_name: 'Garcia', email: 'isabella.g@example.com', status: 'active', notes: 'Asked for case study.', created_at: daysAgo(13), last_active_at: hoursAgo(10) },
  { id: 'ct_008', workspace_id: 'ws_001', phone: '+1 206 555 0107', first_name: 'Lucas', last_name: 'Wilson', email: 'lucas.w@example.com', status: 'blocked', notes: 'Requested unsubscribe.', created_at: daysAgo(12), last_active_at: daysAgo(4) },
  { id: 'ct_009', workspace_id: 'ws_001', phone: '+33 1 84 88 34 12', first_name: 'Chloe', last_name: 'Dubois', email: 'chloe.d@example.com', status: 'active', notes: '', created_at: daysAgo(11), last_active_at: hoursAgo(7) },
  { id: 'ct_010', workspace_id: 'ws_001', phone: '+49 30 901820', first_name: 'Finn', last_name: 'Schmidt', email: 'finn.s@example.com', status: 'active', notes: 'Budget approved.', created_at: daysAgo(10), last_active_at: minutesAgo(25) },
  { id: 'ct_011', workspace_id: 'ws_001', phone: '+1 718 555 0172', first_name: 'Aisha', last_name: 'Hassan', email: 'aisha.h@example.com', status: 'active', notes: 'Needs security docs.', created_at: daysAgo(9), last_active_at: hoursAgo(5) },
  { id: 'ct_012', workspace_id: 'ws_001', phone: '+1 617 555 0131', first_name: 'Benjamin', last_name: 'Clark', email: 'ben.clark@example.com', status: 'active', notes: '', created_at: daysAgo(8), last_active_at: daysAgo(1) },
  { id: 'ct_013', workspace_id: 'ws_001', phone: '+52 55 5342 1234', first_name: 'Valeria', last_name: 'Lopez', email: 'valeria.l@example.com', status: 'active', notes: 'High volume team.', created_at: daysAgo(7), last_active_at: hoursAgo(12) },
  { id: 'ct_014', workspace_id: 'ws_001', phone: '+1 305 555 0190', first_name: 'Diego', last_name: 'Rivera', email: 'diego.r@example.com', status: 'active', notes: 'Asked about pricing.', created_at: daysAgo(6), last_active_at: hoursAgo(3) },
  { id: 'ct_015', workspace_id: 'ws_001', phone: '+81 3 1234 5678', first_name: 'Hana', last_name: 'Sato', email: 'hana.s@example.com', status: 'active', notes: '', created_at: daysAgo(5), last_active_at: minutesAgo(10) },
];

export const mockContactTags = [
  { contact_id: 'ct_001', tag_id: 'tag_blue', applied_at: daysAgo(3) },
  { contact_id: 'ct_001', tag_id: 'tag_purple', applied_at: daysAgo(1) },
  { contact_id: 'ct_002', tag_id: 'tag_orange', applied_at: daysAgo(2) },
  { contact_id: 'ct_003', tag_id: 'tag_blue', applied_at: daysAgo(4) },
  { contact_id: 'ct_004', tag_id: 'tag_green', applied_at: daysAgo(6) },
  { contact_id: 'ct_008', tag_id: 'tag_red', applied_at: daysAgo(8) },
  { contact_id: 'ct_010', tag_id: 'tag_green', applied_at: daysAgo(1) },
  { contact_id: 'ct_011', tag_id: 'tag_purple', applied_at: daysAgo(2) },
  { contact_id: 'ct_013', tag_id: 'tag_orange', applied_at: daysAgo(2) },
];

export const mockAudiences = [
  {
    id: 'aud_001',
    workspace_id: 'ws_001',
    name: 'VIP - Active < 7 days',
    description: 'High-intent leads active within the last week.',
    type: 'dynamic',
    conditions: { match: 'all', rules: [{ field: 'tag', op: 'eq', value: 'VIP' }, { field: 'last_active', op: 'lt_days', value: 7 }] },
    created_at: daysAgo(30),
  },
  {
    id: 'aud_002',
    workspace_id: 'ws_001',
    name: 'Warm Pipeline',
    description: 'Warm leads requiring follow-ups.',
    type: 'dynamic',
    conditions: { match: 'any', rules: [{ field: 'tag', op: 'eq', value: 'Warm' }, { field: 'tag', op: 'eq', value: 'Follow Up' }] },
    created_at: daysAgo(28),
  },
  {
    id: 'aud_003',
    workspace_id: 'ws_001',
    name: 'Newsletter List',
    description: 'Manually curated list for announcements.',
    type: 'static',
    conditions: { match: 'all', rules: [] },
    created_at: daysAgo(22),
  },
];

export const mockAutomations = [
  { id: 'auto_001', workspace_id: 'ws_001', name: 'Welcome New Lead', trigger_type: 'New Contact', is_active: true, messages_sent: 128, last_run_at: minutesAgo(12), created_at: daysAgo(60) },
  { id: 'auto_002', workspace_id: 'ws_001', name: 'VIP Fast Lane', trigger_type: 'Tag Applied', is_active: true, messages_sent: 54, last_run_at: hoursAgo(3), created_at: daysAgo(45) },
  { id: 'auto_003', workspace_id: 'ws_001', name: 'Re-engage 14d Inactive', trigger_type: 'Schedule', is_active: false, messages_sent: 310, last_run_at: daysAgo(2), created_at: daysAgo(40) },
];

export const mockRules = [
  { id: 'rule_001', workspace_id: 'ws_001', name: 'VIP → Assign Ava', condition: { field: 'tag', op: 'eq', value: 'VIP' }, action: { type: 'assign', to: 'Ava Martinez' }, status: 'active', triggered_count: 19, created_at: daysAgo(33) },
  { id: 'rule_002', workspace_id: 'ws_001', name: 'Warm → Follow Up in 24h', condition: { field: 'tag', op: 'eq', value: 'Warm' }, action: { type: 'task', value: 'Follow up in 24h' }, status: 'active', triggered_count: 41, created_at: daysAgo(31) },
  { id: 'rule_003', workspace_id: 'ws_001', name: 'DNC → Block', condition: { field: 'tag', op: 'eq', value: 'Do Not Contact' }, action: { type: 'status', value: 'blocked' }, status: 'active', triggered_count: 3, created_at: daysAgo(27) },
  { id: 'rule_004', workspace_id: 'ws_001', name: 'New Lead → Template A', condition: { field: 'tag', op: 'eq', value: 'New Lead' }, action: { type: 'send_template', value: 'Template A' }, status: 'paused', triggered_count: 12, created_at: daysAgo(21) },
  { id: 'rule_005', workspace_id: 'ws_001', name: 'After-hours Reply', condition: { field: 'time', op: 'between', value: ['18:00', '08:00'] }, action: { type: 'send_template', value: 'After-hours' }, status: 'active', triggered_count: 8, created_at: daysAgo(14) },
];

export const mockActivityLogs = [
  { id: 'act_001', workspace_id: 'ws_001', user_id: 'user_001', action: 'login', description: 'Jordan logged in', created_at: minutesAgo(8) },
  { id: 'act_002', workspace_id: 'ws_001', user_id: 'user_002', action: 'contact_added', description: 'New contact added: Sophia Ng', created_at: minutesAgo(32) },
  { id: 'act_003', workspace_id: 'ws_001', user_id: 'user_001', action: 'message_sent', description: 'Sent message to Ethan Brooks', created_at: minutesAgo(41) },
  { id: 'act_004', workspace_id: 'ws_001', user_id: 'user_admin_001', action: 'automation_triggered', description: 'Automation triggered: Welcome New Lead', created_at: hoursAgo(1) },
  { id: 'act_005', workspace_id: 'ws_001', user_id: 'user_003', action: 'user_deactivated', description: 'Noah Kim was deactivated', created_at: hoursAgo(2) },
  { id: 'act_006', workspace_id: 'ws_001', user_id: 'user_002', action: 'tag_applied', description: 'Applied tag VIP to Finn Schmidt', created_at: hoursAgo(3) },
  { id: 'act_007', workspace_id: 'ws_001', user_id: 'user_001', action: 'message_received', description: 'New inbound message from Amelia Chen', created_at: hoursAgo(4) },
  { id: 'act_008', workspace_id: 'ws_001', user_id: 'user_001', action: 'contact_updated', description: 'Updated contact notes for Maya Patel', created_at: hoursAgo(5) },
  { id: 'act_009', workspace_id: 'ws_001', user_id: 'user_admin_001', action: 'settings_updated', description: 'Workspace settings updated', created_at: hoursAgo(6) },
  { id: 'act_010', workspace_id: 'ws_001', user_id: 'user_002', action: 'rule_updated', description: 'Rule updated: Warm → Follow Up in 24h', created_at: hoursAgo(7) },
  { id: 'act_011', workspace_id: 'ws_001', user_id: 'user_001', action: 'message_sent', description: 'Sent message to Chloe Dubois', created_at: hoursAgo(8) },
  { id: 'act_012', workspace_id: 'ws_001', user_id: 'user_002', action: 'audience_created', description: 'Audience created: Warm Pipeline', created_at: daysAgo(1) },
  { id: 'act_013', workspace_id: 'ws_001', user_id: 'user_001', action: 'contact_imported', description: 'Imported contacts from CSV', created_at: daysAgo(2) },
  { id: 'act_014', workspace_id: 'ws_001', user_id: 'user_admin_001', action: 'user_invited', description: 'Invited team member: priya@acme.com', created_at: daysAgo(2) },
  { id: 'act_015', workspace_id: 'ws_001', user_id: 'user_002', action: 'message_received', description: 'New inbound message from Oliver Reed', created_at: daysAgo(3) },
  { id: 'act_016', workspace_id: 'ws_001', user_id: 'user_001', action: 'conversation_resolved', description: 'Conversation resolved: Sophia Ng', created_at: daysAgo(3) },
  { id: 'act_017', workspace_id: 'ws_001', user_id: 'user_001', action: 'tag_created', description: 'Created tag: Warm', created_at: daysAgo(4) },
  { id: 'act_018', workspace_id: 'ws_001', user_id: 'user_admin_001', action: 'automation_paused', description: 'Paused automation: Re-engage 14d Inactive', created_at: daysAgo(5) },
  { id: 'act_019', workspace_id: 'ws_001', user_id: 'user_002', action: 'note_added', description: 'Added internal note for Diego Rivera', created_at: daysAgo(5) },
  { id: 'act_020', workspace_id: 'ws_001', user_id: 'user_001', action: 'message_sent', description: 'Sent message to Hana Sato', created_at: daysAgo(6) },
];

export const mockConversations = [
  { id: 'cv_001', workspace_id: 'ws_001', contact_id: 'ct_001', assigned_to: 'user_001', status: 'open', priority: 'high', unread_count: 2, last_message_at: minutesAgo(6), created_at: daysAgo(10) },
  { id: 'cv_002', workspace_id: 'ws_001', contact_id: 'ct_002', assigned_to: 'user_002', status: 'open', priority: 'medium', unread_count: 0, last_message_at: minutesAgo(40), created_at: daysAgo(9) },
  { id: 'cv_003', workspace_id: 'ws_001', contact_id: 'ct_004', assigned_to: 'user_001', status: 'pending', priority: 'medium', unread_count: 1, last_message_at: hoursAgo(2), created_at: daysAgo(8) },
  { id: 'cv_004', workspace_id: 'ws_001', contact_id: 'ct_005', assigned_to: 'user_002', status: 'open', priority: 'low', unread_count: 0, last_message_at: hoursAgo(4), created_at: daysAgo(7) },
  { id: 'cv_005', workspace_id: 'ws_001', contact_id: 'ct_010', assigned_to: 'user_001', status: 'open', priority: 'high', unread_count: 3, last_message_at: minutesAgo(12), created_at: daysAgo(6) },
  { id: 'cv_006', workspace_id: 'ws_001', contact_id: 'ct_011', assigned_to: null, status: 'open', priority: 'medium', unread_count: 0, last_message_at: hoursAgo(5), created_at: daysAgo(6) },
  { id: 'cv_007', workspace_id: 'ws_001', contact_id: 'ct_014', assigned_to: 'user_002', status: 'resolved', priority: 'low', unread_count: 0, last_message_at: daysAgo(1), created_at: daysAgo(5) },
  { id: 'cv_008', workspace_id: 'ws_001', contact_id: 'ct_015', assigned_to: 'user_001', status: 'open', priority: 'medium', unread_count: 0, last_message_at: minutesAgo(9), created_at: daysAgo(4) },
];

const thread = (conversation_id, base, name) => {
  const msgs = [];
  for (let i = 0; i < base.length; i++) {
    const m = base[i];
    msgs.push({
      id: `${conversation_id}_m_${String(i + 1).padStart(2, '0')}`,
      conversation_id,
      direction: m.direction,
      content: m.content,
      message_type: m.type ?? 'text',
      media_url: m.media_url ?? null,
      is_read: true,
      sent_at: minutesAgo(m.minAgo),
    });
  }
  // Ensure last message feels recent
  msgs.push({
    id: `${conversation_id}_m_last`,
    conversation_id,
    direction: 'inbound',
    content: `Thanks — quick question about team seats, ${name}.`,
    message_type: 'text',
    media_url: null,
    is_read: false,
    sent_at: minutesAgo(3),
  });
  return msgs;
};

export const mockMessages = [
  ...thread(
    'cv_001',
    [
      { direction: 'inbound', content: 'Hey! Can you share pricing?', minAgo: 240 },
      { direction: 'outbound', content: 'Absolutely — do you want monthly or annual billing?', minAgo: 232 },
      { direction: 'inbound', content: 'Annual. Also, do you support automations?', minAgo: 228 },
      { direction: 'outbound', content: 'Yes — triggers like tag applied, new contact, schedules, and more.', minAgo: 220 },
    ],
    'Sophia',
  ),
  ...thread(
    'cv_002',
    [
      { direction: 'inbound', content: 'Can we book a demo for next week?', minAgo: 540 },
      { direction: 'outbound', content: 'Yes — what day/time works best?', minAgo: 530 },
      { direction: 'inbound', content: 'Tuesday 2pm PST works.', minAgo: 520 },
      { direction: 'outbound', content: 'Perfect — I’ll send a calendar invite shortly.', minAgo: 515 },
    ],
    'Ethan',
  ),
  ...thread(
    'cv_003',
    [
      { direction: 'inbound', content: 'We run inbound WhatsApp at high volume.', minAgo: 210 },
      { direction: 'outbound', content: 'FlowDesk is built for fast triage + assignment + templates.', minAgo: 205 },
      { direction: 'inbound', content: 'Do you have SLAs and audit logs?', minAgo: 196 },
      { direction: 'outbound', content: 'Yes — we track activity logs per workspace.', minAgo: 190 },
    ],
    'Oliver',
  ),
  ...thread(
    'cv_004',
    [
      { direction: 'inbound', content: 'Hi! I saw your product online.', minAgo: 400 },
      { direction: 'outbound', content: 'Welcome! What are you hoping to improve in your inbox?', minAgo: 392 },
      { direction: 'inbound', content: 'Assignment and templates for sales.', minAgo: 380 },
      { direction: 'outbound', content: 'Great fit — we can set up quick templates + routing rules.', minAgo: 370 },
    ],
    'Amelia',
  ),
  ...thread(
    'cv_005',
    [
      { direction: 'inbound', content: 'We’re ready to move forward.', minAgo: 55 },
      { direction: 'outbound', content: 'Amazing — I can get you connected today.', minAgo: 50 },
      { direction: 'inbound', content: 'Do you integrate with our CRM?', minAgo: 45 },
      { direction: 'outbound', content: 'We can via API + webhooks (Railway backend).', minAgo: 40 },
    ],
    'Finn',
  ),
  ...thread(
    'cv_006',
    [
      { direction: 'inbound', content: 'Can I see your security documentation?', minAgo: 320 },
      { direction: 'outbound', content: 'Yes — I’ll share our security overview and data handling.', minAgo: 310 },
      { direction: 'inbound', content: 'Perfect, thank you.', minAgo: 300 },
      { direction: 'outbound', content: 'Any compliance requirements we should know?', minAgo: 295 },
    ],
    'Aisha',
  ),
  ...thread(
    'cv_007',
    [
      { direction: 'inbound', content: 'All set — you can mark this as resolved.', minAgo: 1500 },
      { direction: 'outbound', content: 'Done — thanks!', minAgo: 1490 },
      { direction: 'inbound', content: '👍', minAgo: 1480 },
      { direction: 'outbound', content: 'If anything changes, just reply here.', minAgo: 1470 },
    ],
    'Diego',
  ),
  ...thread(
    'cv_008',
    [
      { direction: 'inbound', content: 'Hello! Is support available on weekends?', minAgo: 180 },
      { direction: 'outbound', content: 'We provide limited weekend coverage for urgent issues.', minAgo: 175 },
      { direction: 'inbound', content: 'Got it — thanks.', minAgo: 170 },
      { direction: 'outbound', content: 'No problem — happy to help.', minAgo: 165 },
    ],
    'Hana',
  ),
];

export const mockDb = {
  workspaces: mockWorkspaces,
  profiles: mockProfiles,
  contacts: mockContacts,
  tags: mockTags,
  contact_tags: mockContactTags,
  audiences: mockAudiences,
  conversations: mockConversations,
  messages: mockMessages,
  automations: mockAutomations,
  rules: mockRules,
  activity_logs: mockActivityLogs,
};

