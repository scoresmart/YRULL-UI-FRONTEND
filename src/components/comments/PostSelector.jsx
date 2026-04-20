import { useInstagramPosts } from '../../lib/dataHooks';
import { Image, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function PostSelector({ selectedPostId, onSelect }) {
  const { data: posts = [], isLoading } = useInstagramPosts();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = posts.find((p) => p.id === selectedPostId);
  const display = posts.slice(0, 20);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
      >
        {selected ? (
          <>
            {selected.thumbnail_url || selected.media_url ? (
              <img src={selected.thumbnail_url || selected.media_url} alt="" className="h-8 w-8 rounded object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                <Image className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <span className="min-w-0 flex-1 truncate text-gray-700">{selected.caption?.slice(0, 50) || 'Post'}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">{isLoading ? 'Loading posts...' : 'All posts'}</span>
        )}
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
          >
            All posts
          </button>
          {display.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                p.id === selectedPostId ? 'bg-brand-accent/5 font-medium' : ''
              }`}
            >
              {p.thumbnail_url || p.media_url ? (
                <img src={p.thumbnail_url || p.media_url} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                  <Image className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-gray-700">{p.caption?.slice(0, 60) || 'Post'}</span>
            </button>
          ))}
          {display.length === 0 && !isLoading && (
            <div className="px-3 py-4 text-center text-xs text-gray-400">No posts found</div>
          )}
        </div>
      )}
    </div>
  );
}
