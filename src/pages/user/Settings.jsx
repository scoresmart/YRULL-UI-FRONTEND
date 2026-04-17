import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Key, Bell, Users, CreditCard, Settings2, UserCircle, Phone,
  Loader2, Camera, Save, Trash2, AlertTriangle, Plus, RefreshCw,
  ExternalLink, Copy, Eye, EyeOff, Shield, Clock, CheckCircle2,
  Mail, BarChart3, Send, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Skeleton } from '../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceRole } from '../../hooks/useWorkspaceRole';
import { useWhatsAppIntegration } from '../../hooks/useWhatsAppIntegration';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { supabase } from '../../lib/supabase';
import { workspaceMembersApi, notificationPrefsApi, accountApi } from '../../lib/api';
import { ENV } from '../../lib/env';
import { cn, initialsFromName, pastelClassFromString, formatRelativeTime } from '../../lib/utils';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
];

const NOTIFICATION_PREFS = [
  { key: 'new_conversation', label: 'Email me when a new conversation starts', icon: Mail },
  { key: 'assigned', label: 'Email me when I\'m assigned a conversation', icon: Users },
  { key: 'daily_summary', label: 'Email me daily summary', icon: BarChart3 },
  { key: 'automation_failures', label: 'Email me automation failures', icon: AlertTriangle },
];

// ─── Sidebar tab config ─────────────────────────────────────────────────────

function getTabs(role) {
  const all = [
    { key: 'profile', label: 'Profile', icon: UserCircle },
    { key: 'workspace', label: 'Workspace', icon: Settings2 },
    { key: 'whatsapp', label: 'WhatsApp', icon: Phone },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'team', label: 'Team Members', icon: Users },
    { key: 'billing', label: 'Billing', icon: CreditCard },
    { key: 'api', label: 'API Keys', icon: Key },
  ];
  if (role === 'user' || role === 'agent') {
    return all.filter((t) => ['profile', 'notifications'].includes(t.key));
  }
  return all;
}

// ─── Profile tab ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const isSSO = session?.user?.app_metadata?.provider && session.user.app_metadata.provider !== 'email';

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => { if (profile?.full_name) setFullName(profile.full_name); }, [profile?.full_name]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (ENV.USE_MOCK) { toast.success('Profile updated'); setSaving(false); return; }
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', profile.id);
      if (error) throw error;
      await fetchProfile();
      toast.success('Profile updated');
    } catch (err) { toast.error(err.message || 'Failed to save profile'); }
    finally { setSaving(false); }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setAvatarUploading(true);
    try {
      if (ENV.USE_MOCK) { toast.success('Avatar updated'); setAvatarUploading(false); return; }
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = urlData?.publicUrl;
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id);
      if (dbErr) throw dbErr;
      await fetchProfile();
      toast.success('Avatar updated');
    } catch (err) { toast.error(err.message || 'Failed to upload avatar'); }
    finally { setAvatarUploading(false); }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setChangingPassword(true);
    try {
      if (ENV.USE_MOCK) { toast.success('Password changed'); setChangingPassword(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) { toast.error(err.message || 'Failed to change password'); }
    finally { setChangingPassword(false); }
  }

  const avatarCls = pastelClassFromString(profile?.email || '');

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSaveProfile}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900">Profile</div>
              <div className="mt-1 text-sm text-gray-500">Update your personal details.</div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save Changes
            </Button>
          </div>

          {/* Avatar */}
          <div className="mt-6 flex items-center gap-4">
            <div className="relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold', avatarCls)}>
                  {initialsFromName(profile?.full_name || 'U')}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gray-900 text-white hover:bg-gray-700">
                {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{profile?.full_name || 'User'}</div>
              <div className="text-xs text-gray-500">{profile?.email}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Full Name</label>
              <Input className="mt-2" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</label>
              <Input className="mt-2" value={profile?.email || ''} disabled />
              {isSSO && <p className="mt-1 text-xs text-gray-400">Managed by your identity provider</p>}
            </div>
          </div>
        </form>
      </Card>

      {/* Change password */}
      {!isSSO && (
        <Card>
          <form onSubmit={handleChangePassword}>
            <div className="text-base font-semibold text-gray-900">Change Password</div>
            <div className="mt-1 text-sm text-gray-500">Update your login password.</div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Current Password</label>
                <Input className="mt-2" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">New Password</label>
                <Input className="mt-2" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Confirm Password</label>
                <Input className="mt-2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" variant="outline" className="mt-4" disabled={changingPassword || !newPassword}>
              {changingPassword && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Update Password
            </Button>
          </form>
        </Card>
      )}

      {/* Delete account */}
      <DeleteAccountSection />
    </div>
  );
}

