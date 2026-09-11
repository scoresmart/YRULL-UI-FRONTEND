import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Instagram, MessageCircle, AtSign } from 'lucide-react';
import { cn, formatRelativeTime } from '../../lib/utils';
import { useChatStore } from '../../store/chatStore';
import { useInstagramMessages, useInstagramContacts } from '../../lib/dataHooks';
import { instagramApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

function EventTypeBadge({ eventType }) {
  if (eventType === 'comment') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
        <MessageCircle className="h-3 w-3" /> Comment
      </span>
    );
  }
  if (eventType === 'story_reply') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700">
        <AtSign className="h-3 w-3" /> Story
      </span>
    );
  }
  return null;
}

export function IgChatWindow() {
  const selectedIgUserId = useChatStore((s) => s.selectedIgUserId);
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messageFilter, setMessageFilter] = useState('messages');
  const bottomRef = useRef(null);

  const messagesQ = useInstagramMessages(selectedIgUserId);
  const contactsQ = useInstagramContacts();
  const messages = messagesQ.data || [];

  const filteredMessages = useMemo(() => {
    if (messageFilter === 'all') return messages;
    if (messageFilter === 'comments') {
      return messages.filter((msg) => msg.event_type === 'comment');
    }
    return messages.filter((msg) => msg.event_type !== 'comment');
  }, [messages, messageFilter]);

  const contact = (contactsQ.data || []).find((c) => c.ig_user_id === selectedIgUserId);
  const contactName = contact?.name || contact?.username || selectedIgUserId || '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages.length]);

  useEffect(() => {
    if (!selectedIgUserId) {
      setMessageFilter('messages');
    }
  }, [selectedIgUserId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedIgUserId) return;
    setSending(true);
    setInput('');
    try {
      await instagramApi.sendMessage({ to: selectedIgUserId, message: text });
      queryClient.invalidateQueries({ queryKey: ['instagram_messages', selectedIgUserId] });
    } catch (err) {
      toast.error(err.message || 'Failed to send');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  if (!selectedIgUserId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50">
        <Instagram className="h-16 w-16 text-gray-200" />
        <p className="mt-4 text-lg font-medium text-gray-400">Select a conversation</p>
        <p className="text-sm text-gray-300">Choose an Instagram conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-3">
        <Instagram className="h-5 w-5 text-purple-600" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{contactName}</h3>
          {contact?.username && <p className="text-xs text-purple-500">@{contact.username}</p>}
        </div>
      </div>

      <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMessageFilter('messages')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              messageFilter === 'messages' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100',
            )}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={() => setMessageFilter('comments')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              messageFilter === 'comments' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100',
            )}
          >
            Comments
          </button>
          <button
            type="button"
            onClick={() => setMessageFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              messageFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100',
            )}
          >
            All
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messagesQ.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">
              {messageFilter === 'comments'
                ? 'No comments in this thread'
                : messageFilter === 'messages'
                  ? 'No direct messages in this thread'
                  : 'No messages yet'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, i) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div key={msg.id || i} className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2',
                    isOutbound ? 'bg-purple-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md',
                  )}
                >
                  {msg.event_type && msg.event_type !== 'dm' && (
                    <div className="mb-1">
                      <EventTypeBadge eventType={msg.event_type} />
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  <p className={cn('mt-1 text-xs', isOutbound ? 'text-purple-200' : 'text-gray-400')}>
                    {formatRelativeTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
