import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConversationList } from '../../components/whatsapp/ConversationList';
import { ChatWindow } from '../../components/whatsapp/ChatWindow';
import { ContactInfoPanel } from '../../components/whatsapp/ContactInfoPanel';
import { IncomingCallNotification } from '../../components/whatsapp/IncomingCallNotification';
import { WhatsAppConnectionCard } from '../../components/whatsapp/WhatsAppConnectionCard';
import { useRealtime } from '../../hooks/useRealtime';
import { useWhatsAppIntegration } from '../../hooks/useWhatsAppIntegration';
import { ENV } from '../../lib/env';
import { useChatStore } from '../../store/chatStore';
import { MessageSquare, Loader2 } from 'lucide-react';

export function WhatsAppPage() {
  const queryClient = useQueryClient();
  const processingMessages = useRef(new Set());
  const setSelectedWaId = useChatStore((s) => s.setSelectedWaId);
  const wa = useWhatsAppIntegration();

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
              const msgBody = msg.body || '';
              const newMsgBody = newMsg.body || '';
              if (
                msgBody === newMsgBody &&
                msg.created_at === newMsg.created_at &&
                msg.direction === newMsg.direction &&
                msg.wa_id === newMsg.wa_id
              ) {
                return true;
              }
              return false;
            });

            if (exists) return oldData;

            const updated = [...oldData, newMsg].sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );

            const seenIds = new Set();
            const deduplicated = updated.filter((msg) => {
              if (msg.id) {
                if (seenIds.has(msg.id)) return false;
                seenIds.add(msg.id);
                return true;
              }
              return true;
            });

            const seenContent = new Set();
            return deduplicated.filter((msg) => {
              const bodyKey = msg.body || '[no body]';
              const key = `${bodyKey}_${msg.created_at}_${msg.direction}_${msg.wa_id}`;
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
      } catch (error) {
        console.error('Error processing contact update:', error);
      }
    },
  });

  if (wa.loading) {
    return (
      <div className="-mx-8 -my-8 flex h-[calc(100vh-64px)] items-center justify-center bg-brand-chatBg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading WhatsApp…</span>
        </div>
      </div>
    );
  }

  if (!wa.connected) {
    return (
      <div className="-mx-8 -my-8 h-[calc(100vh-64px)]">
        <div className="flex h-full">
          {/* Empty sidebar */}
          <div className="flex h-full w-[320px] flex-col border-r border-brand-border bg-white">
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

          {/* Connection card center */}
          <div className="flex flex-1 flex-col items-center justify-center bg-brand-chatBg px-6">
            <WhatsAppConnectionCard wa={wa} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-8 -my-8 h-[calc(100vh-64px)]">
      {/* Connected banner */}
      <WhatsAppConnectionCard wa={wa} compact />

      <div className="flex" style={{ height: 'calc(100vh - 64px - 56px)' }}>
        <ConversationList />
        <ChatWindow connected={wa.connected} />
        <ContactInfoPanel />
      </div>
      <IncomingCallNotification />
    </div>
  );
}
