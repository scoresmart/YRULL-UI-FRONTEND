import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConversationList } from '../../components/whatsapp/ConversationList';
import { ChatWindow } from '../../components/whatsapp/ChatWindow';
import { ContactInfoPanel } from '../../components/whatsapp/ContactInfoPanel';
import { IncomingCallNotification } from '../../components/whatsapp/IncomingCallNotification';
import { WhatsAppConnectionCard } from '../../components/whatsapp/WhatsAppConnectionCard';
import { useRealtime } from '../../hooks/useRealtime';
import { useWhatsAppIntegration } from '../../hooks/useWhatsAppIntegration';
import { useIsMobile, useIsDesktop } from '../../hooks/useMediaQuery';
import { ENV } from '../../lib/env';
import { useChatStore } from '../../store/chatStore';
import { MessageSquare, Loader2 } from 'lucide-react';

export function WhatsAppPage() {
  const queryClient = useQueryClient();
  const processingMessages = useRef(new Set());
  const selectedWaId = useChatStore((s) => s.selectedWaId);
  const setSelectedWaId = useChatStore((s) => s.setSelectedWaId);
  const wa = useWhatsAppIntegration();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const [showContactInfo, setShowContactInfo] = useState(false);

  useEffect(() => {
    setSelectedWaId(null);
  }, [setSelectedWaId]);

  useRealtime({
    enabled: !ENV.USE_MOCK && wa.connected,
    onMessage: (payload) => {
      try {
        if (payload.new?.wa_id) {
          const waId = payload.new.wa_id;
          const newMsg = payload.new;
          const msgKey = newMsg.id || `${newMsg.body}_${newMsg.created_at}_${newMsg.direction}_${newMsg.wa_id}`;
          if (processingMessages.current.has(msgKey)) return;
          processingMessages.current.add(msgKey);
          setTimeout(() => {
            processingMessages.current.delete(msgKey);
          }, 1000);

          queryClient.setQueryData(['whatsapp_messages', waId], (oldData) => {
            if (!oldData) return [newMsg];
            const exists = oldData.some((msg) => {
              if (msg.id && newMsg.id && msg.id === newMsg.id) return true;
              return (
                msg.body === newMsg.body &&
                msg.created_at === newMsg.created_at &&
                msg.direction === newMsg.direction &&
                msg.wa_id === newMsg.wa_id
              );
            });
            if (exists) return oldData;
            const updated = [...oldData, newMsg].sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
            );
            const seenIds = new Set();
            const deduped = updated.filter((msg) => {
              if (msg.id) {
                if (seenIds.has(msg.id)) return false;
                seenIds.add(msg.id);
              }
              return true;
            });
            const seenContent = new Set();
            return deduped.filter((msg) => {
              const key = `${msg.body || '[no body]'}_${msg.created_at}_${msg.direction}_${msg.wa_id}`;
              if (seenContent.has(key)) return false;
              seenContent.add(key);
              return true;
            });
          });
          queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
        }
      } catch (error) {
        console.error('Error processing real-time message:', error);
      }
    },
    onContactUpdate: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      } catch {}
    },
  });

  if (wa.loading) {
    return (
      <div className="-mx-4 -my-4 flex h-[calc(100vh-56px)] items-center justify-center bg-brand-chatBg sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading WhatsApp…</span>
        </div>
      </div>
    );
  }

  if (!wa.connected) {
    return (
      <div className="-mx-4 -my-4 h-[calc(100vh-56px)] sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8">
        <div className="flex h-full flex-col sm:flex-row">
          <div className="hidden h-full w-[320px] flex-col border-r border-brand-border bg-white sm:flex">
            <div className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Conversations</div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <MessageSquare className="h-7 w-7 text-gray-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-500">No conversations</p>
              <p className="mt-1 text-xs text-gray-400">Connect WhatsApp to start</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center bg-brand-chatBg px-4 sm:px-6">
            <WhatsAppConnectionCard wa={wa} />
          </div>
        </div>
      </div>
    );
  }

  const showList = isMobile ? !selectedWaId : true;
  const showThread = isMobile ? !!selectedWaId : true;
  const showInfo = isDesktop || showContactInfo;

  return (
    <div className="-mx-4 -my-4 h-[calc(100vh-56px)] sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8">
      <WhatsAppConnectionCard wa={wa} compact />

      <div className="flex h-[calc(100%-56px)]">
        {showList && <ConversationList className={isMobile ? 'w-full' : 'w-[320px]'} />}
        {showThread && (
          <ChatWindow
            connected={wa.connected}
            onBack={isMobile ? () => setSelectedWaId(null) : undefined}
            onToggleInfo={() => setShowContactInfo((v) => !v)}
            className="flex-1"
          />
        )}
        {showInfo && !isMobile && (
          <ContactInfoPanel onClose={!isDesktop ? () => setShowContactInfo(false) : undefined} />
        )}
      </div>
      <IncomingCallNotification />
    </div>
  );
}
