import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  LinkIcon,
  Unplug,
  Phone,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { integrationsApi } from '../../lib/api';
import { ConnectFacebookButton } from '../../components/integrations/ConnectFacebookButton';
import { InstagramChannelActions } from '../../components/instagram/InstagramChannelActions';
import { useWhatsAppIntegration } from '../../hooks/useWhatsAppIntegration';
import { INTEGRATIONS } from '../../lib/integrationsCatalog';

// ── Individual integration card ───────────────────────────────────────────

function WhatsAppIntegrationCard({ integration }) {
  const wa = useWhatsAppIntegration();

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${integration.color} ${integration.textColor}`}
        >
          {integration.logo}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">{integration.name}</h3>
            {wa.loading ? (
              <Badge variant="muted" className="gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking…
              </Badge>
            ) : wa.connected ? (
              <Badge variant="success" className="gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Not connected
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">{integration.description}</p>
          <div className="mt-1">
            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {integration.category}
            </span>
          </div>

          {!wa.loading && wa.connected && wa.status && (
            <div className="mt-3 space-y-1.5">
              {wa.status.display_phone_number && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {wa.status.display_phone_number}
                </div>
              )}
              {wa.status.verified_name && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  {wa.status.verified_name}
                </div>
              )}
            </div>
          )}

          {wa.error && !wa.connected && <p className="mt-2 text-sm text-red-600">{wa.error}</p>}
        </div>

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
          {wa.connected ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={wa.disconnect}
              disabled={wa.disconnecting}
            >
              {wa.disconnecting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="mr-1.5 h-3.5 w-3.5" />
              )}
              Disconnect
            </Button>
          ) : (
            <Button size="sm" className="bg-[#25D366] hover:bg-[#1fad54]" onClick={wa.connect} disabled={wa.loading}>
              <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

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
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${integration.color} ${integration.textColor}`}
        >
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
          {integration.key === 'instagram' && (
            <div className="mt-3 space-y-3">
              <ConnectFacebookButton intent="linkWorkspace" size="sm" whenNoWorkspace="toast" />
              <InstagramChannelActions compact className="max-w-md" />
            </div>
          )}
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
          <Button variant={editing ? 'outline' : 'default'} size="sm" onClick={() => setEditing(!editing)}>
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
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">{field.label}</label>
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
                      onClick={() => setVisibleFields((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
                    >
                      {visibleFields[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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

  const filtered = filter === 'all' ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">Connect and manage your third-party services</p>
      </div>

      {/* Category filter */}
      <div className="mb-6 flex items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
          {filtered.map((integration) =>
            integration.key === 'whatsapp' ? (
              <WhatsAppIntegrationCard key={integration.key} integration={integration} />
            ) : (
              <IntegrationCard
                key={integration.key}
                integration={integration}
                serverConfig={configs[integration.key]}
                onSave={handleSave}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
