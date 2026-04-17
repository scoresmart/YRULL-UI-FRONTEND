import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuthStore } from '../../store/authStore';
import { isAuthConfigured } from '../../lib/env';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export function LoginForm() {
  const navigate = useNavigate();
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const [show, setShow] = useState(false);
  const authReady = isAuthConfigured();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (values) => {
      if (!authReady) return;
      try {
        const { profile } = await loginWithPassword(values);
        if (profile?.role === 'admin') navigate('/admin', { replace: true });
        else navigate('/dashboard', { replace: true });
      } catch (e) {
        toast.error(e?.message ?? 'Unable to sign in');
      }
    },
    [authReady, loginWithPassword, navigate],
  );

  const toggleIcon = useMemo(() => (show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />), [show]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</div>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="you@company.com"
            className="pl-9"
            autoComplete="email"
            {...register('email')}
          />
        </div>
        {errors.email ? <p className="text-sm text-red-500">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Password</div>
          <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-gray-900">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="••••••••"
            type={show ? 'text' : 'password'}
            className="pl-9 pr-10"
            autoComplete="current-password"
            {...register('password')}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {toggleIcon}
          </button>
        </div>
        {errors.password ? <p className="text-sm text-red-500">{errors.password.message}</p> : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !authReady}>
        {!authReady ? 'Sign-in unavailable' : isSubmitting ? 'Signing in…' : 'Sign In'}
      </Button>
    </form>
  );
}

