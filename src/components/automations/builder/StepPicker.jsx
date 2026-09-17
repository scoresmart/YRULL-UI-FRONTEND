import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ACTION_GROUPS, ACTIONS, TONES, TRIGGER_GROUPS, TRIGGERS } from './catalog';

/**
 * Choose a step (or a trigger). Grouped like the menus in Zapier/ManyChat, with
 * search so a long list stays quick to use.
 */
export function StepPicker({ open, mode = 'action', title, currentType, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const items = mode === 'trigger' ? TRIGGERS : ACTIONS;
  const groups = mode === 'trigger' ? TRIGGER_GROUPS : ACTION_GROUPS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.description} ${i.group}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setQuery('');
          onClose();
        }
      }}
    >
      <DialogContent className="w-[min(94vw,40rem)] p-0 sm:p-0">
        <DialogHeader className="mb-0 border-b border-gray-100 px-5 pb-4 pt-5">
          <DialogTitle>{title || (mode === 'trigger' ? 'Choose a trigger' : 'Add a step')}</DialogTitle>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'trigger' ? 'Search triggers' : 'Search steps'}
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/25"
            />
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-5 pb-5 pt-3">
          {groups.map((group) => {
            const inGroup = filtered.filter((i) => i.group === group);
            if (!inGroup.length) return null;
            return (
              <div key={group} className="mt-3 first:mt-0">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {inGroup.map((item) => {
                    const Icon = item.icon;
                    const tone = TONES[item.tone || 'trigger'];
                    const current = item.type === currentType;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setQuery('');
                          onPick(item.type);
                        }}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                          current
                            ? 'border-[#25D366] bg-emerald-50/40'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone.chip)}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-900">
                            {item.label}
                            {current ? <span className="ml-1.5 text-xs font-medium text-emerald-700">Current</span> : null}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-gray-500">{item.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!filtered.length ? <p className="py-8 text-center text-sm text-gray-500">Nothing matches “{query}”</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
