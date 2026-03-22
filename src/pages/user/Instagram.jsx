import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Instagram as InstagramIcon, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { ConnectFacebookButton } from '../../components/integrations/ConnectFacebookButton';
import { IgConversationList } from '../../components/instagram/IgConversationList';
import { IgChatWindow } from '../../components/instagram/IgChatWindow';
import { useChatStore } from '../../store/chatStore';
import { supabase } from '../../lib/supabase';
import { ENV } from '../../lib/env';
import { instagramApi } from '../../lib/api';

function ConnectPrompt() {
  const navigate = useNavigate();
  const apiMissing = import.meta.env.PROD && !(ENV.API_BASE_URL || '').trim();

  return (
    <div className="-mx-8 -my-8 min-h-[calc(100vh-4rem)] overflow-y-auto bg-gray-50 py-10">
      <div className="relative z-10 mx-auto max-w-md px-6 text-center">
        {apiMissing ? (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-950 shadow-sm">
            <p className="font-semibold">Instagram connect needs your API URL</p>
            <p className="mt-2 text-amber-900/90">
              Add <code className="rounded bg-white/90 px-1.5 py-0.5 text-xs">VITE_API_BASE_URL</code> in Vercel (e.g.{' '}
              <span className="whitespace-nowrap">https://api.your-domain.com</span>) pointing to the server that
              implements <code className="rounded bg-white/90 px-1 text-xs">/oauth/instagram/authorize</code>, then
              redeploy. A relative URL cannot reach your backend from this site.
            </p>
          </div>
        ) : null}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
          <InstagramIcon className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Instagram</h2>
        <p className="text-gray-500 mb-6">
          Connect your Instagram account to receive and reply to DMs, comments, and story replies — all from one place.
        </p>
        <div className="relative z-20 flex flex-col items-center gap-3">
          <ConnectFacebookButton
            className="min-h-[48px] min-w-[200px] w-full max-w-sm px-6 sm:w-auto"
            size="lg"
            whenNoWorkspace="toast"
            noWorkspaceMessage="No workspace on your profile yet. Finish onboarding, or sign out and sign in again. You can also add tokens under Integrations."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/integrations')}
          >
            Or enter tokens manually
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          OAuth uses your backend; you can also add Page ID and token manually in Integrations.
        </p>
      </div>
    </div>
  );
}

export function InstagramPage() {
  const queryClient = useQueryClient();
  const setSelectedIgUserId = useChatStore((s) => s.setSelectedIgUserId);

  const { data: status, isLoading } = useQuery({
    queryKey: ['instagram_status'],
    queryFn: () => instagramApi.getStatus(),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    setSelectedIgUserId(null);
  }, [setSelectedIgUserId]);

  // Real-time subscription for instagram_messages
  useEffect(() => {
    if (ENV.USE_MOCK) return;
    if (!supabase || typeof supabase.channel !== 'function') return;

    const channel = supabase
      .channel('instagram-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'instagram_messages' },
        (payload) => {
          if (payload.new?.ig_user_id) {
            queryClient.invalidateQueries({ queryKey: ['instagram_messages', payload.new.ig_user_id] });
            queryClient.invalidateQueries({ queryKey: ['instagram_contacts'] });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instagram_contacts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['instagram_contacts'] });
        },
      )
      .subscribe();

    return () => {
      if (supabase && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="-mx-8 -my-8 h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!status?.connected) {
    return <ConnectPrompt />;
  }

  return (
    <div className="-mx-8 -my-8 h-[calc(100vh-64px)]">
      <div className="flex h-full">
        <IgConversationList />
        <IgChatWindow />
      </div>
    </div>
  );
}
