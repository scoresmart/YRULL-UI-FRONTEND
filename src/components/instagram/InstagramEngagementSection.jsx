import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, Heart, MessageCircle, AtSign, Sparkles, Copy, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { formatRelativeTime } from '../../lib/utils';

function toCount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function trimText(value, max = 96) {
  if (!value) return 'Untitled post';
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function formatMetric(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

function buildBrief({ posts, comments, mentions, totals, topPosts, recentPost }) {
  const lines = [
    'Instagram engagement snapshot',
    `Posts tracked: ${totals.posts}`,
    `Total likes: ${totals.likes}`,
    `Total comments: ${totals.comments}`,
    `Mentions: ${totals.mentions}`,
    `Average interactions per post: ${totals.avgInteractions}`,
  ];

  if (recentPost) {
    lines.push(`Most recent post: ${trimText(recentPost.caption, 72)} (${formatRelativeTime(recentPost.timestamp || recentPost.created_at)})`);
  }

  if (topPosts.length > 0) {
    lines.push('Top posts by interactions:');
    topPosts.forEach((post, index) => {
      lines.push(
        `${index + 1}. ${trimText(post.caption, 60)} | likes: ${toCount(post.like_count)} | comments: ${toCount(post.comments_count)}`,
      );
    });
  }

  if (comments.length > 0 || mentions.length > 0) {
    lines.push(
      `Community signal: ${comments.length} fetched comments and ${mentions.length} mentions are available for response quality review.`,
    );
  }

  lines.push('Analyze which content themes drive the most interaction, where audience sentiment is strongest, and what replies or follow-ups should be prioritized.');
  return lines.join('\n');
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-gray-950">{value}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function InstagramEngagementSection({ posts = [], comments = [], mentions = [] }) {
  const { totals, topPosts, recentPost, brief } = useMemo(() => {
    const normalizedPosts = Array.isArray(posts) ? posts : [];
    const normalizedComments = Array.isArray(comments) ? comments : [];
    const normalizedMentions = Array.isArray(mentions) ? mentions : [];

    const likes = normalizedPosts.reduce((sum, post) => sum + toCount(post.like_count), 0);
    const postComments = normalizedPosts.reduce((sum, post) => sum + toCount(post.comments_count), 0);
    const avgInteractions = normalizedPosts.length
      ? ((likes + postComments) / normalizedPosts.length).toFixed(1)
      : '0';

    const rankedPosts = [...normalizedPosts]
      .sort(
        (a, b) =>
          toCount(b.like_count) + toCount(b.comments_count) - (toCount(a.like_count) + toCount(a.comments_count)),
      )
      .slice(0, 3);

    const freshestPost = [...normalizedPosts]
      .filter((post) => post?.timestamp || post?.created_at)
      .sort(
        (a, b) =>
          new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime(),
      )[0];

    const summaryTotals = {
      posts: normalizedPosts.length,
      likes,
      comments: normalizedComments.length || postComments,
      mentions: normalizedMentions.length,
      avgInteractions,
    };

    return {
      totals: summaryTotals,
      topPosts: rankedPosts,
      recentPost: freshestPost,
      brief: buildBrief({
        posts: normalizedPosts,
        comments: normalizedComments,
        mentions: normalizedMentions,
        totals: summaryTotals,
        topPosts: rankedPosts,
        recentPost: freshestPost,
      }),
    };
  }, [posts, comments, mentions]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      toast.success('Engagement brief copied');
    } catch {
      toast.error('Could not copy engagement brief');
    }
  }

  return (
    <section className="shrink-0 border-b border-gray-200 bg-[radial-gradient(circle_at_top_left,_rgba(245,133,41,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(221,42,123,0.14),_transparent_32%),linear-gradient(180deg,#fff_0%,#fff7fb_100%)] px-3 py-3 sm:px-4 sm:py-4">
      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <BarChart3 className="h-4 w-4 text-[#DD2A7B]" /> Engagement overview
              </div>
              <p className="mt-1 text-xs text-gray-600">
                A quick read of Instagram performance so Claude can analyze what is landing and what needs follow-up.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyBrief}>
              <Copy className="h-4 w-4" /> Copy brief for Claude
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={TrendingUp} label="Posts" value={formatMetric(totals.posts)} tone="bg-orange-100 text-orange-700" />
            <MetricCard icon={Heart} label="Likes" value={formatMetric(totals.likes)} tone="bg-rose-100 text-rose-700" />
            <MetricCard icon={MessageCircle} label="Comments" value={formatMetric(totals.comments)} tone="bg-fuchsia-100 text-fuchsia-700" />
            <MetricCard icon={AtSign} label="Mentions" value={formatMetric(totals.mentions)} tone="bg-violet-100 text-violet-700" />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {topPosts.length > 0 ? (
              topPosts.map((post) => (
                <article key={post.id} className="rounded-2xl border border-white/60 bg-white/85 p-3 shadow-sm backdrop-blur-sm">
                  <div className="flex gap-3">
                    {post.thumbnail_url || post.media_url ? (
                      <img
                        src={post.thumbnail_url || post.media_url}
                        alt="Instagram post"
                        className="h-16 w-16 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 via-pink-100 to-violet-100 text-pink-700">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Top content</div>
                      <div className="mt-1 line-clamp-3 text-sm font-medium text-gray-900">{trimText(post.caption)}</div>
                      <div className="mt-2 flex gap-3 text-xs text-gray-600">
                        <span>{formatMetric(toCount(post.like_count))} likes</span>
                        <span>{formatMetric(toCount(post.comments_count))} comments</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 text-sm text-gray-500 lg:col-span-3">
                No Instagram post metrics yet. Once your media endpoint returns posts, this section will rank your top-performing content automatically.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-[#111827] p-4 text-gray-100 shadow-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-[#F58529]" /> Claude analysis brief
          </div>
          <p className="mt-1 text-xs text-gray-400">Copy this into Claude to analyze engagement patterns, audience response, and next actions.</p>
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/5 p-4 text-xs leading-6 text-gray-200">
            {brief}
          </pre>
        </div>
      </div>
    </section>
  );
}