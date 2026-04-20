import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  CheckCircle2,
  Phone,
  Building2,
  Hash,
  Calendar,
  AlertTriangle,
  Loader2,
  Unplug,
  RefreshCw,
  LinkIcon,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

const WA_LOGO = (
  <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function DisconnectModal({ open, onOpenChange, onConfirm, disconnecting }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Disconnect WhatsApp
          </DialogTitle>
          <DialogDescription>
            This will disconnect WhatsApp for this workspace only. Other workspaces are not affected.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          You will stop receiving messages until you reconnect. Existing conversations will be preserved.
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={disconnecting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={disconnecting}>
            {disconnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting…
              </>
            ) : (
              <>
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Full-size connection card (disconnected empty state)
 */
function FullCard({ wa }) {
  return (
    <div className="w-full max-w-lg">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#25D366]/10 p-4 text-[#25D366]">
            {WA_LOGO}
          </div>
          <h2 className="mt-5 text-xl font-semibold text-gray-900">Connect your WhatsApp Business account</h2>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            Each workspace connects its own WhatsApp number. Messages are completely isolated per workspace — no data is
            shared.
          </p>

          {wa.error && (
            <div className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {wa.error}
            </div>
          )}

          <Button className="mt-6 gap-2 bg-[#25D366] hover:bg-[#1fad54]" size="lg" onClick={wa.connect}>
            <LinkIcon className="h-4 w-4" />
            Connect WhatsApp
          </Button>

          <div className="mt-8 grid w-full grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 p-3">
              <ShieldCheck className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500">Workspace isolated</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 p-3">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500">Your own number</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-gray-50 p-3">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500">Meta Business Suite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact connected banner for top of WhatsApp page
 */
function CompactCard({ wa }) {
  const [showDisconnect, setShowDisconnect] = useState(false);
  const s = wa.status || {};

  const handleDisconnect = async () => {
    await wa.disconnect();
    setShowDisconnect(false);
  };

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-brand-border bg-white px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 p-1.5 text-[#25D366]">
            {WA_LOGO}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
            {s.display_phone_number && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                {s.display_phone_number}
              </span>
            )}
            {s.verified_name && (
              <span className="hidden items-center gap-1.5 text-sm text-gray-500 sm:flex">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
                {s.verified_name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {s.phone_number_id && (
            <span className="hidden items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-500 lg:flex">
              <Hash className="h-3 w-3" />
              {s.phone_number_id}
            </span>
          )}
          {s.connected_at && (
            <span className="hidden items-center gap-1 text-xs text-gray-400 xl:flex">
              <Calendar className="h-3 w-3" />
              Since {new Date(s.connected_at).toLocaleDateString()}
            </span>
          )}
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={wa.refresh}
            title="Refresh status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-red-600"
            onClick={() => setShowDisconnect(true)}
          >
            <Unplug className="mr-1.5 h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </div>

      <DisconnectModal
        open={showDisconnect}
        onOpenChange={setShowDisconnect}
        onConfirm={handleDisconnect}
        disconnecting={wa.disconnecting}
      />
    </>
  );
}

/**
 * WhatsApp connection card — renders full empty-state or compact banner.
 */
export function WhatsAppConnectionCard({ wa, compact = false }) {
  if (compact && wa.connected) {
    return <CompactCard wa={wa} />;
  }
  if (!wa.connected) {
    return <FullCard wa={wa} />;
  }
  return null;
}
