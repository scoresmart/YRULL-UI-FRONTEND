import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MessageCircle,
  AtSign,
  EyeOff,
  Reply,
  Search,
  Instagram,
  Loader2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { CommentCard } from '../../components/comments/CommentCard';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PostSelector } from '../../components/comments/PostSelector';
import { ConnectFacebookButton } from '../../components/integrations/ConnectFacebookButton';
import { instagramApi } from '../../lib/api';
import {
  useComments,
  useMentions,
  useReplyToComment,
  useHideComment,
  useUnhideComment,
  useDeleteComment,
} from '../../lib/dataHooks';
import { useCommentsRealtime } from '../../hooks/useCommentsRealtime';
import { useAuthStore } from '../../store/authStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ENV } from '../../lib/env';

const TABS = [
  { key: 'all', label: 'All comments', icon: MessageCircle },
  { key: 'mentions', label: 'Mentions', icon: AtSign },
  { key: 'hidden', label: 'Hidden', icon: EyeOff },
  { key: 'replied', label: 'Replied', icon: Reply },
];

const DATE_RANGES = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

function isInDateRange(timestamp, range) {
  if (range === 'all' || !timestamp) return true;
  const date = new Date(timestamp);
  const now = new Date();
  if (range === 'today') {
    return date.toDateString() === now.toDateString();
  }
  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }
  if (range === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return date >= monthAgo;
  }
  return true;
}

function ConnectPrompt() {
  return (
    <div className="-mx-4 -my-4 flex min-h-[calc(100vh-56px)] items-center justify-center bg-gray-50 sm:-mx-6 sm:-my-6 sm:min-h-[calc(100vh-4rem)] lg:-mx-8 lg:-my-8">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
          <Instagram className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Connect Instagram to manage comments</h2>
        <p className="mt-2 text-gray-500">
          Connect your Instagram Business account to view, reply to, hide, and delete comments on your posts.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <ConnectFacebookButton className="min-h-[48px] w-full max-w-sm px-6" size="lg" intent="linkWorkspace" />
          <Link to="/integrations">
            <Button variant="outline" size="sm" className="gap-2">
              Or configure in Integrations <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function TokenExpiredBanner({ onReconnect }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900">Your Instagram connection has expired</p>
        <p className="text-xs text-amber-700">Reconnect to continue managing comments.</p>
      </div>
      <Link to="/integrations">
        <Button size="sm" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Reconnect
        </Button>
      </Link>
    </div>
  );
}

function EmptyState({ tab, hasFilters }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Filter className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-gray-700">No comments match your filters</h3>
        <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filters.</p>
      </div>
    );
  }

  const config = {
    all: { title: 'No comments yet', desc: 'Comments from your Instagram posts will appear here.' },
    mentions: { title: 'No mentions yet', desc: "Posts and comments where you're @mentioned will appear here." },
    hidden: { title: 'No hidden comments', desc: "You haven't hidden any comments yet." },
    replied: { title: 'No replies yet', desc: "Comments you've replied to will appear here." },
  }[tab] || { title: 'No comments', desc: '' };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <MessageCircle className="h-7 w-7 text-gray-400" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-700">{config.title}</h3>
      <p className="mt-1 text-xs text-gray-400">{config.desc}</p>
    </div>
  );
}

export function CommentsPage() {
  useDocumentTitle('Comments', 'Manage Instagram comments and mentions.');

  const profile = useAuthStore((s) => s.profile);
  const workspaceId = profile?.workspace_id;

  const [tab, setTab] = useState('all');
  const [postId, setPostId] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [showSidebar, setShowSidebar] = useState(true);

  const { data: igStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['instagram_status'],
    queryFn: () => instagramApi.getStatus(),
    staleTime: 60_000,
    retry: 1,
  });

  const connected = igStatus?.connected;
  const tokenExpired = igStatus?.error === 'token_expired' || igStatus?.status === 'expired';

  const statusFilter = tab === 'hidden' ? 'hidden' : tab === 'replied' ? 'replied' : undefined;
  const {
    data: comments = [],
    isLoading: commentsLoading,
    error: commentsError,
  } = useComments({
    postId,
    status: statusFilter,
  });

  const { data: mentions = [], isLoading: mentionsLoading } = useMentions();

  const replyMutation = useReplyToComment();
  const hideMutation = useHideComment();
  const unhideMutation = useUnhideComment();
  const deleteMutation = useDeleteComment();

  useCommentsRealtime({ enabled: connected && !ENV.USE_MOCK, workspaceId });

  const displayItems = useMemo(() => {
    let items = tab === 'mentions' ? mentions : comments;
    if (!Array.isArray(items)) items = [];

    if (dateRange !== 'all') {
      items = items.filter((c) => isInDateRange(c.timestamp || c.created_at, dateRange));
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(
        (c) =>
          (c.text || '').toLowerCase().includes(q) || (c.username || c.from?.username || '').toLowerCase().includes(q),
      );
    }
    return items;
  }, [tab, comments, mentions, dateRange, debouncedSearch]);

  const isLoading = statusLoading || (tab === 'mentions' ? mentionsLoading : commentsLoading);
  const hasFilters = Boolean(search.trim() || postId || dateRange !== 'all');

  if (statusLoading) {
    return (
      <div className="-mx-4 -my-4 flex h-[calc(100vh-56px)] items-center justify-center sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!connected && !tokenExpired) {
    return <ConnectPrompt />;
  }

  return (
    <div className="-mx-4 -my-4 flex h-[calc(100vh-56px)] flex-col bg-gray-50 sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-4rem)] lg:-mx-8 lg:-my-8">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
        {tokenExpired && (
          <div className="mb-4">
            <TokenExpiredBanner />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Comments</h1>
            <p className="text-xs text-gray-500">Manage comments and mentions across your Instagram posts</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 lg:hidden"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </Button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar filters */}
        <aside
          className={`w-60 shrink-0 border-r border-gray-200 bg-white p-4 ${showSidebar ? 'block' : 'hidden lg:block'}`}
        >
          <div className="space-y-5">
            {/* Search */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Search</label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search comments..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>

            {/* Filter by post */}
            {tab !== 'mentions' && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Post</label>
                <div className="mt-1.5">
                  <PostSelector selectedPostId={postId} onSelect={setPostId} />
                </div>
              </div>
            )}

            {/* Date range */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Date range</label>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {DATE_RANGES.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDateRange(d.key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      dateRange === d.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            {!isLoading && (
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{displayItems.length}</div>
                <div className="text-xs text-gray-500">{tab === 'mentions' ? 'mentions' : 'comments'}</div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
          {commentsError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {commentsError.message?.includes('rate limit') || commentsError.message?.includes('429')
                ? "You've hit Instagram's rate limit. Try again in a few minutes."
                : commentsError.message || 'Failed to load comments'}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </div>
          ) : displayItems.length === 0 ? (
            <EmptyState tab={tab} hasFilters={hasFilters} />
          ) : (
            <div className="mx-auto max-w-2xl space-y-3">
              {displayItems.map((c) => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  onReply={(id, text) => replyMutation.mutate({ commentId: id, message: text })}
                  onHide={(id) => hideMutation.mutate(id)}
                  onUnhide={(id) => unhideMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  replyMutation={replyMutation}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
