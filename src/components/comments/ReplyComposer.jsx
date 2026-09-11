import { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send, Loader2 } from 'lucide-react';

const IG_COMMENT_LIMIT = 2200;

export function ReplyComposer({ onSend, onCancel, sending = false }) {
  const [text, setText] = useState('');
  const remaining = IG_COMMENT_LIMIT - text.length;
  const overLimit = remaining < 0;

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || overLimit || sending) return;
    onSend(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reply..."
        rows={2}
        className="bg-white text-sm"
        autoFocus
        disabled={sending}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs ${overLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {remaining.toLocaleString()} characters remaining
        </span>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!text.trim() || overLimit || sending}>
            {sending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}
