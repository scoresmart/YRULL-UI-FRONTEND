import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Plus, Settings, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { Badge } from '../ui/badge';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const workspaces = useAuthStore((s) => s.workspaces);
  const fetchWorkspaces = useAuthStore((s) => s.fetchWorkspaces);
  const setActiveWorkspace = useAuthStore((s) => s.setActiveWorkspace);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = profile?.workspace;
  const currentId = profile?.workspace_id;
  const role = profile?.role || 'user';
  const avatarCls = pastelClassFromString(current?.name || 'W');

  async function handleSwitch(ws) {
    if (ws.id === currentId) {
      setOpen(false);
      return;
    }
    setOpen(false);
    await setActiveWorkspace(ws.id);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
      >
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold', avatarCls)}>
          {initialsFromName(current?.name || 'W')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{current?.name || 'My Workspace'}</div>
          <div className="text-[10px] capitalize text-gray-400">{role}</div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-xl border border-gray-700 bg-[#1A1A1A] py-1 shadow-xl">
          {workspaces.length > 0 && (
            <div className="px-2 pb-1 pt-2">
              <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">Workspaces</p>
            </div>
          )}

          {workspaces.map((ws) => {
            const active = ws.id === currentId;
            const wsCls = pastelClassFromString(ws.name || '');
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => handleSwitch(ws)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  active ? 'bg-white/5 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                )}
              >
                <div className={cn('flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold', wsCls)}>
                  {initialsFromName(ws.name || 'W')}
                </div>
                <span className="flex-1 truncate">{ws.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-green-400" />}
              </button>
            );
          })}

          <div className="my-1 border-t border-gray-700" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4" /> Manage workspaces
          </button>
        </div>
      )}
    </div>
  );
}
