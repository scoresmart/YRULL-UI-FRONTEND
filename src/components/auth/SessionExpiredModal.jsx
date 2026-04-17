import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { isRealSupabaseClient } from '../../lib/authConfig';
import { queryClient } from '../../lib/queryClient';

export function SessionExpiredModal() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!isRealSupabaseClient()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') return;
      if (event === 'SIGNED_OUT' && status === 'authed') {
        setShow(true);
      }
    });

    return () => subscription?.unsubscribe();
  }, [status]);

  function handleLogin() {
    setShow(false);
    useAuthStore.setState({ session: null, profile: null, status: 'guest', workspaces: [], activeWorkspaceId: null });
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Session expired</DialogTitle>
          <DialogDescription className="text-center">
            Your session has expired. Please log in again to continue.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleLogin} className="mt-4 w-full gap-1.5">
          <LogIn className="h-4 w-4" /> Log in again
        </Button>
      </DialogContent>
    </Dialog>
  );
}
