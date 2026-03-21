import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConversationList } from '../../components/whatsapp/ConversationList';
import { ChatWindow } from '../../components/whatsapp/ChatWindow';
import { ContactInfoPanel } from '../../components/whatsapp/ContactInfoPanel';
import { IncomingCallNotification } from '../../components/whatsapp/IncomingCallNotification';
import { useRealtime } from '../../hooks/useRealtime';
import { ENV } from '../../lib/env';
import { useChatStore } from '../../store/chatStore';

export function WhatsAppPage() {
  const queryClient = useQueryClient();
  const processingMessages = useRef(new Set()); // Track messages being processed
  const setSelectedWaId = useChatStore((s) => s.setSelectedWaId);

  // Ensure no conversation is selected by default when page loads
  useEffect(() => {
    setSelectedWaId(null);
  }, [setSelectedWaId]);

  // Subscribe to real-time message updates
  useRealtime({
    enabled: !ENV.USE_MOCK,
    onMessage: (payload) => {
      try {
        // Update cache directly to avoid duplicate messages
        if (payload.new?.wa_id) {
          const waId = payload.new.wa_id;
          const newMsg = payload.new;
          
          // Create a unique key for this message to prevent duplicate processing
          const msgKey = newMsg.id || `${newMsg.body}_${newMsg.created_at}_${newMsg.direction}_${newMsg.wa_id}`;
          
          // Skip if we're already processing this exact message
          if (processingMessages.current.has(msgKey)) {
            return;
          }
          
          processingMessages.current.add(msgKey);
          
          // Remove from processing set after a short delay
          setTimeout(() => {
            processingMessages.current.delete(msgKey);
          }, 1000);
          
          // Debug logging (only shows in dev tools with verbose logging enabled)
          console.debug('[Realtime] New message received:', {
            id: newMsg.id,
            wa_id: newMsg.wa_id,
            direction: newMsg.direction,
            body: newMsg.body?.substring(0, 50),
            created_at: newMsg.created_at,
            ai_intent: newMsg.ai_intent,
            automated: newMsg.automated,
            message_type: newMsg.message_type,
          });
          
          queryClient.setQueryData(['whatsapp_messages', waId], (oldData) => {
            if (!oldData) return [newMsg];
            
            // More aggressive deduplication: check by ID, or by content + timestamp + direction
            // IMPORTANT: Don't filter out messages without body - automated messages might not have body initially
            const exists = oldData.some((msg) => {
              // Primary check: same ID
              if (msg.id && newMsg.id && msg.id === newMsg.id) return true;
              
              // Fallback check: same content, timestamp, direction, and wa_id
              // Use empty string for body comparison to handle messages without body
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
            
            if (exists) {
              // Message already exists, return unchanged
              console.debug('[Realtime] Message already exists, skipping:', newMsg.id || newMsg.body?.substring(0, 30));
              return oldData;
            }
            
            // Add new message and sort by created_at
            const updated = [...oldData, newMsg].sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );
            
            // Final deduplication pass by ID
            const seenIds = new Set();
            const deduplicated = updated.filter((msg) => {
              if (msg.id) {
                if (seenIds.has(msg.id)) return false;
                seenIds.add(msg.id);
                return true;
              }
              return true; // Keep messages without IDs for now
            });
            
            // Additional deduplication by content + timestamp
            // Use empty string for body to ensure messages without body are included
            const seenContent = new Set();
            const final = deduplicated.filter((msg) => {
              const bodyKey = msg.body || '[no body]';
              const key = `${bodyKey}_${msg.created_at}_${msg.direction}_${msg.wa_id}`;
              if (seenContent.has(key)) return false;
              seenContent.add(key);
              return true;
            });
            
            // Debug logging (only shows in dev tools with verbose logging enabled)
            console.debug(`[Realtime] Added message. Total: ${final.length}`);
            return final;
          });
          
          // Invalidate contacts to refresh last message preview
          queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
          
          // If it's an inbound message, trigger unread count refresh
          // This will be handled by ConversationList's interval, but we can also invalidate
          // to force immediate update
          if (newMsg.direction === 'inbound') {
            // Force refresh of unread counts in ConversationList
            // The component will pick this up via its refresh interval
          }
        }
      } catch (error) {
        console.error('Error processing real-time message:', error);
      }
    },
    onContactUpdate: (payload) => {
      try {
        // Invalidate contacts when they're updated (e.g., last_seen changes)
        queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      } catch (error) {
        console.error('Error processing contact update:', error);
      }
    },
  });

  return (
    <div className="-mx-8 -my-8 h-[calc(100vh-64px)]">
      <div className="flex h-full">
        <ConversationList />
        <ChatWindow />
        <ContactInfoPanel />
      </div>
      <IncomingCallNotification />
    </div>
  );
}

