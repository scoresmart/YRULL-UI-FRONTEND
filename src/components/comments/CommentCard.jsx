import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ReplyComposer } from './ReplyComposer';
import { Reply, EyeOff, Eye, Trash2, ExternalLink, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
import { formatRelativeTime, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { cn } from '../../lib/utils';

function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive, loading, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} size="sm" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CommentCard({ comment, onReply, onHide, onUnhide, onDelete, replyMutation }) {
  const [showReply, setShowReply] = useState(false);
  const [hideDialog, setHideDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const isHidden = comment.hidden || comment.status === 'hidden';
  const isDeleted = comment.status === 'deleted';
  const isReplied = Boolean(comment.reply || comment.replies?.length);
  const username = comment.username || comment.from?.username || 'user';
  const avatarUrl = comment.profile_picture_url || comment.from?.profile_picture_url;
  const avatarCls = pastelClassFromString(username);
  const timestamp = comment.timestamp || comment.created_at;
  const postThumb = comment.media?.thumbnail_url || comment.media?.media_url;
  const postCaption = comment.media?.caption;
  const igPermalink = comment.permalink;

  function handleSendReply(text) {
    onReply?.(comment.id, text);
  }

  if (isDeleted) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 opacity-60">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Trash2 className="h-4 w-4" />
          <span>Comment deleted</span>
          {timestamp && <span className="text-xs">· {formatRelativeTime(timestamp)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        isHidden ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold', avatarCls)}>
            {initialsFromName(username)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={`https://instagram.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-900 hover:underline"
            >
              @{username}
            </a>
            {isHidden && (
              <Badge variant="muted" className="text-[10px]">
                Hidden
              </Badge>
            )}
            {isReplied && <Badge className="text-[10px]">Replied</Badge>}
          </div>
          {timestamp && <p className="text-xs text-gray-400">{formatRelativeTime(timestamp)}</p>}
        </div>

        {/* Post thumbnail */}
        {postThumb && (
          <div className="hidden sm:block">
            <div className="group relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200">
              <img src={postThumb} alt="" className="h-full w-full object-cover" />
              {postCaption && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="px-1 text-[9px] leading-tight text-white line-clamp-2">{postCaption}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comment body */}
      <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{comment.text}</p>

      {/* Reply shown inline if exists */}
      {isReplied && (
        <div className="mt-3 ml-6 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <MessageCircle className="h-3 w-3" /> Your reply
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {typeof comment.reply === 'string' ? comment.reply : comment.replies?.[0]?.text || ''}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-gray-100 pt-3">
        {!isReplied && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowReply(!showReply)}>
            <Reply className="mr-1 h-3.5 w-3.5" /> Reply
          </Button>
        )}

        {isHidden ? (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onUnhide?.(comment.id)}>
            <Eye className="mr-1 h-3.5 w-3.5" /> Unhide
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setHideDialog(true)}>
            <EyeOff className="mr-1 h-3.5 w-3.5" /> Hide
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => setDeleteDialog(true)}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
        </Button>

        {igPermalink && (
          <a href={igPermalink} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> View on Instagram
            </Button>
          </a>
        )}
      </div>

      {/* Inline reply composer */}
      {showReply && (
        <ReplyComposer
          onSend={handleSendReply}
          onCancel={() => setShowReply(false)}
          sending={replyMutation?.isPending}
        />
      )}

      {/* Confirm hide */}
      <ConfirmDialog
        open={hideDialog}
        onOpenChange={setHideDialog}
        title="Hide this comment?"
        description="The commenter won't know their comment was hidden, but it won't be visible to others. You can unhide it later."
        confirmLabel="Hide comment"
        onConfirm={() => {
          onHide?.(comment.id);
          setHideDialog(false);
        }}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete this comment?"
        description="This cannot be undone. The comment will be permanently removed from your post."
        confirmLabel="Delete comment"
        destructive
        onConfirm={() => {
          onDelete?.(comment.id);
          setDeleteDialog(false);
        }}
      />
    </div>
  );
}