// ─── Delete Account ──────────────────────────────────────────────────────────

function DeleteAccountSection() {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      if (!ENV.USE_MOCK) await accountApi.deleteAccount();
      toast.success('Account deleted');
      await logout();
      navigate('/');
    } catch (err) { toast.error(err.message || 'Failed to delete account'); setDeleting(false); }
  }

  return (
    <Card className="border-red-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
        <div>
          <div className="text-base font-semibold text-red-700">Delete Account</div>
          <p className="mt-1 text-sm text-gray-500">Permanently delete your account and all data. This cannot be undone.</p>
        </div>
      </div>

      {step === 0 && (
        <Button variant="destructive" className="mt-4" onClick={() => setStep(1)}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete my account
        </Button>
      )}

      {step === 1 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Are you sure? This cannot be undone.</p>
          <p className="mt-1 text-xs text-red-600">All your data including conversations, automations, and connected accounts will be permanently deleted.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(0)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => setStep(2)}>Yes, I want to delete</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Type your email to confirm: <span className="font-mono">{profile?.email}</span></p>
          <Input className="mt-2 border-red-300" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={profile?.email} />
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStep(0); setConfirmEmail(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={confirmEmail !== profile?.email || deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Delete permanently
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Workspace tab ───────────────────────────────────────────────────────────

function WorkspaceTab() {
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { canDeleteWorkspace } = useWorkspaceRole();

  const ws = profile?.workspace;
  const [name, setName] = useState(ws?.name || '');
  const [timezone, setTimezone] = useState(ws?.timezone || 'UTC');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { if (ws?.name) setName(ws.name); if (ws?.timezone) setTimezone(ws.timezone); }, [ws?.name, ws?.timezone]);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Workspace name is required'); return; }
    setSaving(true);
    try {
      if (ENV.USE_MOCK) { toast.success('Workspace updated'); setSaving(false); return; }
      const { error } = await supabase.from('workspaces').update({ name: name.trim(), timezone }).eq('id', ws.id);
      if (error) throw error;
      await fetchProfile();
      toast.success('Workspace updated');
    } catch (err) { toast.error(err.message || 'Failed to update workspace'); }
    finally { setSaving(false); }
  }

  async function handleDeleteWorkspace() {
    setDeleteLoading(true);
    try {
      if (!ENV.USE_MOCK) {
        const { error } = await supabase.from('workspaces').delete().eq('id', ws.id);
        if (error) throw error;
      }
      toast.success('Workspace deleted');
      await logout();
      navigate('/');
    } catch (err) { toast.error(err.message || 'Failed to delete workspace'); setDeleteLoading(false); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSave}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900">Workspace</div>
              <div className="mt-1 text-sm text-gray-500">Team-level settings and preferences.</div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Workspace Name</label>
              <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Timezone</label>
              <select className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-brand-accent" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Workspace ID</label>
              <Input className="mt-2 font-mono text-xs" value={ws?.id || ''} disabled />
            </div>
          </div>
          {ws?.slug && (
            <div className="mt-3">
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Slug</label>
              <Input className="mt-2" value={ws.slug} disabled />
            </div>
          )}
        </form>
      </Card>

      {canDeleteWorkspace && (
        <Card className="border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <div className="text-base font-semibold text-red-700">Danger Zone</div>
              <p className="mt-1 text-sm text-gray-500">Deleting a workspace removes all its data, members, and integrations.</p>
            </div>
          </div>
          <Button variant="destructive" className="mt-4" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete workspace
          </Button>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-red-700">Delete workspace</DialogTitle>
                <DialogDescription>Type <span className="font-semibold">{ws?.name}</span> to confirm deletion.</DialogDescription>
              </DialogHeader>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={ws?.name} className="mt-2" />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" disabled={deleteConfirm !== ws?.name || deleteLoading} onClick={handleDeleteWorkspace}>
                  {deleteLoading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Delete permanently
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      )}
    </div>
  );
}

// ─── WhatsApp tab ────────────────────────────────────────────────────────────

function WhatsAppTab() {
  const wa = useWhatsAppIntegration();

  if (wa.loading) {
    return <Card><Skeleton className="h-6 w-48" /><Skeleton className="mt-4 h-4 w-64" /><Skeleton className="mt-2 h-4 w-56" /></Card>;
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">WhatsApp Connection</div>
          <div className="mt-1 text-sm text-gray-500">Manage your workspace WhatsApp Business connection.</div>
        </div>
        <Badge variant={wa.connected ? 'success' : wa.error ? 'warning' : 'muted'}>
          {wa.connected ? 'Connected' : wa.error ? 'Error' : 'Not connected'}
        </Badge>
      </div>

      {wa.connected && wa.status && (
        <div className="mt-6 space-y-3">
          {wa.status.phone_number && (
            <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-gray-400" /><span className="text-gray-700">{wa.status.phone_number}</span></div>
          )}
          {wa.status.business_name && (
            <div className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-gray-400" /><span className="text-gray-700">{wa.status.business_name}</span></div>
          )}
          {wa.status.phone_number_id && (
            <div className="flex items-center gap-2 text-sm"><Key className="h-4 w-4 text-gray-400" /><span className="font-mono text-xs text-gray-500">Phone ID: {wa.status.phone_number_id}</span></div>
          )}
          {wa.status.waba_id && (
            <div className="flex items-center gap-2 text-sm"><Key className="h-4 w-4 text-gray-400" /><span className="font-mono text-xs text-gray-500">WABA ID: {wa.status.waba_id}</span></div>
          )}
          {wa.status.connected_at && (
            <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Connected {formatRelativeTime(wa.status.connected_at)}</span></div>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={wa.refresh} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh status
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-600 gap-1.5"
              onClick={wa.disconnect}
              disabled={wa.disconnecting}
            >
              {wa.disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {!wa.connected && (
        <div className="mt-6">
          {wa.error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {wa.error}
            </div>
          )}
          <p className="text-sm text-gray-500">Connect your WhatsApp Business account to send and receive messages.</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={wa.connect} className="gap-1.5"><Plus className="h-4 w-4" /> Connect WhatsApp</Button>
            <Link to="/integrations"><Button variant="outline" className="gap-1.5"><ExternalLink className="h-4 w-4" /> Integrations</Button></Link>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Notifications tab ───────────────────────────────────────────────────────

function NotificationsTab() {
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notification_prefs'],
    queryFn: () => ENV.USE_MOCK
      ? NOTIFICATION_PREFS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {})
      : notificationPrefsApi.get(),
    staleTime: 30000,
  });

  const qc = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }) => notificationPrefsApi.update(key, enabled),
    onMutate: async ({ key, enabled }) => {
      await qc.cancelQueries({ queryKey: ['notification_prefs'] });
      const prev = qc.getQueryData(['notification_prefs']);
      qc.setQueryData(['notification_prefs'], (old) => ({ ...old, [key]: enabled }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notification_prefs'], ctx.prev);
      toast.error('Failed to update preference');
    },
    onSuccess: () => toast.success('Preference updated', { id: 'notif-pref' }),
  });

  const [pushEnabled, setPushEnabled] = useState(Notification.permission === 'granted');

  async function requestPush() {
    const result = await Notification.requestPermission();
    setPushEnabled(result === 'granted');
    if (result === 'granted') toast.success('Browser notifications enabled');
    else toast.error('Browser notifications were denied');
  }

  if (isLoading) return <Card><Skeleton className="h-6 w-48" />{[1,2,3,4].map(i => <Skeleton key={i} className="mt-4 h-12 w-full" />)}</Card>;

  return (
    <Card>
      <div className="text-base font-semibold text-gray-900">Notifications</div>
      <div className="mt-1 text-sm text-gray-500">Choose what you get notified about. Changes save automatically.</div>

      <div className="mt-6 space-y-3">
        {NOTIFICATION_PREFS.map((n) => {
          const Icon = n.icon;
          const enabled = prefs?.[n.key] ?? true;
          return (
            <label key={n.key} className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{n.label}</span>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(val) => toggleMutation.mutate({ key: n.key, enabled: val })}
              />
            </label>
          );
        })}

        {/* Browser push */}
        <div className="rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Browser push notifications</span>
            </div>
            {pushEnabled ? (
              <Badge variant="success">Enabled</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={requestPush}>Enable</Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Team tab ────────────────────────────────────────────────────────────────

function TeamTab() {
  const profile = useAuthStore((s) => s.profile);
  const { canManageTeam } = useWorkspaceRole();
  const qc = useQueryClient();

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['workspace_members'],
    queryFn: () => ENV.USE_MOCK ? [] : workspaceMembersApi.list(),
    staleTime: 30000,
  });

  const members = Array.isArray(membersData) ? membersData : membersData?.members ?? [];
  const invites = membersData?.invites ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [removeDialog, setRemoveDialog] = useState(null);

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => workspaceMembersApi.invite({ email, role }),
    onSuccess: () => { toast.success('Invite sent'); qc.invalidateQueries({ queryKey: ['workspace_members'] }); setInviteOpen(false); setInviteEmail(''); },
    onError: (err) => toast.error(err.message || 'Failed to send invite'),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => workspaceMembersApi.removeMember(id),
    onSuccess: () => { toast.success('Member removed'); qc.invalidateQueries({ queryKey: ['workspace_members'] }); setRemoveDialog(null); },
    onError: (err) => toast.error(err.message || 'Failed to remove member'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => workspaceMembersApi.changeRole(id, role),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries({ queryKey: ['workspace_members'] }); },
    onError: (err) => toast.error(err.message || 'Failed to change role'),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id) => workspaceMembersApi.revokeInvite(id),
    onSuccess: () => { toast.success('Invite revoked'); qc.invalidateQueries({ queryKey: ['workspace_members'] }); },
    onError: (err) => toast.error(err.message || 'Failed to revoke invite'),
  });

  const resendInviteMutation = useMutation({
    mutationFn: (id) => workspaceMembersApi.resendInvite(id),
    onSuccess: () => toast.success('Invite resent'),
    onError: (err) => toast.error(err.message || 'Failed to resend invite'),
  });

  if (isLoading) return <Card><Skeleton className="h-6 w-48" />{[1,2,3].map(i => <Skeleton key={i} className="mt-4 h-14 w-full" />)}</Card>;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">Team Members</div>
            <div className="mt-1 text-sm text-gray-500">Invite and manage workspace access.</div>
          </div>
          {canManageTeam && (
            <Button onClick={() => setInviteOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Invite Member</Button>
          )}
        </div>

        {members.length === 0 && !isLoading && (
          <div className="mt-6 rounded-xl border border-gray-100 p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No team members yet. Invite someone to get started.</p>
          </div>
        )}

        {members.length > 0 && (
          <div className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-100">
            {members.map((m) => {
              const isMe = m.id === profile?.id || m.email === profile?.email;
              const mAvatarCls = pastelClassFromString(m.email || '');
              return (
                <div key={m.id || m.email} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', mAvatarCls)}>
                        {initialsFromName(m.full_name || m.email || 'U')}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {m.full_name || m.email} {isMe && <span className="text-gray-400">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {canManageTeam && !isMe ? (
                      <select
                        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs focus:ring-2 focus:ring-brand-accent"
                        value={m.role || 'user'}
                        onChange={(e) => roleMutation.mutate({ id: m.id, role: e.target.value })}
                      >
                        <option value="admin">Admin</option>
                        <option value="user">Agent</option>
                      </select>
                    ) : (
                      <Badge variant={m.role === 'admin' || m.role === 'owner' ? 'success' : 'muted'}>{m.role || 'agent'}</Badge>
                    )}
                    {canManageTeam && !isMe && (
                      <button
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => setRemoveDialog(m)}
                        aria-label="Remove member"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card>
          <div className="text-base font-semibold text-gray-900">Pending Invites</div>
          <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{inv.email}</div>
                  <div className="text-xs text-gray-500">Invited as {inv.role || 'agent'} · {formatRelativeTime(inv.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => resendInviteMutation.mutate(inv.id)} disabled={resendInviteMutation.isPending}>
                    <Send className="mr-1 h-3 w-3" /> Resend
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => revokeInviteMutation.mutate(inv.id)} disabled={revokeInviteMutation.isPending}>
                    <X className="mr-1 h-3 w-3" /> Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>They will receive an email invitation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate({ email: inviteEmail, role: inviteRole }); }}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</label>
                <Input className="mt-1" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" required />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Role</label>
                <select className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="user">Agent</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteMutation.isPending || !inviteEmail}>
                {inviteMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Send invite
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove member dialog */}
      <Dialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>Remove {removeDialog?.full_name || removeDialog?.email} from this workspace? They will lose access immediately.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRemoveDialog(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(removeDialog?.id)}>
              {removeMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Billing tab ─────────────────────────────────────────────────────────────

function BillingTab() {
  return (
    <div className="space-y-6">
      {/* Trial banner */}
      <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-brand-accent" />
          <span className="text-sm font-semibold text-gray-900">Free Trial</span>
          <Badge>14 days remaining</Badge>
        </div>
        <p className="mt-1 text-xs text-gray-500">Your trial includes full access to all features.</p>
      </div>

      <Card>
        <div className="text-base font-semibold text-gray-900">Current Plan</div>
        <div className="mt-1 text-sm text-gray-500">You are on the free trial.</div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Contacts</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-900">0</span>
              <span className="mb-0.5 text-sm text-gray-400">/ 500</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand-accent" style={{ width: '0%' }} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Messages this month</div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-2xl font-bold text-gray-900">0</span>
              <span className="mb-0.5 text-sm text-gray-400">/ 2,000</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand-accent" style={{ width: '0%' }} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled title="Available soon" className="gap-1.5">
            <CreditCard className="h-4 w-4" /> Upgrade plan
          </Button>
          <Link to="/pricing"><Button variant="outline" className="gap-1.5"><ExternalLink className="h-4 w-4" /> View plans</Button></Link>
        </div>
      </Card>

      <Card className="border-amber-200 bg-amber-50/30">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
          <Clock className="h-4 w-4" /> Billing coming soon
        </div>
        <p className="mt-1 text-xs text-amber-700">
          Stripe integration is being configured. You&apos;ll be able to manage your subscription, view invoices, and upgrade plans here.
        </p>
      </Card>
    </div>
  );
}

// ─── API Keys tab ────────────────────────────────────────────────────────────

function ApiKeysTab() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">API Keys</div>
          <div className="mt-1 text-sm text-gray-500">Programmatic access to the Yrull API.</div>
        </div>
        <Button disabled title="Available soon" className="gap-1.5">
          <Plus className="h-4 w-4" /> Generate API Key
        </Button>
      </div>

      <div className="mt-6 rounded-xl border border-gray-100 p-8 text-center">
        <Key className="mx-auto h-10 w-10 text-gray-300" />
        <h3 className="mt-3 text-sm font-semibold text-gray-700">API keys coming soon</h3>
        <p className="mt-1 text-xs text-gray-400">
          The API keys feature is currently under development. You&apos;ll be able to generate, manage, and revoke keys for programmatic access.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          When available, treat API keys like passwords. Never commit them to version control.
        </div>
      </div>
    </Card>
  );
}

// ─── Main Settings page ──────────────────────────────────────────────────────

export function SettingsPage() {
  useDocumentTitle('Settings', 'Manage your Yrull workspace settings.');

  const { role } = useWorkspaceRole();
  const tabs = getTabs(role);
  const [tab, setTab] = useState(tabs[0]?.key || 'profile');

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
      {/* Desktop: sidebar tabs */}
      <Card className="hidden p-3 lg:col-span-3 lg:block">
        <div className="px-3 py-3">
          <div className="text-sm font-semibold text-gray-900">Settings</div>
          <div className="mt-1 text-xs text-gray-500">Manage your workspace.</div>
        </div>
        <div className="space-y-1">
          {tabs.map((t) => {
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

      {/* Mobile/Tablet: horizontal scrolling tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px lg:hidden">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6 lg:col-span-9">
        <div>
          <div className="text-xl font-semibold text-gray-900 sm:text-2xl">{tabs.find((t) => t.key === tab)?.label}</div>
          <div className="mt-1 text-sm text-gray-500">Keep everything up to date for a smooth workflow.</div>
        </div>

        {tab === 'profile' && <ProfileTab />}
        {tab === 'workspace' && <WorkspaceTab />}
        {tab === 'whatsapp' && <WhatsAppTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'team' && <TeamTab />}
        {tab === 'billing' && <BillingTab />}
        {tab === 'api' && <ApiKeysTab />}
      </div>
    </div>
  );
}
