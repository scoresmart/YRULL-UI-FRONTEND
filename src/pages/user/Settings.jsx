import { useMemo, useState } from 'react';
import { Key, Bell, Users, CreditCard, Settings2, QrCode, UserCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserCircle },
  { key: 'workspace', label: 'Workspace', icon: Settings2 },
  { key: 'whatsapp', label: 'WhatsApp Connection', icon: QrCode },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'team', label: 'Team Members', icon: Users },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'api', label: 'API Keys', icon: Key },
];

export function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const Current = useMemo(() => TABS.find((t) => t.key === tab), [tab]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-3 p-3">
        <div className="px-3 py-3">
          <div className="text-sm font-semibold text-gray-900">Settings</div>
          <div className="mt-1 text-sm text-gray-500">Manage your workspace.</div>
        </div>
        <div className="space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="col-span-9 space-y-6">
        <div>
          <div className="text-2xl font-semibold text-gray-900">{Current?.label}</div>
          <div className="mt-1 text-sm text-gray-500">Keep everything up to date for a smooth workflow.</div>
        </div>

        {tab === 'profile' ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">Profile</div>
                <div className="mt-1 text-sm text-gray-500">Update your personal details.</div>
              </div>
              <Button>Save Changes</Button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">First Name</div>
                <Input className="mt-2" defaultValue="Jordan" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Last Name</div>
                <Input className="mt-2" defaultValue="Lee" />
              </div>
              <div className="col-span-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</div>
                <Input className="mt-2" defaultValue="jordan@acme.com" disabled />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Current Password</div>
                <Input className="mt-2" type="password" placeholder="••••••••" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">New Password</div>
                <Input className="mt-2" type="password" placeholder="••••••••" />
              </div>
            </div>
          </Card>
        ) : null}

        {tab === 'workspace' ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">Workspace</div>
                <div className="mt-1 text-sm text-gray-500">Team-level preferences.</div>
              </div>
              <Button>Save</Button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Workspace name</div>
                <Input className="mt-2" defaultValue="Acme Sales" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Timezone</div>
                <select className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand-accent">
                  <option>PST</option>
                  <option>EST</option>
                  <option>UTC</option>
                </select>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Language</div>
                <select className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand-accent">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
            </div>
          </Card>
        ) : null}

        {tab === 'whatsapp' ? (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">Connection Status</div>
                  <div className="mt-1 text-sm text-gray-500">Keep your WhatsApp connection healthy.</div>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="mt-4 text-sm text-gray-500">Phone: +1 415 555 0123</div>
              <div className="mt-1 text-xs text-gray-400">Last connected: 2 hours ago</div>
              <Button variant="outline" className="mt-4 text-red-600 hover:text-red-600">
                Disconnect
              </Button>
            </Card>
            <Card>
              <div className="text-base font-semibold text-gray-900">QR Code</div>
              <div className="mt-1 text-sm text-gray-500">Scan to connect a new device (placeholder).</div>
              <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">Scan to connect</div>
              </div>
            </Card>
          </div>
        ) : null}

        {tab === 'notifications' ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">Notifications</div>
                <div className="mt-1 text-sm text-gray-500">Choose what you get notified about.</div>
              </div>
              <Button>Save</Button>
            </div>
            <div className="mt-6 space-y-3">
              {['New inbound messages', 'Mentions / assignments', 'Automation failures', 'Daily summary'].map((n) => (
                <label key={n} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                  <div className="text-sm font-medium text-gray-900">{n}</div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent" />
                </label>
              ))}
            </div>
          </Card>
        ) : null}

        {tab === 'team' ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">Team Members</div>
                <div className="mt-1 text-sm text-gray-500">Invite and manage access.</div>
              </div>
              <Button>Invite Member</Button>
            </div>
            <div className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-100">
              {[
                { name: 'Jordan Lee', email: 'jordan@acme.com', role: 'user' },
                { name: 'Priya Shah', email: 'priya@acme.com', role: 'user' },
                { name: 'Ava Martinez', email: 'ava@acme.com', role: 'admin' },
              ].map((m) => (
                <div key={m.email} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.name}</div>
                    <div className="text-sm text-gray-500">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={m.role === 'admin' ? 'success' : 'muted'}>{m.role}</Badge>
                    <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" type="button" aria-label="Remove">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {tab === 'billing' ? (
          <Card>
            <div className="text-base font-semibold text-gray-900">Billing</div>
            <div className="mt-1 text-sm text-gray-500">Billing will be connected later.</div>
            <div className="mt-6 rounded-xl border border-gray-100 p-4">
              <div className="text-sm font-medium text-gray-900">Current plan</div>
              <div className="mt-1 text-sm text-gray-500">Pro (placeholder)</div>
              <Button variant="outline" className="mt-4">
                Manage billing
              </Button>
            </div>
          </Card>
        ) : null}

        {tab === 'api' ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">API Keys</div>
                <div className="mt-1 text-sm text-gray-500">Keep keys secure. Rotate when needed.</div>
              </div>
              <Button>Generate API Key</Button>
            </div>
            <div className="mt-6 space-y-3">
              {['•••• •••• •••• 1A2B', '•••• •••• •••• 9F0C'].map((k) => (
                <div key={k} className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                  <div>
                    <div className="font-mono text-sm text-gray-900">{k}</div>
                    <div className="mt-1 text-xs text-gray-500">Created: 2026-03-01</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600">
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Warning: Treat API keys like passwords. Don’t commit them to git.
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

