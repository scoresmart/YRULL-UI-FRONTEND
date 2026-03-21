import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Eye, EyeOff, Save, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { integrationsApi } from '../../lib/api';

// ── Integration definitions with SVG logos ────────────────────────────────

const INTEGRATIONS = [
  {
    key: 'anthropic',
    name: 'Claude AI',
    description: 'Powers AI chat replies and smart reply classification',
    category: 'AI',
    docsUrl: 'https://docs.anthropic.com/',
    fields: [{ key: 'ANTHROPIC_API_KEY', label: 'API Key', secret: true }],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M17.304 3.541l-5.497 16.918H14.93L20.426 3.54h-3.122zm-10.608 0L1.2 20.459h3.166l1.188-3.776h5.862l1.19 3.776h3.165L10.275 3.54H6.696zM6.47 13.828l2.03-6.449h.073l2.03 6.449H6.47z" />
      </svg>
    ),
    color: 'bg-[#D4A574]',
    textColor: 'text-[#1a1a1a]',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Cloud API',
    description: 'Send and receive WhatsApp messages via Meta',
    category: 'Messaging',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/',
    fields: [
      { key: 'WA_ACCESS_TOKEN', label: 'Access Token', secret: true },
      { key: 'WA_PHONE_NUMBER_ID', label: 'Phone Number ID', secret: false },
      { key: 'WA_VERIFY_TOKEN', label: 'Verify Token', secret: false },
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: 'bg-[#25D366]',
    textColor: 'text-white',
  },
  {
    key: 'supabase',
    name: 'Supabase',
    description: 'Database for messages, contacts, call logs, and automations',
    category: 'Database',
    docsUrl: 'https://supabase.com/docs',
    fields: [
      { key: 'SUPABASE_URL', label: 'Project URL', secret: false },
      { key: 'SUPABASE_KEY', label: 'Service Key', secret: true },
    ],
    logo: (
      <svg viewBox="0 0 109 113" className="h-8 w-8" fill="none">
        <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" fill="url(#sb-a)" />
        <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" fill="url(#sb-b)" fillOpacity=".2" />
        <path d="M45.317 2.071c2.86-3.601 8.657-1.628 8.726 2.97l.442 67.251H9.83c-8.19 0-12.759-9.46-7.665-15.875L45.317 2.072z" fill="#3ECF8E" />
        <defs>
          <linearGradient id="sb-a" x1="53.974" y1="54.974" x2="94.163" y2="71.829" gradientUnits="userSpaceOnUse">
            <stop stopColor="#249361" /><stop offset="1" stopColor="#3ECF8E" />
          </linearGradient>
          <linearGradient id="sb-b" x1="36.156" y1="30.578" x2="54.484" y2="65.081" gradientUnits="userSpaceOnUse">
            <stop /><stop offset="1" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    ),
    color: 'bg-[#3ECF8E]',
    textColor: 'text-white',
  },
  {
    key: 'airtable',
    name: 'Airtable',
    description: 'CRM — source of truth for all leads and enrollments',
    category: 'CRM',
    docsUrl: 'https://airtable.com/developers/web/api/introduction',
    fields: [
      { key: 'AIRTABLE_API_KEY', label: 'API Key', secret: true },
      { key: 'AIRTABLE_BASE_ID', label: 'Base ID', secret: false },
      { key: 'AIRTABLE_TABLE_NAME', label: 'Table Name', secret: false },
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M11.553 1.106a1 1 0 01.894 0l9 4.5A1 1 0 0122 6.5v.382a1 1 0 01-.553.894l-9 4.5a1 1 0 01-.894 0l-9-4.5A1 1 0 012 6.882V6.5a1 1 0 01.553-.894l9-4.5z" fill="#FCB400" />
        <path d="M12.447 13.776a1 1 0 00-.894 0l-9 4.5A1 1 0 002 19.17v.382a1 1 0 00.553.894l9 4.5a1 1 0 00.894 0l9-4.5A1 1 0 0022 19.553v-.382a1 1 0 00-.553-.894l-9-4.5z" fill="#18BFFF" />
        <path d="M2.553 10.276A1 1 0 002 11.17v.382a1 1 0 00.553.894l9 4.5a1 1 0 00.894 0l9-4.5A1 1 0 0022 11.553v-.382a1 1 0 00-.553-.894l-9-4.5a1 1 0 00-.894 0l-9 4.5z" fill="#F82B60" />
      </svg>
    ),
    color: 'bg-[#FCB400]',
    textColor: 'text-[#1a1a1a]',
  },
  {
    key: 'resend',
    name: 'Resend',
    description: 'Email delivery for sequences, reports, and notifications',
    category: 'Email',
    docsUrl: 'https://resend.com/docs',
    fields: [
      { key: 'RESEND_API_KEY', label: 'API Key', secret: true },
      { key: 'RESEND_FROM_EMAIL', label: 'From Email', secret: false },
      { key: 'RESEND_REPLY_TO', label: 'Reply-To Email', secret: false },
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2.4 0L12 11.5 19.6 6H4.4zM20 7.9l-8 5.8-8-5.8V18h16V7.9z"/>
      </svg>
    ),
    color: 'bg-[#000000]',
    textColor: 'text-white',
  },
  {
    key: 'retell',
    name: 'Retell AI',
    description: 'AI-powered outbound phone calls to leads',
    category: 'Voice AI',
    docsUrl: 'https://docs.retellai.com/',
    fields: [
      { key: 'RETELL_API_KEY', label: 'API Key', secret: true },
      { key: 'RETELL_AGENT_ID', label: 'Agent ID', secret: false },
      { key: 'RETELL_FROM_NUMBER', label: 'From Number', secret: false },
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14.5v-9l7 4.5-7 4.5z" />
      </svg>
    ),
    color: 'bg-[#6C5CE7]',
    textColor: 'text-white',
  },
  {
    key: 'meta_capi',
    name: 'Meta Conversions API',
    description: 'Send lead, trial, and purchase events to Meta Ads',
    category: 'Ads',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api/conversions-api/',
    fields: [
      { key: 'META_PIXEL_ID', label: 'Pixel ID', secret: false },
      { key: 'META_CAPI_KEY', label: 'CAPI Access Token', secret: true },
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: 'bg-[#1877F2]',
    textColor: 'text-white',
  },
  {
    key: 'cellcast',
    name: 'Cellcast SMS',
    description: 'SMS messaging for lead notifications',
    category: 'SMS',
    docsUrl: 'https://cellcast.com.au/',
    fields: [{ key: 'CELLCAST_API_KEY', label: 'API Key', secret: true }],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
      </svg>
    ),
    color: 'bg-[#FF6B35]',
    textColor: 'text-white',
  },
  {
    key: 'voipcloud',
    name: 'VoIPCloud',
    description: 'Phone call event webhooks for call logging',
    category: 'Telephony',
    docsUrl: 'https://voipcloud.online/',
    fields: [{ key: 'VOIP_SECRET_TOKEN', label: 'Webhook Secret', secret: true }],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </svg>
    ),
    color: 'bg-[#0EA5E9]',
    textColor: 'text-white',
  },
  {
    key: 'gmail',
    name: 'Gmail IMAP',
    description: 'Monitors replies at scoresmartpte@gmail.com',
    category: 'Email',
    docsUrl: 'https://support.google.com/mail/answer/7126229',
    fields: [
      { key: 'GMAIL_EMAIL', label: 'Email Address', secret: false },
      { key: 'GMAIL_APP_PASSWORD', label: 'App Password', secret: true },
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
      </svg>
    ),
    color: 'bg-[#EA4335]',
    textColor: 'text-white',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    description: 'Receive and reply to Instagram DMs, comments & story replies',
    category: 'Messaging',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/',
    fields: [
      { key: 'IG_PAGE_ACCESS_TOKEN', label: 'Page Access Token', secret: true },
      { key: 'IG_PAGE_ID', label: 'Instagram Page ID', secret: false },
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    color: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    textColor: 'text-white',
  },
];

// ── Individual integration card ───────────────────────────────────────────

function IntegrationCard({ integration, serverConfig, onSave }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [visibleFields, setVisibleFields] = useState({});
  const [saving, setSaving] = useState(false);

  // Populate values from server config when available
  useEffect(() => {
    if (serverConfig) {
      const v = {};
      integration.fields.forEach((f) => {
        v[f.key] = serverConfig[f.key] || '';
      });
      setValues(v);
    }
  }, [serverConfig, integration.fields]);

  const isConnected = integration.fields.some((f) => {
    const val = serverConfig?.[f.key];
    return val && val.length > 0;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(integration.key, values);
      setEditing(false);
      toast.success(`${integration.name} updated`);
    } catch {
      toast.error(`Failed to update ${integration.name}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        {/* Logo */}
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${integration.color} ${integration.textColor}`}>
          {integration.logo}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">{integration.name}</h3>
            <Badge variant={isConnected ? 'success' : 'secondary'} className="text-xs">
              {isConnected ? 'Connected' : 'Not configured'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">{integration.description}</p>
          <div className="mt-1">
            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {integration.category}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Documentation"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <Button
            variant={editing ? 'outline' : 'default'}
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Cancel' : 'Configure'}
          </Button>
        </div>
      </div>

      {/* Editable fields */}
      {editing && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <div className="space-y-3">
            {integration.fields.map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {field.label}
                </label>
                <div className="relative mt-1">
                  <Input
                    type={field.secret && !visibleFields[field.key] ? 'password' : 'text'}
                    value={values[field.key] || ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.secret ? '••••••••' : `Enter ${field.label.toLowerCase()}`}
                    className="pr-10 font-mono text-sm"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleFields((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                    >
                      {visibleFields[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function IntegrationsPage() {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const categories = ['all', ...new Set(INTEGRATIONS.map((i) => i.category))];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await integrationsApi.list();
      setConfigs(data);
    } catch {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key, values) => {
    await integrationsApi.update(key, values);
    // Refresh to get masked values
    await loadConfigs();
  };

  const filtered =
    filter === 'all' ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect and manage your third-party services
        </p>
      </div>

      {/* Category filter */}
      <div className="mb-6 flex items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === cat
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={loadConfigs}
          className="ml-auto rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Refresh"
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Integration cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.key}
              integration={integration}
              serverConfig={configs[integration.key]}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
